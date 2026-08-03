import { FONT_INCORPORATI } from "./font-incorporati";

// Il foglio di stile del DOCUMENTO, nella lingua del prodotto.
//
// FINO AL 2026-08-03 ERA L'ALTRO REGISTRO: serif editoriale, Newsreader in copertina, e il
// contrasto con la schermata era voluto e scritto. Il committente ha chiesto il contrario,
// e ha ragione lui — un documento che non somiglia allo strumento che l'ha prodotto non si
// riconosce come suo. Chi riceve la relazione deve vedere lo stesso prodotto, non due
// marchi diversi. Quindi Geist come nell'applicazione, l'oliva della colonna come tinta di
// marca, e la stessa gerarchia del colore.
//
// QUATTRO SCELTE CHE RESTANO PROPRIE DEL DOCUMENTO, perché la carta non è uno schermo.
//
// 1. Colonna di marginalia. Ogni sezione porta il proprio numero e il proprio riferimento
//    normativo nel margine sinistro, fuori dalla colonna di testo. È il gesto del registro
//    catastale, e nell'applicazione non esiste perché lì lo spazio serve ai dati.
// 2. Impaginazione nostra, non del browser. Ogni pagina è un blocco 210×297mm: nessuna
//    intestazione di categoria orfana, nessuna riga spezzata a metà, «Pagina 3 di 12»
//    esatta. Su un atto che si consegna a un'autorità, la paginazione è una garanzia.
// 3. Il documento è SEMPRE chiaro. Non esiste un PDF in tema scuro: è carta.
// 4. IL FILETTO TORNA. Nell'applicazione i pannelli non hanno bordo perché la superficie
//    fa il lavoro; sulla carta non esistono superfici, esiste solo l'inchiostro, e una
//    tabella senza righe è una tabella che si legge male in fotocopia.
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
  --inchiostro: oklch(0.243 0.013 110);
  --tenue: oklch(0.503 0.01 110);
  --debole: oklch(0.623 0.008 110);
  --filo: oklch(0.858 0.008 110);
  --filo-sottile: oklch(0.925 0.006 110);
  --carta: oklch(0.996 0.002 110);
  --incavo: oklch(0.966 0.005 110);

  --scaduta: oklch(0.46 0.175 26);
  --imminente: oklch(0.47 0.125 62);
  --regolare: oklch(0.45 0.105 168);
  --programmare: oklch(0.55 0.012 110);

  --gdpr: oklch(0.45 0.125 272);
  --d231: oklch(0.375 0.1 342);
  --d81: oklch(0.48 0.055 232);

  /* La tinta di marca, la stessa della colonna dell'applicazione. */
  --oliva: oklch(0.315 0.078 112);
  --oliva-tenue: oklch(0.93 0.04 112);
}

html, body { margin: 0; padding: 0; background: var(--carta); }

body {
  font-family: "Geist", sans-serif;
  font-size: 9.8pt;
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
  font-family: "Geist", sans-serif;
  font-size: 6.5pt;
  line-height: 1.35;
  color: var(--debole);
  text-align: right;
  padding-top: 0.9mm;
}
.margine .num {
  font-family: "Geist Mono", monospace;
  font-size: 7.5pt;
  color: var(--oliva);
  display: block;
}

/* ---------- Testatina e piede ------------------------------------------------------- */

.testatina {
  position: absolute;
  top: 10mm; left: ${PAGINA.sinistra}mm; right: ${PAGINA.destra}mm;
  display: flex; justify-content: space-between; align-items: baseline;
  font-family: "Geist", sans-serif;
  font-size: 6.5pt; letter-spacing: 0.07em; text-transform: uppercase;
  color: var(--debole);
  padding-bottom: 2mm;
  border-bottom: 0.25pt solid var(--filo-sottile);
}

.piede {
  position: absolute;
  bottom: 8mm; left: ${PAGINA.sinistra}mm; right: ${PAGINA.destra}mm;
  display: flex; justify-content: space-between; align-items: baseline;
  font-family: "Geist Mono", monospace;
  font-size: 6.5pt;
  color: var(--debole);
  padding-top: 2mm;
  border-top: 0.25pt solid var(--filo-sottile);
}

/* ---------- Copertina --------------------------------------------------------------- */

