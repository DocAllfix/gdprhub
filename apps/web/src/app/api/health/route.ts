import { sql } from "drizzle-orm";
import { CATALOGHI, DOMINI, TUTTI_I_TEMPLATES } from "@gdpr/engine";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

// Controllo di salute dell'istanza. Lo interrogano il collaudo di installazione, il
// `healthcheck` di Docker e l'aggiornamento della flotta: se non risponde `ok`, il rilascio
// si ferma e le istanze successive restano alla versione precedente.
//
// TOCCA IL DATABASE, e prima non lo faceva.
//
// Una verifica di salute che risponde solo «il processo è vivo» dice la cosa che si sapeva
// già: se il processo fosse morto, la richiesta non arriverebbe. La domanda vera è se
// l'istanza può SERVIRE, e senza database non può — restituirebbe un errore su ogni pagina
// dopo l'accesso. Con il vecchio controllo Docker non avrebbe riavviato niente e un
// aggiornamento di flotta sarebbe proseguito sulle istanze successive credendo che la
// prima stesse bene.
//
// La query è la più economica che esista e non legge dati di nessuno. Non espone segreti:
// il messaggio dell'errore NON viene restituito — direbbe host, porta e a volte utenza del
// database a chiunque interroghi la rotta.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  let banca = "ok";
  try {
    await db.execute(sql`select 1`);
  } catch {
    banca = "irraggiungibile";
  }

  const sano = banca === "ok";
  return Response.json(
    {
      stato: sano ? "ok" : "degradato",
      database: banca,
      ambiente: env.NODE_ENV,
      driver: { storage: env.STORAGE_DRIVER, pdf: env.PDF_DRIVER },
      catalogo: {
        adempimenti: TUTTI_I_TEMPLATES.length,
        perDominio: Object.fromEntries(DOMINI.map((d) => [d, CATALOGHI[d].length])),
      },
      istante: new Date().toISOString(),
    },
    // 503 e non 500: il servizio esiste e potrebbe tornare, è indisponibile adesso. È la
    // differenza che un bilanciatore e un `healthcheck` leggono per decidere se aspettare.
    { status: sano ? 200 : 503 },
  );
}
