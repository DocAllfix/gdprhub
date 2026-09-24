import { cache } from "react";
import { headers } from "next/headers";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { env } from "@/lib/env";
import { db } from "@/lib/db";
import { instanceConfig, member, organization } from "@/lib/db/schema";

// Guard di accesso. Da qui passa OGNI query e OGNI azione di dominio.
//
// Principio non negoziabile: **lo studio si risolve dalla sessione, mai da input del
// client**. Un identificativo di organizzazione che arriva dall'URL, da un campo nascosto o
// da un corpo JSON non è una prova di appartenenza: è un desiderio dell'utente.
//
// Secondo principio: **la sessione non è autorevole sulla membership**. Il cookie può essere
// più vecchio della revoca di un accesso, quindi l'appartenenza si riverifica sul database a
// ogni richiesta. Costa una query indicizzata; vale un'intera classe di vulnerabilità.

export class NonAutenticato extends Error {
  constructor() {
    super("Sessione assente o scaduta.");
    this.name = "NonAutenticato";
  }
}

export class NonAutorizzato extends Error {
  constructor(motivo: string) {
    super(motivo);
    this.name = "NonAutorizzato";
  }
}

export type Ruolo = "admin" | "consulente" | "viewer";

export type ContestoStudio = {
  readonly userId: string;
  readonly email: string;
  readonly nome: string;
  readonly organizationId: string;
  readonly studioNome: string;
  readonly ruolo: Ruolo;
  readonly mustChangePassword: boolean;
  readonly profilo: "consulente" | "azienda";
  readonly mode: "full" | "demo";
};

/**
 * La sessione corrente, o `null`.
 * `cache` la memorizza per la durata della richiesta: più guard nello stesso render non
 * moltiplicano le query.
 */
export const sessioneCorrente = cache(async () => {
  return auth.api.getSession({ headers: await headers() });
});

export async function requireSessione() {
  const sessione = await sessioneCorrente();
  if (!sessione?.user) throw new NonAutenticato();
  return sessione;
}

/**
 * Il contesto operativo: chi sei, per quale studio, con quale ruolo.
 *
 * In questo modello di distribuzione l'istanza contiene UNA sola organizzazione, quindi
 * non si legge `activeOrganizationId` dalla sessione: si risolve l'unica organizzazione
 * esistente e si verifica che l'utente ne sia membro. Meno superficie, meno modi di
 * sbagliare.
 */
export const requireStudio = cache(async (): Promise<ContestoStudio> => {
  const sessione = await requireSessione();

  // UNA SOLA QUERY per studio, appartenenza e configurazione. Erano tre in fila, e ogni
  // viaggio verso il database costa: su una pagina che ne fa già una decina, tre di meno si
  // vedono. La riverifica dell'appartenenza resta — è il punto centrale di questo guard —
  // ma si fa con una giunzione invece che con un secondo giro.
  const [riga] = await db
    .select({
      studioId: organization.id,
      studioNome: organization.name,
      ruolo: member.role,
      brandNome: instanceConfig.brandNome,
      profilo: instanceConfig.profilo,
      mode: instanceConfig.mode,
    })
    .from(organization)
    .leftJoin(member, and(eq(member.organizationId, organization.id), eq(member.userId, sessione.user.id)))
    .leftJoin(instanceConfig, eq(instanceConfig.organizationId, organization.id))
    .limit(1);

  if (!riga) {
    throw new NonAutorizzato(
      "L'istanza non è ancora inizializzata: nessuno studio configurato. Vedi lo script di onboarding.",
    );
  }
  // `leftJoin` restituisce la riga anche senza appartenenza: il controllo resta esplicito.
  if (!riga.ruolo) throw new NonAutorizzato("L'utente non appartiene allo studio di questa istanza.");

  return {
    userId: sessione.user.id,
    email: sessione.user.email,
    nome: sessione.user.name,
    organizationId: riga.studioId,
    studioNome: riga.brandNome ?? riga.studioNome,
    ruolo: riga.ruolo,
    // L'obbligo vale solo dove l'istanza lo chiede: sulla vetrina le utenze si creano a
    // mano per far provare il sistema, e chi consegna la password la conosce già.
    mustChangePassword:
      env.RICHIEDI_CAMBIO_PASSWORD &&
      Boolean((sessione.user as { mustChangePassword?: boolean }).mustChangePassword),
    profilo: riga.profilo ?? "consulente",
    mode: riga.mode ?? "full",
  };
});

