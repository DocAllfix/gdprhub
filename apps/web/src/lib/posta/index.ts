import { and, eq, lt, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { outbox } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { spogliaTesto } from "@/lib/telemetria";

// LA POSTA, dietro un'interfaccia sola — come archivio, PDF e database.
//
// Fino a questa fase il sistema NON AVEVA ALCUN MODO DI MANDARE UNA MAIL: niente
// `nodemailer`, niente configurazione SMTP, niente. La conseguenza non era cosmetica: nessun
// recupero password self-service, nessun invito, nessun promemoria di scadenza. Un'utenza in
// più significava una nostra connessione alla VPS del cliente.
//
// DUE COSE, TENUTE SEPARATE:
//
//   `accoda()`   scrive la mail in tabella, dentro la transazione del chiamante. È ciò che
//                usa il codice di dominio, e non fallisce mai per colpa della rete.
//   `drena()`    prende le righe in attesa e le consegna. Gira per conto suo.
//
// Il motivo della separazione sta nel commento della tabella `outbox`, e si riassume così:
// con la registrazione pubblica chiusa, un invio fallito durante un recupero password chiude
// fuori un utente per sempre.
//
// DUE DRIVER, scelti dall'ambiente:
//
//   registro  la mail si stampa e non parte. È il predefinito in sviluppo: un ambiente di
//             sviluppo che manda posta vera è un ambiente che prima o poi la manda a un
//             cliente vero.
//   smtp      relay dichiarato in `SMTP_HOST`. Le credenziali sono PER ISTANZA, non
//             condivise: una VPS compromessa non deve poter mandare posta a nome del
//             dominio di tutti gli altri clienti.

export type Messaggio = {
  readonly a: string;
  readonly oggetto: string;
  readonly testo: string;
  readonly html?: string | undefined;
  readonly organizationId?: string | null | undefined;
};

/** Numero di tentativi oltre il quale una riga smette di essere ritentata e va guardata. */
export const TENTATIVI_MASSIMI = 5;

/**
 * Accoda un messaggio. Non invia, non attende la rete, non fallisce per colpa del relay.
 *
 * Va chiamata dentro la stessa transazione dell'operazione di dominio: se quella fallisce,
 * la mail non parte; se riesce, la mail è già garantita.
 */
export async function accoda(m: Messaggio): Promise<void> {
  await db.insert(outbox).values({
    organizationId: m.organizationId ?? null,
    destinatario: m.a,
    oggetto: m.oggetto,
    corpoTesto: m.testo,
    corpoHtml: m.html ?? null,
  });
}

/** Vero quando l'istanza ha un relay configurato. Senza, si usa il driver `registro`. */
export function postaConfigurata(): boolean {
  return Boolean(env.SMTP_HOST);
}

async function consegna(m: {
  destinatario: string;
  oggetto: string;
  corpoTesto: string;
  corpoHtml: string | null;
}): Promise<void> {
  if (!postaConfigurata()) {
    // In sviluppo si vede tutto tranne il corpo: il corpo di un invito contiene un gettone
    // valido, e i log si incollano nelle segnalazioni.
    console.info(
      JSON.stringify({
        livello: "posta",
        driver: "registro",
        a: m.destinatario,
        oggetto: m.oggetto,
      }),
    );
    return;
  }

  // L'importazione è dinamica perché il driver `registro` non deve trascinarsi dietro la
  // libreria: sulla vetrina e in sviluppo `nodemailer` non viene nemmeno caricato.
  const { createTransport } = await import("nodemailer");
  const trasporto = createTransport({
    host: env.SMTP_HOST!,
    port: env.SMTP_PORT,
    // 465 è TLS implicito; 587 parte in chiaro e sale con STARTTLS. Dedurlo dalla porta
    // evita una variabile in più che qualcuno imposterebbe male.
    secure: env.SMTP_PORT === 465,
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD ?? "" } : undefined,
  });

  await trasporto.sendMail({
    from: env.SMTP_MITTENTE,
    to: m.destinatario,
    subject: m.oggetto,
    text: m.corpoTesto,
    ...(m.corpoHtml ? { html: m.corpoHtml } : {}),
  });
}

/**
 * Consegna le mail in attesa. Restituisce quante ne ha inviate e quante hanno fallito.
 *
 * Si occupa di un lotto alla volta: un drenatore che prova a svuotare una coda di mille
 * righe in una volta tiene occupata la connessione e, se il relay è giù, fallisce mille
 * volte di fila.
 */
export async function drena(lotto = 25): Promise<{ inviate: number; fallite: number }> {
  const righe = await db
    .select()
    .from(outbox)
    .where(and(eq(outbox.stato, "attesa"), lt(outbox.tentativi, TENTATIVI_MASSIMI)))
    .orderBy(outbox.creataIl)
    .limit(lotto);

  let inviate = 0;
  let fallite = 0;

  for (const riga of righe) {
    try {
      await consegna(riga);
      await db
        .update(outbox)
        .set({ stato: "inviata", inviataIl: new Date(), tentativi: riga.tentativi + 1 })
        .where(eq(outbox.id, riga.id));
      inviate += 1;
    } catch (errore) {
      const tentativi = riga.tentativi + 1;
      // L'ERRORE SI SPOGLIA PRIMA DI SCRIVERLO. Un rifiuto del relay cita spesso
      // l'indirizzo del destinatario, e questa colonna la leggeranno i nostri strumenti di
      // diagnosi: sarebbe un dato personale copiato dove nessuno lo cerca.
      await db
        .update(outbox)
        .set({
          tentativi,
          // Oltre il tetto non si ritenta: la riga resta e la sentinella la vede.
          stato: tentativi >= TENTATIVI_MASSIMI ? "fallita" : "attesa",
          ultimoErrore: spogliaTesto(errore instanceof Error ? errore.message : String(errore)),
        })
        .where(eq(outbox.id, riga.id));
      fallite += 1;
    }
  }

  return { inviate, fallite };
}

/**
 * Quante mail sono in sofferenza: è il numero che la sentinella sorveglia.
 *
 * Relay giù significa che nessuno può recuperare la propria password, e con la registrazione
 * pubblica chiusa non c'è un'altra strada. Va saputo entro mezz'ora, non il giorno dopo.
 */
export async function postaInSofferenza(): Promise<number> {
  const [riga] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(outbox)
    .where(
      sql`${outbox.stato} = 'fallita' or (${outbox.stato} = 'attesa' and ${outbox.creataIl} < now() - interval '30 minutes')`,
    );
  return riga?.n ?? 0;
}
