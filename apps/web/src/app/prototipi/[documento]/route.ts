import { rendiPdf } from "@/lib/pdf";
import { htmlPrototipo, isPrototipo, PROTOTIPI } from "@/lib/documenti/prototipi";

// I quattro prototipi di documento, resi al volo.
//
// Sono una rotta e non uno script perché il documento deve essere verificato NELL'AMBIENTE
// IN CUI GIRERÀ. Lo spike della Fase 0 ha fallito esattamente lì: il PDF funzionava in
// locale e su Vercel no, perché il Chromium serverless non trovava i propri binari. Un
// prototipo approvato solo sul portatile non prova nulla.
//
// `?html=1` restituisce il sorgente invece del PDF: serve a ispezionare l'impaginazione
// nel browser e al cancello che verifica che nessuna pagina trabocchi.
//
// Vita attesa: la Fase 12 sostituisce questa rotta con il generatore vero, che legge dal
// database e produce uno snapshot immutabile. Qui i dati sono quelli dimostrativi.

export const runtime = "nodejs";
// La rotta legge la stringa di ricerca, quindi è dinamica per costruzione. Il documento
// resta comunque deterministico: la data di riferimento è fissa, non è l'orologio.
export const dynamic = "force-dynamic";

export async function GET(
  richiesta: Request,
  { params }: { params: Promise<{ documento: string }> },
): Promise<Response> {
  const { documento } = await params;
  if (!isPrototipo(documento)) {
    return new Response(`Prototipo sconosciuto. Disponibili: ${PROTOTIPI.join(", ")}.`, { status: 404 });
  }

  const html = htmlPrototipo(documento);

  if (new URL(richiesta.url).searchParams.get("html") === "1") {
    return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } });
  }

  const pdf = await rendiPdf(html);
  return new Response(new Uint8Array(pdf), {
    headers: {
      "content-type": "application/pdf",
      // `inline`: si apre nel visore del browser. Un prototipo che si scarica e basta
      // costringe il committente a cercarlo nella cartella dei download per guardarlo.
      "content-disposition": `inline; filename="prototipo-${documento}.pdf"`,
      "cache-control": "public, max-age=0, must-revalidate",
    },
  });
}
