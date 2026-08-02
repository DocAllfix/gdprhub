import { STILE_DOCUMENTO } from "./stile";

// Impaginazione del documento. La decisione portante: le pagine le calcoliamo noi.
//
// Il browser sa spezzare un flusso, ma non sa che un'intestazione di categoria da sola in
// fondo alla pagina è un difetto, né sa scrivere «Pagina 3 di 12». Su un atto che si
// consegna a un'autorità la numerazione è una garanzia di integrità: se non si può dire
// quante pagine sono, non si può dimostrare che non ne manca una.
//
// Il costo è che la capienza di una pagina va dichiarata, non scoperta. È un costo che si
// paga una volta e si verifica con un test: se una pagina trabocca, `overflow: hidden` la
// taglierebbe in silenzio, quindi il cancello dei prototipi conta le pagine attese.

export function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export type Testatina = {
  /** A sinistra: che atto è. */
  readonly sinistra: string;
  /** A destra: di chi parla. */
  readonly destra: string;
};

export type Piede = {
  readonly sinistra: string;
};

/** Una pagina già impaginata: contenuto pronto, numero assegnato alla fine. */
export type Pagina = {
  readonly corpo: string;
  /** La copertina non porta testatina né numero. */
  readonly nuda?: boolean;
  /**
   * Pagina deliberatamente vuota per metà: un verbale con lo spazio per le annotazioni
   * a mano. Il cancello non la conta come pagina mal riempita.
   */
  readonly aerata?: boolean;
};

// --- Stima del costo di una riga -------------------------------------------------------
//
// Impaginare noi significa dichiarare quanto occupa una riga. Il primo tentativo usava una
// soglia di caratteri a occhio, e sbagliava di brutto: lo scadenzario riempiva il 62% della
// pagina e l'assessment il 75%. Ora la stima parte dalla larghezza reale della colonna.
//
// I due numeri sotto sono misurati sul rendering, non ipotizzati, e il cancello dei
// prototipi boccia se una pagina scende sotto la soglia di riempimento: se cambiano il
// corpo del testo o la geometria, la calibrazione fallisce invece di degradare in silenzio.

/** Larghezza media di un carattere di IBM Plex Sans a 8pt, in millimetri. */
export const MM_PER_CARATTERE = 1.05;

/** Righe che un testo occupa in una colonna larga `larghezzaMm`. */
export function righeStimate(testo: string, larghezzaMm: number): number {
  return Math.max(1, Math.ceil(testo.length / (larghezzaMm / MM_PER_CARATTERE)));
}

/**
 * Costo di una riga di tabella, in unità «riga a una linea».
 * Una linea in più non ripaga i margini: aggiunge solo la propria interlinea.
 */
export function costoRighe(righe: number): number {
  return 1 + 0.55 * (righe - 1);
}

/** Costo di un'intestazione di categoria dentro la tabella. */
export const COSTO_CATEGORIA = 1.5;

export type Documento = {
  readonly titolo: string;
  readonly testatina: Testatina;
  readonly piede: Piede;
  readonly pagine: readonly Pagina[];
};

/** Compone il documento in un HTML autonomo: font incorporati, nessuna risorsa remota. */
export function componi(doc: Documento): string {
  const totale = doc.pagine.length;
  const fogli = doc.pagine
    .map((p, i) => {
      if (p.nuda) return `<section class="pagina">${p.corpo}</section>`;
      return `<section class="pagina${p.aerata ? " pagina-aerata" : ""}">
  <div class="testatina"><span>${esc(doc.testatina.sinistra)}</span><span>${esc(doc.testatina.destra)}</span></div>
  ${p.corpo}
  <div class="piede"><span>${esc(doc.piede.sinistra)}</span><span>Pagina ${i + 1} di ${totale}</span></div>
</section>`;
    })
    .join("\n");

  return `<!doctype html>
<html lang="it"><head><meta charset="utf-8"><title>${esc(doc.titolo)}</title>
<style>${STILE_DOCUMENTO}</style></head>
<body>${fogli}</body></html>`;
}

/**
 * Distribuisce righe su più pagine a capienza dichiarata, senza mai lasciare orfana
 * l'intestazione di una categoria.
 *
 * Il costo in righe non è uniforme: un'intestazione di categoria occupa più di una riga
 * di tabella. Si dichiara, non si indovina.
 */
export function distribuisci<T>(
  voci: readonly T[],
  costo: (voce: T) => number,
  capienzaPrima: number,
  capienzaSeguenti: number,
  /** Un elemento non può restare da solo in fondo: serve almeno un seguito. */
  trascinaSe?: (voce: T) => boolean,
): T[][] {
  const pagine: T[][] = [];
  let corrente: T[] = [];
  let usato = 0;
  let capienza = capienzaPrima;

  const chiudi = () => {
    // Un'intestazione di categoria rimasta in coda scende alla pagina dopo.
    if (trascinaSe) {
      while (corrente.length > 0 && trascinaSe(corrente[corrente.length - 1]!)) {
        corrente.pop();
      }
    }
    pagine.push(corrente);
    corrente = [];
    usato = 0;
    capienza = capienzaSeguenti;
  };

  let i = 0;
  while (i < voci.length) {
    const voce = voci[i]!;
    const c = costo(voce);
    if (usato + c > capienza && corrente.length > 0) {
      const quante = corrente.length;
      chiudi();
      // `chiudi` può aver restituito righe alla coda: si riparte da lì.
      i -= quante - pagine[pagine.length - 1]!.length;
      continue;
    }
    corrente.push(voce);
    usato += c;
    i += 1;
  }
  if (corrente.length > 0) pagine.push(corrente);
  return pagine;
}
