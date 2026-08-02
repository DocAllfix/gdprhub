import type { AdempimentoRisolto } from "./types";
import { type DataISO } from "./deadlines";
import { risolvi } from "./recurrence";
import { conformitaEffettiva } from "./compliance";
import { esposizione, type Esposizione } from "./exposure";
import { rischioPesatoDi } from "./risk";
import { daPresidiare } from "./compliance";

// Simulatore what-if: «se chiudo questi tre, dove arrivo?»
//
// Trasforma il piano di rimedio da elenco statico a strumento di negoziazione del budget:
// il consulente mostra al CdA quanto costa l'inazione e quanto rende ogni intervento.
//
// Vincolo assoluto: NON scrive nulla. Riceve gli adempimenti, ne produce una copia
// modificata e calcola su quella. Un test verifica che l'insieme di partenza resti intatto.

export type EsitoSimulazione = {
  readonly prima: { readonly conformita: number | null; readonly esposizione: Esposizione };
  readonly dopo: { readonly conformita: number | null; readonly esposizione: Esposizione };
  readonly delta: {
    /** Punti percentuali guadagnati di conformità effettiva. */
    readonly conformita: number;
    /** Punti di esposizione tolti. Positivo = miglioramento. */
    readonly esposizione: number;
  };
  readonly chiusi: readonly string[];
  /** Codici richiesti che non esistono nell'insieme: si segnalano, non si ignorano. */
  readonly ignorati: readonly string[];
};

/**
 * Simula la chiusura di un insieme di adempimenti alla data indicata.
 * «Chiudere» significa: stato Completata e ultima esecuzione oggi, quindi anche la
 * scadenza si sposta in avanti secondo la periodicità.
 */
export function simulaChiusura(
  adempimenti: readonly AdempimentoRisolto[],
  codiciDaChiudere: readonly string[],
  oggi: DataISO,
): EsitoSimulazione {
  const presenti = new Set(adempimenti.map((a) => a.codice));
  const daChiudere = new Set(codiciDaChiudere.filter((c) => presenti.has(c)));
  const ignorati = codiciDaChiudere.filter((c) => !presenti.has(c));

  const dopo = adempimenti.map((a) =>
    daChiudere.has(a.codice) ? risolvi({ ...a, stato: "Completata", ultimaEsecuzione: oggi }, oggi) : a,
  );

  const cPrima = conformitaEffettiva(adempimenti).percentuale;
  const cDopo = conformitaEffettiva(dopo).percentuale;
  const ePrima = esposizione(adempimenti);
  const eDopo = esposizione(dopo);

  return {
    prima: { conformita: cPrima, esposizione: ePrima },
    dopo: { conformita: cDopo, esposizione: eDopo },
    delta: {
      conformita: (cDopo ?? 0) - (cPrima ?? 0),
      esposizione: ePrima.indice - eDopo.indice,
    },
    chiusi: [...daChiudere],
    ignorati,
  };
}

export type Suggerimento = {
  readonly codice: string;
  /** Punti di esposizione che si tolgono chiudendo questo solo adempimento. */
  readonly guadagno: number;
  readonly rischioPesato: number;
};

/**
 * Quali adempimenti conviene chiudere per primi.
 *
 * Ordina per rischio pesato, che è il criterio con cui l'esposizione è costruita, e misura
 * il guadagno effettivo di ciascuno simulandolo davvero: così il numero mostrato al cliente
 * non è una stima a parte, è lo stesso motore.
 */
export function suggerisciPriorita(
  adempimenti: readonly AdempimentoRisolto[],
  oggi: DataISO,
  quanti = 8,
): readonly Suggerimento[] {
  return [...daPresidiare(adempimenti)]
    .sort((a, b) => rischioPesatoDi(b) - rischioPesatoDi(a))
    .slice(0, quanti)
    .map((a) => ({
      codice: a.codice,
      guadagno: simulaChiusura(adempimenti, [a.codice], oggi).delta.esposizione,
      rischioPesato: Math.round(rischioPesatoDi(a) * 10) / 10,
    }));
}
