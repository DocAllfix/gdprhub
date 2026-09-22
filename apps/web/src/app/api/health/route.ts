import { sql } from "drizzle-orm";
import { CATALOGHI, DOMINI, TUTTI_I_TEMPLATES } from "@gdpr/engine";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { verificaStudioUnico } from "@/features/auth/guards";

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

  // L'ISTANZA DEVE CONTENERE UNA SOLA ORGANIZZAZIONE, e qui si verifica che sia vero.
  //
  // E' il presupposto su cui si regge la scelta di non usare RLS: `requireStudio()` risolve
  // «l'unica organizzazione esistente» invece di leggerne l'identificativo dalla sessione.
  // Se ne comparisse una seconda — un ripristino sbagliato, un seed lanciato due volte —
  // quella query fa `limit(1)` SENZA `order by`: restituirebbe un'organizzazione non
  // deterministica, e un utente vedrebbe i dati dell'altra.
  //
  // `verificaStudioUnico()` esisteva gia' in `guards.ts` ed era dichiarata come la rete di
  // sicurezza di questa scelta. Non la chiamava NESSUNO: compariva solo nella propria
  // definizione e in un test. Una difesa mai invocata e' una difesa che non c'e'.
  //
  // Si verifica QUI e non a ogni richiesta perche' questa rotta la interrogano gia' il
  // `healthcheck` di Docker ogni trenta secondi, il collaudo d'installazione e
  // l'aggiornamento di flotta: un'istanza in questo stato diventa «degradata», Docker smette
  // di considerarla sana e il rilascio sulle istanze successive si ferma. E' esattamente il
  // «fermarsi e indagare» che il commento di quella funzione chiede.
  let studi = "ok";
  if (banca === "ok") {
    try {
      await verificaStudioUnico();
    } catch {
      studi = "piu-di-uno";
    }
  }

  const sano = banca === "ok" && studi === "ok";
  return Response.json(
    {
      stato: sano ? "ok" : "degradato",
      database: banca,
      studi,
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
