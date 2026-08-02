import { rendiPdf } from "@/lib/pdf";
import { env } from "@/lib/env";
import { CONTROL_TEMPLATES, DEMO_ASSESSMENT } from "@gdpr/engine";

// SPIKE DELLA FASE 0 — da rimuovere alla Fase 10, quando esisterà il generatore vero.
//
// Serve a provare UNA cosa sola, prima che qualunque altra parte del prodotto ci si
// appoggi: che su Vercel si possa davvero produrre un PDF A4 con font incorporati,
// tabelle multipagina e sfondi. Nel progetto gemello EvalisDeck questo percorso era
// implementato ma la verifica sul deploy serverless è rimasta in sospeso.
//
// Le tre vie d'uscita se fallisce, in ordine di preferenza:
//   1. worker PDF separato su Fly/Railway, chiamato via HTTP dall'app
//   2. vetrina su VPS invece che su Vercel (allineata alla produzione)
//   3. PDF solo nelle istanze dedicate, vetrina con anteprima a schermo

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET() {
  const inizio = Date.now();

  try {
    const pdf = await rendiPdf(documentoDiProva());
    const durata = Date.now() - inizio;

    return new Response(pdf as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'inline; filename="spike-fase0.pdf"',
        "Cache-Control": "no-store",
        // Misure lette dal cancello di fase senza dover aprire i log.
        "X-Pdf-Driver": env.PDF_DRIVER,
        "X-Pdf-Ms": String(durata),
        "X-Pdf-Bytes": String(pdf.byteLength),
      },
    });
  } catch (errore) {
    // Lo spike deve dire PERCHÉ ha fallito, non limitarsi a un 500 muto.
    const messaggio = errore instanceof Error ? `${errore.name}: ${errore.message}` : String(errore);
    return Response.json(
      { ok: false, driver: env.PDF_DRIVER, ms: Date.now() - inizio, errore: messaggio },
      { status: 500 },
    );
  }
}

/**
 * Documento di prova che esercita davvero i punti critici, non una pagina vuota:
 * font incorporato, `@page` A4 con numerazione, tabella che sfora su più pagine,
 * sfondi colorati, caratteri accentati e simbolo di valuta.
 */