/* Doppio filetto: è la segnalazione dell'atto formale, e costa due righe di CSS. */
.carta-intestata {
  /* IL FILETTO ALTO È OLIVA, ed è l'unica cosa colorata della copertina.
     È il colore della colonna dell'applicazione: chi riceve la relazione deve riconoscere
     lo stesso prodotto. Basta un filetto — su un atto, un blocco di colore pieno sarebbe
     una brochure. */
  border-top: 2.4pt solid var(--oliva);
  border-bottom: 0.25pt solid var(--inchiostro);
  padding: 2mm 0 2.4mm;
  display: flex; justify-content: space-between; align-items: baseline;
}
.carta-intestata .studio {
  font-family: "Geist", sans-serif;
  font-size: 9pt; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase;
}
.carta-intestata .qualifica {
  font-family: "Geist", sans-serif;
  font-size: 6.5pt; letter-spacing: 0.09em; text-transform: uppercase; color: var(--tenue);
}

.tipo-atto {
  margin-top: 46mm;
  font-family: "Geist", sans-serif;
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
  font-family: "Geist", sans-serif;
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
  font-family: "Geist Mono", monospace; font-size: 6.5pt; line-height: 1.5;
  color: var(--tenue);
}
.emissione b {
  display: block; font-weight: 400;
  font-family: "Geist", sans-serif; font-size: 6pt;
  letter-spacing: 0.09em; text-transform: uppercase; color: var(--debole);
}

/* ---------- Titoli e prosa ---------------------------------------------------------- */

h2.sezione {
  margin: 0 0 3mm;
  font-size: 15pt; font-weight: 600; letter-spacing: -0.01em; line-height: 1.2;
}
h3.paragrafo {
  margin: 7mm 0 2mm;
  font-family: "Geist", sans-serif;
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
  font-family: "Geist", sans-serif;
  font-size: 6.5pt; font-weight: 600; letter-spacing: 0.11em; text-transform: uppercase;
  color: var(--tenue);
}
.metodo p { margin: 0 0 1.8mm; max-width: none; }
.metodo p:last-child { margin-bottom: 0; }

.mono { font-family: "Geist Mono", monospace; font-size: 0.92em; }

/* ---------- Tabelle ----------------------------------------------------------------- */

table { width: 100%; border-collapse: collapse; font-family: "Geist", sans-serif; }

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

td.codice { font-family: "Geist Mono", monospace; font-size: 7.5pt; white-space: nowrap; }
td.data { font-family: "Geist Mono", monospace; font-size: 7.5pt; white-space: nowrap; }
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
  font-family: "Geist Mono", monospace;
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
  font-family: "Geist", sans-serif; font-size: 15pt; font-weight: 600;
  letter-spacing: -0.02em;
}
.prospetto .denominatore {
  display: block; font-size: 6.5pt; color: var(--debole);
  font-family: "Geist Mono", monospace; letter-spacing: 0;
}
.prospetto tfoot td {
  padding-top: 3mm; border-top: 0.7pt solid var(--inchiostro);
  font-family: "Geist", sans-serif; font-size: 8pt;
}

/* La scomposizione dell'indice: l'aritmetica stampata, non un grafico.
   Nessuna barra spessa: una barra nera alta due millimetri legge come una censura. */
.scomposizione { margin-top: 3mm; font-family: "Geist Mono", monospace; font-size: 7.5pt; }
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
  font-family: "Geist", sans-serif;
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
  font-family: "Geist", sans-serif;
  font-size: 6.5pt; letter-spacing: 0.09em; text-transform: uppercase; color: var(--tenue);
}
.riscontro .voce.intestazione .cod,
.riscontro .voce.intestazione .tit,
.riscontro .voce.intestazione .dt { font: inherit; letter-spacing: inherit; }
.riscontro .voce .cod { font-family: "Geist Mono", monospace; font-size: 7.5pt; }
.riscontro .voce .tit { font-family: "Geist", sans-serif; font-size: 8.5pt; }
.riscontro .voce .tit em {
  display: block; font-family: "Geist", sans-serif; font-size: 7.5pt; color: var(--tenue);
}
.riscontro .voce .dt { font-family: "Geist Mono", monospace; font-size: 7.5pt; }

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
  font-family: "Geist", sans-serif; font-size: 6.5pt;
  letter-spacing: 0.09em; text-transform: uppercase; color: var(--tenue);
}

/* ---------- Relazione: pezzi propri ---------------------------------------------------
   Le classi qui sotto le usa il costruttore della relazione. La prima versione le usava senza che
   esistessero, e il risultato era un documento in cui il denominatore si incollava alla
   percentuale — «17%7/42» — e la norma al nome del modulo. Le classi inventate non
   falliscono: rendono male, e si vede solo guardando la carta. */

table.tabella { margin-top: 4mm; }
table.tabella.fitta tbody td { padding: 1.1mm 2mm; font-size: 7.5pt; }

