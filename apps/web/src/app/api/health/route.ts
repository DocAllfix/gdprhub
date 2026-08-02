import { CONTROL_TEMPLATES } from "@gdpr/engine";
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
    catalogo: { controlli: CONTROL_TEMPLATES.length },
    istante: new Date().toISOString(),
  });
}
