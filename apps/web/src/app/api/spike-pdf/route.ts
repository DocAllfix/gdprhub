import { rendiPdf } from "@/lib/pdf";
import { env } from "@/lib/env";
import {
  CATALOGHI,
  CLIENTI_DIMOSTRATIVI,
  DOMINI,
  ETICHETTE_DOMINIO,
  TUTTI_I_TEMPLATES,
  COLLEGAMENTI,
  costruisciDemo,
  coperturaReati,
  descriviPeriodicita,
  oggiA,
  risolviTutti,
  templatePerCodice,
} from "@gdpr/engine";

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
  const oggi = oggiA();
  const dataIt = new Date().toLocaleDateString("it-IT", { day: "2-digit", month: "long", year: "numeric" });

  const sezioni = DOMINI.map((d) => {
    const risolti = risolviTutti(costruisciDemo(CATALOGHI[d], CLIENTI_DIMOSTRATIVI[d], oggi), oggi);
    const righe = risolti
      .map((a) => {
        const t = CATALOGHI[d].find((x) => x.codice === a.codice)!;
        return `<tr>
      <td class="mono">${esc(a.codice)}</td>
      <td>${esc(t.titolo)}</td>
      <td>${esc(t.riferimento)}</td>
      <td>${esc(a.ruolo)}</td>
      <td>${esc(descriviPeriodicita(a.periodicita))}</td>
      <td><span class="pill ${classePriorita(a.priorita)}">${esc(a.priorita)}</span></td>
      <td>${esc(a.stato)}</td>
      <td><span class="pill ${classeScadenza(a.statoScadenza)}">${esc(a.statoScadenza)}</span></td>
      <td class="mono">${a.scadenza ? esc(a.scadenza) : "&mdash;"}</td>
    </tr>`;
      })
      .join("");

    return `<h2>${esc(ETICHETTE_DOMINIO[d].breve)} &middot; ${esc(ETICHETTE_DOMINIO[d].esteso)}</h2>
  <p class="sotto">${esc(ETICHETTE_DOMINIO[d].norma)} &middot; ${CATALOGHI[d].length} adempimenti</p>
  <table>
    <thead><tr><th>Cod.</th><th>Adempimento</th><th>Riferimento</th><th>Responsabile</th>
      <th>Periodicit&agrave;</th><th>Priorit&agrave;</th><th>Lavoro</th><th>Scadenza</th><th>Data</th></tr></thead>
    <tbody>${righe}</tbody>
  </table>`;
  }).join("");

  // --- Sezione cross-dominio: è ciò che rende la suite più della somma dei tre moduli ---
  const tuttiRisolti = DOMINI.flatMap((d) =>
    risolviTutti(costruisciDemo(CATALOGHI[d], CLIENTI_DIMOSTRATIVI[d], oggi), oggi),
  );

  const righeReati = coperturaReati(tuttiRisolti, [...DOMINI])
    .map((c) => {
      const domini = [...new Set(c.famiglia.presidi.map((p) => ETICHETTE_DOMINIO[p.dominio].breve))].join(
        " + ",
      );
      return `<tr>
      <td class="mono">${esc(c.famiglia.articolo)}</td>
      <td>${esc(c.famiglia.titolo)}</td>
      <td>${esc(domini)}</td>
      <td class="num">${c.presidiInOrdine}/${c.presidiTotali}</td>
      <td><span class="pill ${c.copertura === null ? "programmare" : c.copertura >= 60 ? "regolare" : c.copertura > 0 ? "imminente" : "scaduta"}">${c.copertura === null ? "n/d" : c.copertura + "%"}</span></td>
      <td>${c.famiglia.interdittive ? "sì" : "no"}</td>
    </tr>`;
    })
    .join("");

  const righeLink = COLLEGAMENTI.map((c) => {
    const da = templatePerCodice(c.da.dominio, c.da.codice);
    const a = templatePerCodice(c.a.dominio, c.a.codice);
    return `<tr>
      <td class="mono">${esc(ETICHETTE_DOMINIO[c.da.dominio].breve)} ${esc(c.da.codice)}</td>
      <td>${esc(da?.titolo ?? "")}</td>
      <td class="mono">&rarr; ${esc(ETICHETTE_DOMINIO[c.a.dominio].breve)} ${esc(c.a.codice)}</td>
      <td>${esc(a?.titolo ?? "")}</td>
      <td>${esc(c.tipo.replace(/_/g, " "))}</td>
      <td>${esc(c.riferimento)}</td>
    </tr>`;
  }).join("");

  const sezioneSuite = `<h2>Vista integrata &middot; reati presupposto D.Lgs 231/01</h2>
  <p class="sotto">Copertura misurata sui presidi dei tre decreti insieme</p>
  <table>
    <thead><tr><th>Articolo</th><th>Famiglia</th><th>Presidiata da</th><th>In ordine</th><th>Copertura</th><th>Interdittive</th></tr></thead>
    <tbody>${righeReati}</tbody>
  </table>

  <h2>Collegamenti fra i moduli</h2>
  <p class="sotto">Adempimento unico, doppia lettura: chi possiede il dato e chi lo legge</p>
  <table>
    <thead><tr><th>Proprietario</th><th>Adempimento</th><th>Letto da</th><th>Adempimento</th><th>Tipo</th><th>Riferimento</th></tr></thead>
    <tbody>${righeLink}</tbody>
  </table>`;

  return `<!doctype html>
<html lang="it"><head><meta charset="utf-8"><title>Spike PDF - Suite Compliance</title>
<style>
  @page { size: A4; margin: 18mm 14mm 20mm; }
  @page { @bottom-center { content: counter(page); } }
  * { box-sizing: border-box; }
  body { font-family: ui-serif, Georgia, "Times New Roman", serif; color: #16202b; font-size: 10.5pt; line-height: 1.5; margin: 0; }
  .copertina { height: 245mm; display: flex; flex-direction: column; justify-content: space-between; page-break-after: always; }
  .marchio { font-family: ui-sans-serif, system-ui, sans-serif; font-size: 8.5pt; letter-spacing: .18em; text-transform: uppercase; color: #5b6b7c; }
  h1 { font-size: 30pt; line-height: 1.12; margin: 0 0 10mm; font-weight: 600; letter-spacing: -.015em; }
  .filo { height: 3px; background: #1b3a5c; width: 54mm; margin-bottom: 9mm; }
  .meta { font-family: ui-sans-serif, system-ui, sans-serif; font-size: 9pt; color: #47586a; }
  .meta b { color: #16202b; font-weight: 600; }
  h2 { font-family: ui-sans-serif, system-ui, sans-serif; font-size: 13pt; margin: 10mm 0 1mm; font-weight: 600;
       break-after: avoid; border-top: 2px solid #1b3a5c; padding-top: 3mm; }
  .sotto { font-family: ui-sans-serif, system-ui, sans-serif; font-size: 8pt; color: #5b6b7c; margin: 0 0 4mm; break-after: avoid; }
  table { width: 100%; border-collapse: collapse; font-family: ui-sans-serif, system-ui, sans-serif; font-size: 7.5pt;
          font-variant-numeric: tabular-nums; }
  thead { display: table-header-group; background: #eef2f6; }
  th { text-align: left; padding: 2mm 1.6mm; font-size: 6.5pt; letter-spacing: .07em; text-transform: uppercase;
       color: #47586a; border-bottom: 1.5px solid #c6d2de; }
  td { padding: 1.6mm; border-bottom: .5px solid #e3e9ef; vertical-align: top; }
  tr { page-break-inside: avoid; }
  .mono { font-family: ui-monospace, "Cascadia Mono", Consolas, monospace; white-space: nowrap; }
  .pill { display: inline-block; padding: .4mm 1.6mm; border-radius: 8px; font-size: 6.5pt; font-weight: 600; white-space: nowrap; }
  .critica { background: #fbe4e4; color: #8c1c1c; }
  .alta    { background: #fdf0dc; color: #8a5108; }
  .media   { background: #e7eef6; color: #29506f; }
  .bassa   { background: #eef1f4; color: #5b6b7c; }
  .scaduta { background: #fbe4e4; color: #8c1c1c; }
  .imminente { background: #fdf0dc; color: #8a5108; }
  .regolare { background: #e3f2e8; color: #1f5c37; }
  .programmare { background: #eef1f4; color: #5b6b7c; }
  .kpi { display: flex; gap: 4mm; margin: 0 0 6mm; }
  .kpi div { flex: 1; border: .5px solid #c6d2de; border-top: 2.5px solid #1b3a5c; padding: 3mm; }
  .kpi .v { font-family: ui-sans-serif, system-ui, sans-serif; font-size: 19pt; font-weight: 600;
            font-variant-numeric: tabular-nums; letter-spacing: -.02em; }
  .kpi .e { font-family: ui-sans-serif, system-ui, sans-serif; font-size: 6.5pt; text-transform: uppercase;
            letter-spacing: .09em; color: #5b6b7c; }
</style></head>
<body>
  <section class="copertina">
    <div class="marchio">Verifica tecnica &middot; Fase 1</div>
    <div>
      <div class="filo"></div>
      <h1>Relazione integrata<br/>di conformit&agrave;</h1>
      <div class="meta">
        <b>Gruppo Industriale Verdi S.p.A.</b><br/>
        Documento di prova generato il ${dataIt}<br/>
        Reg. UE 2016/679 &middot; D.Lgs 231/2001 &middot; D.Lgs 81/2008<br/>
        Driver di resa: <b>${esc(env.PDF_DRIVER)}</b> &middot; Adempimenti: <b>${TUTTI_I_TEMPLATES.length}</b>
      </div>
    </div>
    <div class="meta">Accentate: &agrave; &egrave; &eacute; &igrave; &ograve; &ugrave; &middot; Valuta: &euro; 636.515 &middot; Simboli: &sect; &para; &dagger; &permil;</div>
  </section>

  <div class="kpi">
    <div><div class="e">Totale</div><div class="v">${TUTTI_I_TEMPLATES.length}</div></div>
    ${DOMINI.map((d) => `<div><div class="e">${esc(ETICHETTE_DOMINIO[d].breve)}</div><div class="v">${CATALOGHI[d].length}</div></div>`).join("")}
  </div>
  ${sezioneSuite}
  ${sezioni}
</body></html>`;
}

function classeScadenza(s: string): string {
  return s === "Scaduta"
    ? "scaduta"
    : s === "In scadenza"
      ? "imminente"
      : s === "Regolare"
        ? "regolare"
        : "programmare";
}

/** Nessun valore finisce grezzo nel documento: è il difetto B3 dell'analisi del prototipo. */
function esc(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}

function classePriorita(p: string): string {
  return p === "Critica" ? "critica" : p === "Alta" ? "alta" : p === "Media" ? "media" : "bassa";
}