/* Il rigo secondario di una cella: la norma sotto il modulo, il denominatore sotto la
   percentuale, il riferimento sotto il titolo. Va A CAPO, sempre. */
.tabella .sotto {
  display: block;
  margin-top: 0.5mm;
  font-size: 6.5pt;
  line-height: 1.25;
  color: var(--debole);
}

th.num-cella, td.num-cella {
  text-align: right;
  font-variant-numeric: tabular-nums lining-nums;
  white-space: nowrap;
}
td.num-cella { font-family: "Geist Mono", monospace; font-size: 8pt; }
td.num-cella .sotto { font-family: "Geist Mono", monospace; }

/* Lo stato della scadenza porta il colore E la parola. Il colore è il secondo canale:
   in fotocopia resta la parola, ed è così che il documento arriva a un ispettore. */
td.st-scaduta { color: var(--scaduta); }
td.st-imminente { color: var(--imminente); }
td.st-regolare { color: var(--regolare); }
td.st-programmare { color: var(--programmare); }
.num-cella.st-scaduta { color: var(--scaduta); font-weight: 600; }

p.nota {
  margin-top: 3mm;
  font-size: 7.5pt;
  line-height: 1.45;
  color: var(--tenue);
}
/* Un rilievo non è un avviso colorato: è un blocco che rientra, come una citazione in un
   atto. Il filetto è oliva perché è il colore del prodotto, non perché segnali un rischio. */
p.nota.rilievo {
  border-left: 1.2pt solid var(--oliva);
  padding: 1.5mm 0 1.5mm 4mm;
  color: var(--inchiostro);
}

span.riga-firma {
  display: block;
  height: 9mm;
}

/* ---------- Copertina a piena tinta ---------------------------------------------------
   La lastra oliva occupa quasi tutta la pagina, con il titolo in basso a sinistra. È il
   gesto che rende un documento riconoscibile prima di essere letto, e su una relazione di
   conformità dice la cosa giusta: questo non è un tabulato, è un atto che qualcuno firma.
   Il margine bianco tutto attorno serve: una tinta a filo di pagina si stampa male su ogni
   stampante da ufficio, e su una piega si vede. */

.pagina.copertina { padding: 0; }
.lastra {
  position: absolute;
  inset: 12mm;
  background: var(--oliva);
  color: oklch(0.97 0.02 110);
  padding: 16mm 16mm 18mm;
  display: flex;
  flex-direction: column;
}
.lastra .alto { display: flex; justify-content: space-between; align-items: baseline; }
.lastra .marchio {
  font-size: 8.5pt; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase;
}
.lastra .qualifica {
  font-size: 6.5pt; letter-spacing: 0.1em; text-transform: uppercase;
  color: oklch(0.86 0.04 110);
}
.lastra .basso { margin-top: auto; }
.lastra .tipo {
  font-size: 7pt; letter-spacing: 0.14em; text-transform: uppercase;
  color: oklch(0.86 0.04 110); margin: 0 0 4mm;
}
.lastra h1 {
  font-size: 26pt; font-weight: 600; line-height: 1.1; letter-spacing: -0.02em;
  margin: 0 0 4mm; max-width: 130mm;
}
.lastra .ente { font-size: 12pt; margin: 0 0 8mm; color: oklch(0.92 0.03 110); }
.lastra .riga-dati {
  display: flex; gap: 10mm; flex-wrap: wrap;
  border-top: 0.5pt solid oklch(0.5 0.06 110); padding-top: 4mm;
}
.lastra .riga-dati div { font-size: 7pt; line-height: 1.5; color: oklch(0.88 0.03 110); }
.lastra .riga-dati b {
  display: block; font-size: 6pt; font-weight: 600; letter-spacing: 0.1em;
  text-transform: uppercase; color: oklch(0.74 0.05 110); margin-bottom: 1mm;
}
.lastra .riga-dati .grande {
  font-family: "Geist Mono", monospace; font-size: 13pt; color: oklch(0.97 0.02 110);
}

/* ---------- Grafici -------------------------------------------------------------------
   Ogni valore è STAMPATO: sulla carta non esiste il passaggio del mouse, e un grafico che
   rivela i numeri solo al passaggio non rivela niente. */

figure.grafico { margin: 5mm 0 0; }
figure.grafico figcaption {
  margin-top: 2mm; font-size: 6.5pt; color: var(--debole); line-height: 1.4;
}
figure.grafico figcaption .unita { float: right; }

