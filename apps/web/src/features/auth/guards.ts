import { cache } from "react";
import { headers } from "next/headers";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
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

  const studio = await db.query.organization.findFirst();
  if (!studio) {
    throw new NonAutorizzato(
      "L'istanza non è ancora inizializzata: nessuno studio configurato. Vedi lo script di onboarding.",
    );
  }

  // La riverifica sul database è il punto centrale di questo guard.
  const appartenenza = await db.query.member.findFirst({
    where: and(eq(member.organizationId, studio.id), eq(member.userId, sessione.user.id)),
  });
  if (!appartenenza) throw new NonAutorizzato("L'utente non appartiene allo studio di questa istanza.");

  const config = await db.query.instanceConfig.findFirst({
    where: eq(instanceConfig.organizationId, studio.id),
  });

  return {
    userId: sessione.user.id,
    email: sessione.user.email,
    nome: sessione.user.name,
    organizationId: studio.id,
    studioNome: config?.brandNome ?? studio.name,
    ruolo: appartenenza.role,
    mustChangePassword: Boolean((sessione.user as { mustChangePassword?: boolean }).mustChangePassword),
    profilo: config?.profilo ?? "consulente",
    mode: config?.mode ?? "full",
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
  const ctx = await requireStudio();
  if (ctx.mode === "full") return;
  throw new NonAutorizzato(
    `In modalità dimostrativa l'operazione «${capability}» non è disponibile. ` +
      "Contattaci per attivare un'istanza completa.",
  );
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
