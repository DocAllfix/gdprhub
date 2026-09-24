import {
  CATALOGHI,
  CLIENTI_DIMOSTRATIVI,
  DOMINI,
  ETICHETTE_DOMINIO,
  STATI_LAVORO,
  agenda,
  costruisciDemo,
  descriviPeriodicita,
  lettoDa,
  oggiA,
  risolviTutti,
  templatePerCodice,
  type AdempimentoRisolto,
  type Dominio,
  type StatoLavoro,
  type StatoScadenza,
} from "@gdpr/engine";

// OGNI NUMERO DELLA LANDING NASCE QUI, DAL MOTORE. Nessuno è scritto a mano.
//
// Il motivo è misurato: sul riferimento (evalisdeck.it) i contatori partono da `useState(0)`, e
// l'HTML servito contiene letteralmente «0 documenti pubblicabili». GPTBot, ClaudeBot,
// PerplexityBot e le anteprime dei link non eseguono JavaScript: leggono zeri. Qui i numeri
// arrivano già al valore finale, e sono quelli del catalogo vero — se il catalogo cresce, la
// landing lo sa alla build successiva senza che nessuno se ne ricordi.
//
// I dati della demo sono RELATIVI A OGGI: «−52gg» ha senso solo accanto alla data di oggi.
// Per questo la pagina si rigenera ogni giorno (`revalidate` in `page.tsx`): resta statica, e
// resta vera.

const OGGI = oggiA();

const risolti = (d: Dominio): readonly AdempimentoRisolto[] =>
  risolviTutti(costruisciDemo(CATALOGHI[d], CLIENTI_DIMOSTRATIVI[d], OGGI), OGGI);

const TUTTI = DOMINI.flatMap(risolti);

export type Riga = {
  readonly codice: string;
  readonly titolo: string;
  readonly dominio: Dominio;
  readonly stato: StatoLavoro;
  readonly statoScadenza: StatoScadenza;
  readonly scadenza: string | null;
  readonly giorni: number | null;
};

const riga = (a: AdempimentoRisolto): Riga => ({
  codice: a.codice,
  titolo: templatePerCodice(a.dominio, a.codice)?.titolo ?? a.codice,
  dominio: a.dominio,
  stato: a.stato,
  statoScadenza: a.statoScadenza,
  scadenza: a.scadenza,
  giorni: a.giorniAllaScadenza,
});

/** Più scaduto prima; chi non ha una scadenza, in fondo. */
const perUrgenza = (x: Riga, y: Riga) => (x.giorni ?? Infinity) - (y.giorni ?? Infinity);

// --- I numeri --------------------------------------------------------------------------

export const PER_DOMINIO = DOMINI.map((d) => ({
  dominio: d,
  etichetta: ETICHETTE_DOMINIO[d],
  quanti: CATALOGHI[d].length,
}));

export const TOTALE = PER_DOMINIO.reduce((somma, x) => somma + x.quanti, 0);

// --- La matrice dei due assi ------------------------------------------------------------

/** Le colonne in ordine di gravità, non nell'ordine del motore. */
export const SCADENZE: readonly StatoScadenza[] = ["Scaduta", "In scadenza", "Regolare", "Da programmare"];
export const LAVORI: readonly StatoLavoro[] = STATI_LAVORO;

export type Cella = {
  readonly id: string;
  readonly lavoro: StatoLavoro;
  readonly scadenza: StatoScadenza;
  readonly quanti: number;
  readonly righe: readonly Riga[];
};

export const MATRICE: readonly (readonly Cella[])[] = LAVORI.map((lavoro, i) =>
  SCADENZE.map((scadenza, j) => {
    const tutte = TUTTI.filter((a) => a.stato === lavoro && a.statoScadenza === scadenza).map(riga);
    return { id: `${i}-${j}`, lavoro, scadenza, quanti: tutte.length, righe: [...tutte].sort(perUrgenza).slice(0, 3) };
  }),
);

/** La cella che la pagina apre da sola: il caso che il prodotto esiste per mostrare. */
export const CELLA_PREDEFINITA = MATRICE[LAVORI.indexOf("Completata")]![SCADENZE.indexOf("Scaduta")]!;

// --- L'estratto dell'eroe ---------------------------------------------------------------

/**
 * Sei righe vere, scelte per mostrare le combinazioni che contano — prima di tutto «Completata
 * e Scaduta», due volte, perché è la tesi. Scelta deterministica: stessa build, stesse righe.
 */
const VOLUTE: readonly (readonly [StatoLavoro, StatoScadenza])[] = [
  ["Completata", "Scaduta"],
  ["In corso", "In scadenza"],
  ["Completata", "Scaduta"],
  ["Da fare", "Scaduta"],
  ["Completata", "Regolare"],
  ["Da fare", "Da programmare"],
];

