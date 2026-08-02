import { CATALOGHI, DOMINI, TUTTI_I_TEMPLATES } from "@gdpr/engine";
import { env } from "@/lib/env";

// Controllo di salute dell'istanza. Lo interrogano lo smoke-test di installazione e
// l'aggiornamento della flotta (Fase 16): se non risponde `ok`, il rilascio si ferma
// e le istanze successive restano alla versione precedente.
//
// Non espone nulla di sensibile: nessun segreto, nessun dato di cliente.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({
    stato: "ok",
    ambiente: env.NODE_ENV,
    driver: { storage: env.STORAGE_DRIVER, pdf: env.PDF_DRIVER },
    catalogo: {
      adempimenti: TUTTI_I_TEMPLATES.length,
      perDominio: Object.fromEntries(DOMINI.map((d) => [d, CATALOGHI[d].length])),
    },
    istante: new Date().toISOString(),
  });
}