const GERARCHIA: Readonly<Record<Ruolo, number>> = { viewer: 0, consulente: 1, admin: 2 };

/**
 * Richiede almeno un dato livello di ruolo.
 *
 * È un controllo SERVER-SIDE: un pulsante grigio nell'interfaccia si aggira con due righe in
 * console, questo no.
 */
export async function requireRuolo(minimo: Ruolo): Promise<ContestoStudio> {
  const ctx = await requireStudio();
  if (GERARCHIA[ctx.ruolo] < GERARCHIA[minimo]) {
    throw new NonAutorizzato(
      `Serve il ruolo «${minimo}» o superiore per questa operazione; il tuo è «${ctx.ruolo}».`,
    );
  }
  return ctx;
}

/** Chi può modificare i dati. Un `viewer` non passa di qui. */
export const requireConsulente = () => requireRuolo("consulente");

/** Chi può configurare l'istanza, invitare e gestire gli utenti. */
export const requireAdmin = () => requireRuolo("admin");

/**
 * Predisposizione per i blocchi della vetrina, oggi inattiva.
 *
 * Con `mode = "full"` — cioè su ogni istanza venduta — è un no-op: le istanze dei clienti
 * non pagano nulla per una funzione che non usano. Il giorno che il committente confermerà
 * i blocchi, si attiva cambiando la configurazione dell'istanza vetrina, non il codice.
 *
 * Va invocata nelle server action, MAI solo nell'interfaccia.
 */
export async function assertNotDemo(capability: string): Promise<void> {
  const blocco = await bloccoDemo(capability);
  if (blocco) throw new NonAutorizzato(blocco.errore);
}

/**
 * Come `assertNotDemo`, ma RESTITUISCE l'esito invece di lanciare _(2026-09-24)_.
 *
 * Le server action sono chiamate con `useActionState`: un'eccezione risale al confine d'errore,
 * e il visitatore della demo che toccava un interruttore di modulo si ritrovava sulla pagina
 * «qualcosa non ha funzionato» — in produzione Next ne nasconde perfino il messaggio. Un blocco
 * deve spiegarsi nella stessa ricevuta di ogni altro errore. `assertNotDemo` resta per le rotte.
 */
export async function bloccoDemo(capability: string): Promise<{ readonly ok: false; readonly errore: string } | null> {
  const ctx = await requireStudio();
  if (ctx.mode === "full") return null;
  return {
    ok: false,
    errore: `Nella demo l'operazione «${capability}» non è disponibile: in un'installazione vera sì.`,
  };
}

/** Vero se nell'istanza esiste già uno studio configurato. */
export async function istanzaInizializzata(): Promise<boolean> {
  const studio = await db.query.organization.findFirst({ columns: { id: true } });
  return Boolean(studio);
}

/**
 * Verifica strutturale: l'istanza deve contenere ESATTAMENTE una organizzazione.
 *
 * È il presupposto su cui si regge la scelta di non usare RLS. Se un giorno ne comparissero
 * due — per un errore di seed, per un ripristino sbagliato — lo scoping applicativo non
 * basterebbe più, e va scoperto subito e non da un cliente che vede i dati di un altro.
 */
export async function verificaStudioUnico(): Promise<void> {
  const studi = await db.select({ id: organization.id }).from(organization);
  if (studi.length > 1) {
    throw new Error(
      `Questa istanza contiene ${studi.length} organizzazioni, ma il modello ne prevede una sola. ` +
        "Lo scoping applicativo non è sufficiente in questa configurazione: fermarsi e indagare.",
    );
  }
}
