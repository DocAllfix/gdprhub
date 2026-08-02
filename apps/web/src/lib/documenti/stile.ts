import { FONT_INCORPORATI } from "./font-incorporati";

// Il foglio di stile del DOCUMENTO. È l'altro registro del prodotto.
//
// L'applicazione è densa, neutra, silenziosa: uno strumento. Il documento è editoriale:
// serif, margini ampi, numerazione a margine, copertina. Il contrasto fra i due è
// deliberato, ed è il lusso del prodotto (DESIGN.md, «Due registri»).
//
// TRE SCELTE CHE DISTINGUONO IL DOCUMENTO DALLA SCHERMATA
//
// 1. Colonna di marginalia. Ogni sezione porta il proprio numero e il proprio riferimento
//    normativo nel margine sinistro, fuori dalla colonna di testo. È il gesto del registro
//    catastale e del fascicolo istruttorio, e nell'applicazione non esiste.
// 2. Impaginazione nostra, non del browser. Ogni pagina è un blocco 210×297mm: nessuna
//    intestazione di categoria orfana, nessuna riga spezzata a metà, «Pagina 3 di 12»
//    esatta. Su un atto che si consegna a un'autorità, la paginazione è una garanzia.
// 3. Il documento è SEMPRE chiaro. Non esiste un PDF in tema scuro: è carta.
//
// Il colore resta il secondo canale, mai il primo: lo stato della scadenza porta sempre
// anche la parola, perché il consulente stampa in bianco e nero e l'ispettore legge quello.

/** Geometria della pagina, in millimetri. Cambiarla qui cambia tutti i documenti. */
export const PAGINA = {
  larghezza: 210,
  altezza: 297,
  alto: 20,
  basso: 15,
  sinistra: 16,
  destra: 16,
  /** Colonna di marginalia, dentro il margine sinistro del testo. */
  marginalia: 21,
} as const;

