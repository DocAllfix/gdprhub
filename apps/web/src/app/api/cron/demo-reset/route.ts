import { assicuraUtenteDemo, istanzaDemo, ripristinaDemo } from "@/lib/db/demo";
import { env } from "@/lib/env";

// IL RIPRISTINO NOTTURNO DELLA DEMO PUBBLICA _(docs/07 §5.3)_.
//
// I visitatori condividono un solo insieme di dati e cambiano gli stati degli adempimenti:
// è ciò per cui entrano. Ogni notte l'azienda d'esempio torna com'era, e l'utente dimostrativo
// viene riparato — password e secondo fattore riportati allo stato dell'ambiente.
//
// Lo chiama Vercel Cron con `Authorization: Bearer <CRON_SECRET>`. Senza il segreto, o su
// un'istanza che non è in modalità demo, non fa niente: un'istanza venduta non deve avere un
// indirizzo che cancella un'azienda, nemmeno protetto.

export async function GET(richiesta: Request) {
  if (!env.CRON_SECRET || richiesta.headers.get("authorization") !== `Bearer ${env.CRON_SECRET}`) {
    return new Response("Non autorizzato", { status: 401 });
  }
  if (!(await istanzaDemo())) return new Response("Non trovato", { status: 404 });

  const { eliminate, esito } = await ripristinaDemo();
  const utente = await assicuraUtenteDemo();
  const stato = esito.stato === "creata" ? 200 : 500;
  return Response.json({ eliminate, esito, utente }, { status: stato });
}