export const ESTRATTO: readonly Riga[] = (() => {
  const prese = new Set<string>();
  const out: Riga[] = [];
  for (const [lavoro, scadenza] of VOLUTE) {
    const cand = TUTTI.filter(
      (a) => a.stato === lavoro && a.statoScadenza === scadenza && !prese.has(`${a.dominio}:${a.codice}`),
    )
      .map(riga)
      .sort(perUrgenza)[0];
    if (cand) {
      prese.add(`${cand.dominio}:${cand.codice}`);
      out.push(cand);
    }
  }
  return out;
})();

// --- La lettura incrociata --------------------------------------------------------------

/** Un adempimento dell'81/08 che alimenta gli altri moduli, con i codici che lo leggono. */
export const INCROCIO = (() => {
  // Uno CON una scadenza: il primo trovato era il DVR, presidio continuo senza data, e come
  // esempio di lettura incrociata mostrava un «—» al posto della cosa che conta.
  const letti = risolti("d81").filter((x) => lettoDa("d81", x.codice).length > 0);
  const a = letti.find((x) => x.scadenza !== null) ?? letti[0];
  if (!a) return null;
  return {
    ...riga(a),
    usi: lettoDa("d81", a.codice).map((u) => ({
      dominio: u.a.dominio,
      codice: u.a.codice,
      titolo: templatePerCodice(u.a.dominio, u.a.codice)?.titolo ?? u.a.codice,
    })),
  };
})();

// --- Gli esempi dei tre passi -----------------------------------------------------------

// A CADENZA FISSA, non a evento. Il primo trovato era «T02 · Al verificarsi», cioè proprio il tipo
// di adempimento che NON si calcola da una periodicità: come esempio di «la scadenza si calcola
// dalla periodicità» diceva il contrario.
const conPeriodicita = TUTTI.find(
  (a) => a.dominio === "gdpr" && a.scadenza !== null && !/verificars/i.test(descriviPeriodicita(a.periodicita)),
);

export const ESEMPIO_ASSESSMENT = conPeriodicita
  ? { ...riga(conPeriodicita), periodicita: descriviPeriodicita(conPeriodicita.periodicita) }
  : null;

export const ENTRO_90 = agenda(TUTTI).filter(
  (a) => a.giorniAllaScadenza !== null && a.giorniAllaScadenza >= 0 && a.giorniAllaScadenza <= 90,
).length;

/** Tre codici veri per decreto, per la sezione «Tre decreti». */
export const CAMPIONI: Readonly<Record<Dominio, readonly { codice: string; titolo: string }[]>> =
  Object.fromEntries(
    DOMINI.map((d) => [d, CATALOGHI[d].slice(0, 3).map((t) => ({ codice: t.codice, titolo: t.titolo }))]),
  ) as Record<Dominio, { codice: string; titolo: string }[]>;

// --- Il mazzo dell'eroe -----------------------------------------------------------------

/** L'adempimento «Completata e Scaduta» più scaduto: la tesi del prodotto, come oggetto singolo. */
export const TESI: Riga | null = ESTRATTO.find((r) => r.stato === "Completata" && r.statoScadenza === "Scaduta") ?? null;

/**
 * Le prossime scadenze, UNA PER DECRETO, dalla più vicina.
 *
 * La prima versione prendeva le tre più vicine in assoluto, ed erano tre adempimenti 231 tutti
 * in scadenza oggi: la carta diceva «24/09/2026 oggi» tre volte, sembrava un errore, e non
 * rispondeva alla domanda che conta — per quale decreto. Il titolo dice «prossime» e non
 * «questa settimana» perché l'81/08, nell'azienda d'esempio, scade più in là.
 */
export const SETTIMANA = (() => {
  const future = agenda(TUTTI)
    .filter((a) => a.giorniAllaScadenza !== null && a.giorniAllaScadenza >= 0)
    .map(riga)
    .sort(perUrgenza);
  const righe = DOMINI.map((d) => future.find((r) => r.dominio === d))
    .filter((r): r is Riga => r !== undefined)
    .sort(perUrgenza);
  return { titolo: "Prossime scadenze · una per decreto", righe };
})();

export const ADEMPIMENTI_GDPR = CATALOGHI.gdpr.length;
export const OGGI_ISO = OGGI;

// --- La mappa del catalogo ---------------------------------------------------------------

/**
 * Il catalogo reso visibile: una casella per adempimento, per decreto, in ordine di catalogo.
 *
 * Sostituisce la fascia «numero grande, etichetta piccola», che è lo stampo più riconoscibile
 * delle landing generate. Qui 171 non è una cifra da leggere: sono 171 caselle da vedere. E le
 * caselle «completate e scadute» dell'azienda d'esempio sono segnate: la quantità porta alla tesi.
 */
export const MAPPA = DOMINI.map((d) => ({
  dominio: d,
  etichetta: ETICHETTE_DOMINIO[d],
  celle: risolti(d).map((a) => ({
    codice: a.codice,
    tesi: a.stato === "Completata" && a.statoScadenza === "Scaduta",
  })),
}));

export const QUANTE_TESI = MAPPA.reduce((somma, m) => somma + m.celle.filter((c) => c.tesi).length, 0);