export const STILE_DOCUMENTO = `
${FONT_INCORPORATI}

*, *::before, *::after { box-sizing: border-box; }

:root {
  --inchiostro: oklch(0.24 0.018 262);
  --tenue: oklch(0.5 0.008 262);
  --debole: oklch(0.62 0.006 262);
  --filo: oklch(0.86 0.005 262);
  --filo-sottile: oklch(0.92 0.004 262);
  --carta: oklch(0.995 0.0015 262);
  --incavo: oklch(0.972 0.003 262);

  --scaduta: oklch(0.46 0.175 26);
  --imminente: oklch(0.47 0.125 62);
  --regolare: oklch(0.44 0.105 152);
  --programmare: oklch(0.55 0.012 262);

  --gdpr: oklch(0.45 0.125 272);
  --d231: oklch(0.375 0.1 342);
  --d81: oklch(0.48 0.055 232);
}

html, body { margin: 0; padding: 0; background: var(--carta); }

body {
  font-family: "Newsreader", serif;
  font-size: 10.5pt;
  line-height: 1.55;
  color: var(--inchiostro);
  font-variant-numeric: tabular-nums lining-nums;
  -webkit-font-smoothing: antialiased;
}

@page { size: A4; margin: 0; }

/* ---------- Pagina ------------------------------------------------------------------ */

.pagina {
  position: relative;
  width: ${PAGINA.larghezza}mm;
  height: ${PAGINA.altezza}mm;
  padding: ${PAGINA.alto}mm ${PAGINA.destra}mm ${PAGINA.basso}mm ${PAGINA.sinistra}mm;
  overflow: hidden;
  break-after: page;
  page-break-after: always;
}
.pagina:last-child { break-after: auto; page-break-after: auto; }

/* La griglia editoriale: marginalia a sinistra, colonna di testo a destra. */
.griglia { display: grid; grid-template-columns: ${PAGINA.marginalia}mm 1fr; column-gap: 6mm; }
.griglia > .larga { grid-column: 1 / -1; }

.margine {
  font-family: "IBM Plex Sans", sans-serif;
  font-size: 6.5pt;
  line-height: 1.35;
  color: var(--debole);
  text-align: right;
  padding-top: 0.9mm;
}
.margine .num {
  font-family: "IBM Plex Mono", monospace;
  font-size: 7.5pt;
  color: var(--inchiostro);
  display: block;
}

/* ---------- Testatina e piede ------------------------------------------------------- */

.testatina {
  position: absolute;
  top: 10mm; left: ${PAGINA.sinistra}mm; right: ${PAGINA.destra}mm;
  display: flex; justify-content: space-between; align-items: baseline;
  font-family: "IBM Plex Sans", sans-serif;
  font-size: 6.5pt; letter-spacing: 0.07em; text-transform: uppercase;
  color: var(--debole);
  padding-bottom: 2mm;
  border-bottom: 0.25pt solid var(--filo-sottile);
}

.piede {
  position: absolute;
  bottom: 8mm; left: ${PAGINA.sinistra}mm; right: ${PAGINA.destra}mm;
  display: flex; justify-content: space-between; align-items: baseline;
  font-family: "IBM Plex Mono", monospace;
  font-size: 6.5pt;
  color: var(--debole);
  padding-top: 2mm;
  border-top: 0.25pt solid var(--filo-sottile);
}

/* ---------- Copertina --------------------------------------------------------------- */

/* Doppio filetto: è la segnalazione dell'atto formale, e costa due righe di CSS. */
.carta-intestata {
  border-top: 1.6pt solid var(--inchiostro);
  border-bottom: 0.25pt solid var(--inchiostro);
  padding: 2mm 0 2.4mm;
  display: flex; justify-content: space-between; align-items: baseline;
}
.carta-intestata .studio {
  font-family: "IBM Plex Sans", sans-serif;
  font-size: 9pt; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase;
}
.carta-intestata .qualifica {
  font-family: "IBM Plex Sans", sans-serif;
  font-size: 6.5pt; letter-spacing: 0.09em; text-transform: uppercase; color: var(--tenue);
}

.tipo-atto {
  margin-top: 46mm;
  font-family: "IBM Plex Sans", sans-serif;
  font-size: 7pt; font-weight: 600; letter-spacing: 0.16em; text-transform: uppercase;
  color: var(--tenue);
}
.titolo-atto {
  margin: 4mm 0 0;
  font-size: 30pt; font-weight: 600; line-height: 1.1; letter-spacing: -0.015em;
  max-width: 130mm;
}
.sottotitolo-atto {
  margin: 5mm 0 0;
  font-size: 12pt; font-style: italic; color: var(--tenue); max-width: 120mm;
}

/* Lo specchietto identificativo: è il frontespizio di un atto, non una scheda. */
.specchietto { margin-top: 30mm; border-top: 0.25pt solid var(--filo); }
.specchietto dl { display: grid; grid-template-columns: 46mm 1fr; margin: 0; }
.specchietto dt, .specchietto dd {
  margin: 0; padding: 2.2mm 0; border-bottom: 0.25pt solid var(--filo-sottile);
}
.specchietto dt {
  font-family: "IBM Plex Sans", sans-serif;
  font-size: 7pt; letter-spacing: 0.07em; text-transform: uppercase; color: var(--tenue);
  padding-top: 2.9mm;
}
.specchietto dd { font-size: 10.5pt; }

.emissione {
  position: absolute;
  bottom: ${PAGINA.basso}mm; left: ${PAGINA.sinistra}mm; right: ${PAGINA.destra}mm;
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 6mm;
  border-top: 0.25pt solid var(--filo);
  padding-top: 2.5mm;
  font-family: "IBM Plex Mono", monospace; font-size: 6.5pt; line-height: 1.5;
  color: var(--tenue);
}
.emissione b {
  display: block; font-weight: 400;
  font-family: "IBM Plex Sans", sans-serif; font-size: 6pt;
  letter-spacing: 0.09em; text-transform: uppercase; color: var(--debole);
}

/* ---------- Titoli e prosa ---------------------------------------------------------- */

h2.sezione {
  margin: 0 0 3mm;
  font-size: 15pt; font-weight: 600; letter-spacing: -0.01em; line-height: 1.2;
}
h3.paragrafo {
  margin: 7mm 0 2mm;
  font-family: "IBM Plex Sans", sans-serif;
  font-size: 8pt; font-weight: 600; letter-spacing: 0.09em; text-transform: uppercase;
}
p { margin: 0 0 3mm; max-width: 68ch; }
p.occhiello {
  font-size: 11.5pt; font-style: italic; color: var(--tenue); line-height: 1.5;
  margin-bottom: 5mm;
}
.nota {
  font-size: 8.5pt; font-style: italic; color: var(--tenue); line-height: 1.5;
  max-width: 72ch;
}
.metodo {
  margin-top: 4mm; padding: 3.5mm 4mm;
  background: var(--incavo); border-top: 0.5pt solid var(--filo);
  font-size: 8.5pt; line-height: 1.55;
}
.metodo h4 {
  margin: 0 0 1.6mm;
  font-family: "IBM Plex Sans", sans-serif;
  font-size: 6.5pt; font-weight: 600; letter-spacing: 0.11em; text-transform: uppercase;
  color: var(--tenue);
}
.metodo p { margin: 0 0 1.8mm; max-width: none; }
.metodo p:last-child { margin-bottom: 0; }

.mono { font-family: "IBM Plex Mono", monospace; font-size: 0.92em; }

/* ---------- Tabelle ----------------------------------------------------------------- */

table { width: 100%; border-collapse: collapse; font-family: "IBM Plex Sans", sans-serif; }

thead th {
  font-size: 6.5pt; font-weight: 600; letter-spacing: 0.09em; text-transform: uppercase;
  color: var(--tenue); text-align: left;
  padding: 0 2mm 1.4mm; border-bottom: 0.7pt solid var(--inchiostro);
}
tbody td {
  font-size: 8pt; line-height: 1.35; vertical-align: top;
  padding: 1.5mm 2mm; border-bottom: 0.25pt solid var(--filo-sottile);
}
tbody tr:last-child td { border-bottom: 0.25pt solid var(--filo); }
th.num, td.num { text-align: right; font-variant-numeric: tabular-nums; }

/* Intestazione di categoria dentro la tabella: mai orfana, perché impaginiamo noi. */
tr.categoria td {
  padding: 4mm 2mm 1.2mm;
  font-size: 6.5pt; font-weight: 600; letter-spacing: 0.11em; text-transform: uppercase;
  color: var(--inchiostro); border-bottom: 0.5pt solid var(--filo);
}
tr:first-child.categoria td { padding-top: 1mm; }

td.codice { font-family: "IBM Plex Mono", monospace; font-size: 7.5pt; white-space: nowrap; }
td.data { font-family: "IBM Plex Mono", monospace; font-size: 7.5pt; white-space: nowrap; }
td.data .giorni { color: var(--debole); font-size: 6.5pt; }

/* Lo stato porta SEMPRE la parola. Il colore è il secondo canale: in bianco e nero il
   documento resta leggibile, ed è così che il consulente lo consegna. */
.stato {
  font-size: 6.5pt; font-weight: 600; letter-spacing: 0.07em; text-transform: uppercase;
  white-space: nowrap;
}
.stato.imminente { color: var(--imminente); }
.stato.scaduta { color: var(--scaduta); }
.stato.regolare { color: var(--regolare); }
.stato.programmare { color: var(--programmare); }
.data.scaduta { color: var(--scaduta); font-weight: 600; }
.data.imminente { color: var(--imminente); }
.data.regolare { color: var(--regolare); }
.data.programmare { color: var(--programmare); }

.lavoro {
  font-size: 7pt; color: var(--tenue); white-space: nowrap;
}
.lavoro.fatto { color: var(--inchiostro); }

.dominio {
  font-family: "IBM Plex Mono", monospace;
  font-size: 6pt; font-weight: 600; letter-spacing: 0.04em;
  padding: 0.4mm 1.1mm; border: 0.25pt solid currentColor; border-radius: 0.6mm;
  white-space: nowrap;
}
.dominio.gdpr { color: var(--gdpr); }
.dominio.d231 { color: var(--d231); }
.dominio.d81 { color: var(--d81); }

/* ---------- Prospetto dei numeri ---------------------------------------------------- */

/* Nessun numero eroico: un prospetto in cui ogni cifra dichiara il proprio denominatore. */
.prospetto { width: 100%; border-collapse: collapse; margin-top: 1mm; }
.prospetto td, .prospetto th { padding: 2.4mm 2mm; }
.prospetto tbody td { border-bottom: 0.25pt solid var(--filo-sottile); font-size: 9pt; }
.prospetto .quota {
  font-family: "IBM Plex Sans", sans-serif; font-size: 15pt; font-weight: 600;
  letter-spacing: -0.02em;
}
.prospetto .denominatore {
  display: block; font-size: 6.5pt; color: var(--debole);
  font-family: "IBM Plex Mono", monospace; letter-spacing: 0;
}
.prospetto tfoot td {
  padding-top: 3mm; border-top: 0.7pt solid var(--inchiostro);
  font-family: "IBM Plex Sans", sans-serif; font-size: 8pt;
}

/* La scomposizione dell'indice: l'aritmetica stampata, non un grafico.
   Nessuna barra spessa: una barra nera alta due millimetri legge come una censura. */
.scomposizione { margin-top: 3mm; font-family: "IBM Plex Mono", monospace; font-size: 7.5pt; }
.scomposizione table { font-family: inherit; table-layout: fixed; }
.scomposizione td { padding: 1.4mm 3mm 1.4mm 0; border: 0; font-size: 7.5pt; }
.scomposizione .voce { width: 32mm; white-space: nowrap; }
.scomposizione .formula { width: 24mm; white-space: nowrap; color: var(--debole); }
.scomposizione .barra { padding-right: 4mm; }
/* Il binario dichiara la scala: senza, una barra corta non si sa corta rispetto a cosa. */
.scomposizione .barra { border-bottom: 0.25pt solid var(--filo-sottile); }
.scomposizione .barra span {
  display: block; height: 1mm; background: var(--inchiostro); min-width: 0.3mm;
  margin-bottom: 0.5mm;
}
.scomposizione td.num { width: 14mm; padding-right: 0; }
.scomposizione tr.glossa td { padding: 0 0 1.6mm; font-size: 6.5pt; color: var(--debole); }
.scomposizione tr.somma td {
  border-top: 0.5pt solid var(--filo); padding-top: 2mm; font-weight: 600;
}

/* ---------- Fascicolo: righe di riscontro ------------------------------------------- */

.intestazione-blocco {
  font-family: "IBM Plex Sans", sans-serif;
  font-size: 6.5pt; font-weight: 600; letter-spacing: 0.11em; text-transform: uppercase;
  color: var(--tenue); margin: 0 0 1.4mm;
}

.riscontro { border-top: 0.7pt solid var(--inchiostro); }
.riscontro .voce {
  display: grid; grid-template-columns: 13mm 1fr 26mm 18mm;
  column-gap: 3mm; align-items: baseline;
  padding: 2.4mm 0; border-bottom: 0.25pt solid var(--filo-sottile);
}
/* Il blocco di supporto sta più stretto: è documentazione di seconda battuta. */
.riscontro.compatta .voce { padding: 1.5mm 0; }
.riscontro .voce.intestazione {
  border-bottom: 0.5pt solid var(--filo); padding-top: 0;
  font-family: "IBM Plex Sans", sans-serif;
  font-size: 6.5pt; letter-spacing: 0.09em; text-transform: uppercase; color: var(--tenue);
}
.riscontro .voce.intestazione .cod,
.riscontro .voce.intestazione .tit,
.riscontro .voce.intestazione .dt { font: inherit; letter-spacing: inherit; }
.riscontro .voce .cod { font-family: "IBM Plex Mono", monospace; font-size: 7.5pt; }
.riscontro .voce .tit { font-family: "IBM Plex Sans", sans-serif; font-size: 8.5pt; }
.riscontro .voce .tit em {
  display: block; font-family: "Newsreader", serif; font-size: 7.5pt; color: var(--tenue);
}
.riscontro .voce .dt { font-family: "IBM Plex Mono", monospace; font-size: 7.5pt; }

/* La casella si stampa vuota: è l'ispettore a spuntarla, e per questo il documento è un
   fascicolo e non una stampa di schermata. */
.casella {
  display: inline-block; width: 3.4mm; height: 3.4mm;
  border: 0.5pt solid var(--inchiostro); border-radius: 0.4mm;
}

.firme {
  margin-top: 12mm; display: grid; grid-template-columns: 1fr 1fr; gap: 14mm;
}
.firme div { border-top: 0.5pt solid var(--inchiostro); padding-top: 1.8mm; }
.firme span {
  font-family: "IBM Plex Sans", sans-serif; font-size: 6.5pt;
  letter-spacing: 0.09em; text-transform: uppercase; color: var(--tenue);
}
`;