function documentoDiProva(): string {
  const righe = CONTROL_TEMPLATES.map((t) => {
    const demo = DEMO_ASSESSMENT.controlli.find((c) => c.codice === t.codice);
    return `<tr>
      <td class="mono">${esc(t.codice)}</td>
      <td>${esc(t.titolo)}</td>
      <td>${esc(t.articolo)}</td>
      <td>${esc(t.ruolo)}</td>
      <td><span class="pill ${classePriorita(t.prioritaDefault)}">${esc(t.prioritaDefault)}</span></td>
      <td class="num">${t.rischioDefault}/10</td>
      <td>${esc(demo?.stato ?? "-")}</td>
    </tr>`;
  }).join("");

  return `<!doctype html>
<html lang="it"><head><meta charset="utf-8"><title>Spike PDF - Fase 0</title>
<style>
  @page { size: A4; margin: 18mm 16mm 20mm; }
  @page { @bottom-center { content: counter(page); } }
  * { box-sizing: border-box; }
  body { font-family: ui-serif, Georgia, "Times New Roman", serif; color: #16202b; font-size: 10.5pt; line-height: 1.5; margin: 0; }
  .copertina { height: 245mm; display: flex; flex-direction: column; justify-content: space-between; page-break-after: always; }
  .marchio { font-family: ui-sans-serif, system-ui, sans-serif; font-size: 8.5pt; letter-spacing: .18em; text-transform: uppercase; color: #5b6b7c; }
  h1 { font-size: 30pt; line-height: 1.12; margin: 0 0 10mm; font-weight: 600; letter-spacing: -.015em; }
  .filo { height: 3px; background: #1b3a5c; width: 54mm; margin-bottom: 9mm; }
  .meta { font-family: ui-sans-serif, system-ui, sans-serif; font-size: 9pt; color: #47586a; }
  .meta b { color: #16202b; font-weight: 600; }
  h2 { font-family: ui-sans-serif, system-ui, sans-serif; font-size: 13pt; margin: 0 0 5mm; font-weight: 600; }
  table { width: 100%; border-collapse: collapse; font-family: ui-sans-serif, system-ui, sans-serif; font-size: 8pt;
          font-variant-numeric: tabular-nums; }
  thead { display: table-header-group; background: #eef2f6; }
  th { text-align: left; padding: 2.2mm 2mm; font-size: 7pt; letter-spacing: .07em; text-transform: uppercase;
       color: #47586a; border-bottom: 1.5px solid #c6d2de; }
  td { padding: 2mm; border-bottom: .5px solid #e3e9ef; vertical-align: top; }
  tr { page-break-inside: avoid; }
  .mono { font-family: ui-monospace, "Cascadia Mono", Consolas, monospace; }
  .num { text-align: right; }
  .pill { display: inline-block; padding: .5mm 2mm; border-radius: 8px; font-size: 7pt; font-weight: 600; }
  .critica { background: #fbe4e4; color: #8c1c1c; }
  .alta    { background: #fdf0dc; color: #8a5108; }
  .media   { background: #e7eef6; color: #29506f; }
  .kpi { display: flex; gap: 5mm; margin: 0 0 8mm; }
  .kpi div { flex: 1; border: .5px solid #c6d2de; border-top: 2.5px solid #1b3a5c; padding: 3.5mm; }
  .kpi .v { font-family: ui-sans-serif, system-ui, sans-serif; font-size: 19pt; font-weight: 600;
            font-variant-numeric: tabular-nums; letter-spacing: -.02em; }
  .kpi .e { font-family: ui-sans-serif, system-ui, sans-serif; font-size: 7pt; text-transform: uppercase;
            letter-spacing: .09em; color: #5b6b7c; }
</style></head>
<body>
  <section class="copertina">
    <div class="marchio">Verifica tecnica &middot; Fase 0</div>
    <div>
      <div class="filo"></div>
      <h1>Relazione di conformità<br/>al Regolamento UE 2016/679</h1>
      <div class="meta">
        <b>${esc(DEMO_ASSESSMENT.cliente)}</b><br/>
        Documento di prova generato il ${new Date().toLocaleDateString("it-IT", { day: "2-digit", month: "long", year: "numeric" })}<br/>
        Driver di resa: <b>${esc(env.PDF_DRIVER)}</b> &middot; Controlli nel catalogo: <b>${CONTROL_TEMPLATES.length}</b>
      </div>
    </div>
    <div class="meta">Accentate: à è é ì ò ù &middot; Valuta: € 636.515 &middot; Simboli: § ¶ † ‰</div>
  </section>

  <h2>Estratto del registro dei controlli</h2>
  <div class="kpi">
    <div><div class="e">Controlli</div><div class="v">${CONTROL_TEMPLATES.length}</div></div>
    <div><div class="e">Titolare</div><div class="v">${CONTROL_TEMPLATES.filter((t) => t.ruolo === "Titolare").length}</div></div>
    <div><div class="e">Responsabile</div><div class="v">${CONTROL_TEMPLATES.filter((t) => t.ruolo === "Responsabile").length}</div></div>
    <div><div class="e">DPO</div><div class="v">${CONTROL_TEMPLATES.filter((t) => t.ruolo === "DPO").length}</div></div>
  </div>
  <table>
    <thead><tr><th>Cod.</th><th>Adempimento</th><th>Articolo</th><th>Ruolo</th><th>Priorità</th><th>Rischio</th><th>Stato</th></tr></thead>
    <tbody>${righe}</tbody>
  </table>
</body></html>`;
}

/** Nessun valore finisce grezzo nel documento: è il difetto B3 dell'analisi del prototipo. */
function esc(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}

function classePriorita(p: string): string {
  return p === "Critica" ? "critica" : p === "Alta" ? "alta" : "media";
}
