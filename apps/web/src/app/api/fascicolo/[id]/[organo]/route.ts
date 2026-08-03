import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { instanceConfig } from "@/lib/db/schema";
import { NonAutenticato, NonAutorizzato, requireStudio } from "@/features/auth/guards";
import { costruisciSnapshot } from "@/features/relazioni/snapshot";
import { ORGANI, htmlFascicolo, isOrgano } from "@/lib/documenti/fascicolo";
import { rendiPdf } from "@/lib/pdf";

// Il fascicolo ispettivo, generato al volo.
//
// A DIFFERENZA DELLA RELAZIONE NON SI CONGELA, e la differenza è sostanziale. La relazione è
// un atto: si pubblica, si numera, e da quel momento dice quello che diceva. Il fascicolo è
// una fotografia che si stampa nel momento in cui arriva l'ispezione, e deve dire com'è
// ADESSO — un fascicolo di tre mesi fa mostrerebbe a un ispettore uno stato che non
// corrisponde a quello che sta guardando, che è il modo migliore per trasformare una
// verifica in un problema.
//
// Per questo non ha un numero di protocollo e non finisce in una tabella: è una vista, e lo
// dichiara essendo generata a ogni richiesta.

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(
  _richiesta: Request,
  contesto: { params: Promise<{ id: string; organo: string }> },
) {
  const { id, organo } = await contesto.params;
  if (!isOrgano(organo)) return new Response("Organo non riconosciuto", { status: 404 });

  let ctx;
  try {
    ctx = await requireStudio();
  } catch (errore) {
    if (errore instanceof NonAutenticato) return new Response("Non autenticato", { status: 401 });
    if (errore instanceof NonAutorizzato) return new Response("Non autorizzato", { status: 403 });
    throw errore;
  }

  const snapshot = await costruisciSnapshot(ctx.organizationId, id, ORGANI[organo].ambito);
  if (!snapshot) return new Response("Non trovata", { status: 404 });

  const cfg = await db.query.instanceConfig.findFirst({
    where: eq(instanceConfig.organizationId, ctx.organizationId),
    columns: { brandNome: true },
  });

  const html = htmlFascicolo(snapshot, organo, { studio: cfg?.brandNome ?? "Studio" });
  const pdf = await rendiPdf(html);

  const nome = `fascicolo-${organo}-${snapshot.azienda.nome
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .toLowerCase()
    .replace(/^-|-$/g, "")}.pdf`;

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(pdf.length),
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(nome)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