.ciambella { display: flex; align-items: center; gap: 8mm; }
.ciambella svg { flex: 0 0 auto; }
.cifra-svg {
  font-family: "Geist Mono", monospace; font-size: 8px; font-weight: 500;
  fill: var(--inchiostro); letter-spacing: -0.04em;
}
.sotto-svg { font-family: "Geist", sans-serif; font-size: 2.6px; fill: var(--debole); }

ul.legenda { list-style: none; margin: 0; padding: 0; flex: 1; }
ul.legenda li {
  display: flex; align-items: baseline; gap: 2mm; font-size: 7.5pt;
  padding: 0.8mm 0; border-bottom: 0.25pt solid var(--filo-sottile);
}
ul.legenda li:last-child { border-bottom: 0; }
.pallino { width: 2mm; height: 2mm; border-radius: 0.3mm; flex: 0 0 auto; display: inline-block; }
ul.legenda .voce { flex: 1; color: var(--tenue); }
ul.legenda .val { font-family: "Geist Mono", monospace; font-weight: 500; }
ul.legenda .quota {
  font-family: "Geist Mono", monospace; font-size: 6.5pt; color: var(--debole);
  width: 9mm; text-align: right;
}

ul.barre { list-style: none; margin: 0; padding: 0; }
ul.barre li { display: flex; align-items: center; gap: 3mm; padding: 1mm 0; }
ul.barre .et { flex: 0 0 44mm; font-size: 7.5pt; line-height: 1.25; }
ul.barre .barra {
  flex: 1; height: 2.2mm; background: var(--incavo); border-radius: 1.1mm;
  overflow: hidden; display: flex;
}
ul.barre .barra.alta { height: 3.4mm; border-radius: 1.7mm; }
ul.barre .pezzo { height: 100%; display: block; }
ul.barre .pezzo.scaduto { background: var(--scaduta); }
ul.barre .pezzo.resto { background: var(--filo); }
ul.barre .val {
  flex: 0 0 16mm; text-align: right; font-family: "Geist Mono", monospace; font-size: 7.5pt;
}
ul.barre .val b { color: var(--scaduta); }
ul.barre.conformita .val { flex: 0 0 22mm; }
ul.barre .val .den {
  display: block; font-size: 6pt; color: var(--debole);
}

/* LE ETICHETTE DEI MESI STANNO SOTTO, e per stare sotto serve spazio riservato.
   La prima versione le posizionava in assoluto senza che la colonna fosse il riferimento:
   finivano tutte impilate sopra la didascalia, illeggibili. Ora ogni colonna è il proprio
   riferimento e la fascia in fondo è alta quanto il testo che deve contenere. */
.colonne { display: flex; gap: 2mm; }
.colonne .scala {
  display: flex; flex-direction: column; justify-content: space-between; height: var(--h);
  font-family: "Geist Mono", monospace; font-size: 6pt; color: var(--debole);
  padding-bottom: 5mm;
}
.colonne .campo {
  position: relative; flex: 1; height: calc(var(--h) + 5mm); display: flex; gap: 1.4mm;
  align-items: flex-end; padding-bottom: 5mm;
  border-bottom: 0.5pt solid var(--filo);
}
.colonne .media {
  position: absolute; left: 0; right: 0; border-top: 0.5pt dashed var(--debole);
  margin-bottom: 5mm;
}
.colonne .colonna {
  position: relative;
  flex: 1; height: 100%; display: flex; flex-direction: column; justify-content: flex-end;
}
.colonne .pila { display: flex; flex-direction: column-reverse; height: 100%; justify-content: flex-start; }
.colonne .pila .pezzo { width: 100%; display: block; }
.colonne .colonna .et {
  position: absolute; left: 0; right: 0; bottom: -4.6mm;
  text-align: center; font-size: 5.5pt; color: var(--debole);
}

/* La legenda va A CAPO, non affiancata alla didascalia: sovrapposta ai mesi non si legge
   né lei né loro. */
.legenda-riga {
  display: flex; gap: 5mm; align-items: center; flex-wrap: wrap;
  margin-top: 1.5mm;
}
.legenda-riga .v { display: flex; align-items: center; gap: 1.2mm; }
.legenda-riga .media-nota { color: var(--debole); }

/* Il filetto oliva sopra il titolo di sezione: è il gesto che scandisce il documento e lo
   lega alla colonna dell'applicazione. Sostituisce il numero nel margine come segnale
   primario — quello resta, ma diventa una nota. */
h2.sezione::before {
  content: "";
  display: block;
  width: 14mm;
  border-top: 1.6pt solid var(--oliva);
  margin-bottom: 2.5mm;
}
`;
