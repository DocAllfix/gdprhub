#!/usr/bin/env node
// Cancello dei prototipi di documento.
//
// Non basta che il PDF esca: deve uscire GIUSTO. Tre verifiche che l'occhio non fa in modo
// affidabile, e che un documento destinato a un'autorità non può permettersi di sbagliare:
//
//   1. NESSUNA PAGINA TRABOCCA. Impaginiamo noi, e `overflow: hidden` taglierebbe in
//      silenzio le righe in eccesso. Una riga persa in fondo a pagina 3 non si nota
//      guardando, e in un elenco di adempimenti è esattamente ciò che non deve accadere.
//   2. NESSUN FONT DI RIPIEGO. Si interroga `document.fonts.check` per ogni taglio
//      incorporato. È il difetto che lo spike della Fase 0 ha trovato su Vercel.
//   3. IL PDF HA LE PAGINE CHE DEVE AVERE, e i font sono INCORPORATI nel file.
//
//   node scripts/prototipi-pdf.mjs [--base http://localhost:3100]
//
// Salva PDF e anteprime PNG in `prototipi-pdf/` per l'ispezione visiva.

import { mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const QUI = dirname(fileURLToPath(import.meta.url));
const USCITA = join(QUI, "..", "prototipi-pdf");

const argomenti = process.argv.slice(2);
const indiceBase = argomenti.indexOf("--base");
const BASE = indiceBase >= 0 ? argomenti[indiceBase + 1] : "http://localhost:3100";

const DOCUMENTI = ["relazione", "assessment", "fascicolo", "scadenzario"];

// I tagli dichiarati in scripts/incorpora-font.mjs. Se il documento ne chiede uno che non
// c'è, Chrome ripiega in silenzio e il PDF esce con il carattere sbagliato.
const TAGLI = [
  '400 10pt "Newsreader"',
  'italic 400 10pt "Newsreader"',
  '600 10pt "Newsreader"',
  '400 10pt "IBM Plex Sans"',
  '600 10pt "IBM Plex Sans"',
  '400 10pt "IBM Plex Mono"',
];

let errori = 0;
const problema = (m) => {
  errori += 1;
  console.log(`  ✗ ${m}`);
};

mkdirSync(USCITA, { recursive: true });

const browser = await chromium.launch();
const contesto = await browser.newContext({ viewport: { width: 900, height: 1273 } });

console.log(`\nPrototipi di documento · ${BASE}\n`);

for (const nome of DOCUMENTI) {
  console.log(`${nome}`);
  const pagina = await contesto.newPage();

  const consoleErrori = [];
  pagina.on("console", (m) => m.type() === "error" && consoleErrori.push(m.text()));
  pagina.on("requestfailed", (r) => consoleErrori.push(`richiesta fallita: ${r.url()}`));

  // --- 1. Impaginazione, sul sorgente HTML ------------------------------------------------
  const risposta = await pagina.goto(`${BASE}/prototipi/${nome}?html=1`, { waitUntil: "load" });
  if (!risposta || !risposta.ok()) {
    problema(`HTML non raggiungibile (${risposta ? risposta.status() : "nessuna risposta"})`);
    await pagina.close();
    continue;
  }
  await pagina.evaluate(() => document.fonts.ready);

  const esito = await pagina.evaluate(async (tagli) => {
    const pagine = [...document.querySelectorAll(".pagina")];
    // `fonts.check` da solo risponde «no» anche per un taglio dichiarato e perfettamente
    // valido, se nessun testo di questa pagina lo richiede: `font-display: block` non lo
    // carica finché non serve. Prima si forza il caricamento, poi si verifica. Senza
    // questo passaggio il cancello bocciava due documenti su quattro per un non-difetto.
    const mancanti = [];
    for (const t of tagli) {
      await document.fonts.load(t, "Adempimento 0123456789");
      if (!document.fonts.check(t)) mancanti.push(t);
    }
    // Quanto della pagina è davvero occupato. Impaginare noi vuol dire poter sbagliare
    // per difetto: una pagina riempita al 60% non è un errore visibile, è solo un
    // documento che sembra sciatto. Si misura, non si guarda.
    const riempimento = pagine.map((p, i) => {
      const stile = getComputedStyle(p);
      const cima = p.getBoundingClientRect().top + parseFloat(stile.paddingTop);
      const fondoUtile = p.getBoundingClientRect().bottom - parseFloat(stile.paddingBottom);
      const contenuti = [...p.children].filter(
        (c) => !c.classList.contains("testatina") && !c.classList.contains("piede"),
      );
      const fondo = contenuti.reduce((m, c) => Math.max(m, c.getBoundingClientRect().bottom), cima);
      return {
        i: i + 1,
        quota: (fondo - cima) / (fondoUtile - cima),
        aerata: p.classList.contains("pagina-aerata"),
      };
    });

    return {
      mancanti,
      riempimento,
      pagine: pagine.length,
      // 1pt di tolleranza: l'arrotondamento sub-pixel non è un traboccamento.
      traboccate: pagine
        .map((p, i) => ({ i: i + 1, ecc: Math.round(p.scrollHeight - p.clientHeight) }))
        .filter((x) => x.ecc > 1),
      // Nessuna risorsa remota: un documento che scarica qualcosa si stampa diverso offline.
      remote: [...document.querySelectorAll("[src],[href]")]
        .map((e) => e.getAttribute("src") || e.getAttribute("href"))
        .filter((u) => u && /^https?:/i.test(u)),
      // Il testo deve stare nella colonna: se una cella sfonda, si vede solo stampando.
      sforanti: [...document.querySelectorAll("table")].filter((t) => t.scrollWidth - t.clientWidth > 1)
        .length,
    };
  }, TAGLI);

  if (esito.traboccate.length > 0) {
    for (const t of esito.traboccate) problema(`pagina ${t.i} trabocca di ${t.ecc}px`);
  }
  // L'ultima pagina finisce dove finisce il contenuto, e la pagina dichiarata «aerata» è
  // vuota di proposito. Tutte le altre devono essere piene: sotto l'85% la calibrazione
  // dell'impaginazione è andata alla deriva.
  for (const r of esito.riempimento) {
    if (r.i === esito.pagine || r.aerata) continue;
    if (r.quota < 0.85) problema(`pagina ${r.i} riempita al ${Math.round(r.quota * 100)}%`);
  }
  if (esito.remote.length > 0) problema(`risorse remote: ${esito.remote.slice(0, 3).join(", ")}`);
  if (esito.mancanti.length > 0) problema(`font di ripiego: ${esito.mancanti.join(", ")}`);
  if (esito.sforanti > 0) problema(`${esito.sforanti} tabelle sforano in larghezza`);
  if (consoleErrori.length > 0) problema(`console: ${consoleErrori[0]}`);

  // Anteprima della prima pagina, per l'ispezione visiva.
  const primaPagina = pagina.locator(".pagina").first();
  await primaPagina.screenshot({ path: join(USCITA, `${nome}-p1.png`) });
  await pagina.screenshot({ path: join(USCITA, `${nome}-intero.png`), fullPage: true });
  await pagina.close();

  // --- 2. Il PDF vero ---------------------------------------------------------------------
  const pdfRisposta = await contesto.request.get(`${BASE}/prototipi/${nome}`, { timeout: 120000 });
  if (!pdfRisposta.ok()) {
    problema(`PDF non generato (${pdfRisposta.status()})`);
    continue;
  }
  const corpo = await pdfRisposta.body();
  writeFileSync(join(USCITA, `${nome}.pdf`), corpo);

  const testo = corpo.toString("latin1");
  const paginePdf = (testo.match(/\/Type\s*\/Page[^s]/g) || []).length;
  // Se il PDF non incorpora i font, il file non contiene alcun FontFile2/3: è il segnale
  // che il documento si stamperà con i caratteri della macchina di chi lo apre.
  const incorporati = (testo.match(/\/FontFile\d?/g) || []).length;

  if (paginePdf !== esito.pagine) {
    problema(`il PDF ha ${paginePdf} pagine, l'HTML ne dichiara ${esito.pagine}`);
  }
  if (incorporati === 0) problema("nessun font incorporato nel PDF");

  const quote = esito.riempimento.map((r) => `${Math.round(r.quota * 100)}%`).join(" ");
  console.log(
    `  ${errori === 0 ? "ok" : "  "}  ${esito.pagine} pagine · ${Math.round(corpo.length / 1024)} KB · ${incorporati} font incorporati · riempimento ${quote}`,
  );
}

await browser.close();

if (errori > 0) {
  console.log(`\n✗ ${errori} problemi. I prototipi non sono presentabili.\n`);
  process.exit(1);
}
console.log(`\n✓ Quattro prototipi generati in apps/web/prototipi-pdf/\n`);
