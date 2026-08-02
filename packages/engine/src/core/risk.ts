import type { AdempimentoRisolto, Priorita } from "./types";
import { PRIORITA } from "./types";
import { daPresidiare } from "./compliance";

// Rischio: quanto pesa ciò che non è presidiato.
//
// Due correzioni rispetto ai prototipi:
//
// 1. Solo il catalogo GDPR esprime un rischio numerico. Nel 231 e nell'81/08 il campo non
//    esiste, e trattarlo come zero renderebbe quei domini artificialmente innocui. Qui, in
//    mancanza del dato, il rischio si deduce dalla priorità dichiarata.
//
// 2. La matrice del prototipo GDPR era decorativa: l'intensità del colore era
//    `(riga+colonna)/6`, cioè dipendeva dalla POSIZIONE e non dai dati. La colonna 4 era
//    strutturalmente sempre vuota (i pesi di priorità arrivavano a 3) e la riga 0 pure
//    (il rischio minimo nel catalogo è 4). Restava una griglia 3×3 utile su 16 celle.

/** Quanto una priorità amplifica il rischio intrinseco. */
export const PESO_PRIORITA: Readonly<Record<Priorita, number>> = {
  Critica: 1.5,
  Alta: 1.2,
  Media: 1.0,
  Bassa: 0.8,
};

/** Rischio dedotto dalla priorità, per i domini che non lo dichiarano. */
const RISCHIO_DA_PRIORITA: Readonly<Record<Priorita, number>> = {
  Critica: 9,
  Alta: 7,
  Media: 5,
  Bassa: 3,
};

/** Il rischio 1-10 di un adempimento: quello dichiarato, o quello dedotto dalla priorità. */
export function rischioEffettivo(a: Pick<AdempimentoRisolto, "rischio" | "priorita">): number {
  return a.rischio ?? RISCHIO_DA_PRIORITA[a.priorita];
}

/** Rischio di un singolo adempimento, amplificato dalla priorità. */
export function rischioPesatoDi(a: Pick<AdempimentoRisolto, "rischio" | "priorita">): number {
  return rischioEffettivo(a) * PESO_PRIORITA[a.priorita];
}

/**
 * Rischio pesato di un insieme: la somma su ciò che richiede un intervento.
 * Quello che è fatto e aggiornato non pesa: è presidiato.
 */
export function rischioPesato(adempimenti: readonly AdempimentoRisolto[]): number {
  return arrotonda(daPresidiare(adempimenti).reduce((tot, a) => tot + rischioPesatoDi(a), 0));
}

/** Rischio pesato che l'insieme avrebbe se nulla fosse presidiato: è il denominatore. */
export function rischioPesatoMassimo(adempimenti: readonly AdempimentoRisolto[]): number {
  return arrotonda(
    adempimenti.filter((a) => a.stato !== "Non applicabile").reduce((tot, a) => tot + rischioPesatoDi(a), 0),
  );
}

const arrotonda = (n: number) => Math.round(n * 10) / 10;

// --- Matrice rischio × priorità ----------------------------------------------------------

/** Fasce di rischio intrinseco, tutte raggiungibili dai dati reali dei tre cataloghi. */
export const FASCE_RISCHIO = [
  { etichetta: "Basso", da: 1, a: 3 },
  { etichetta: "Moderato", da: 4, a: 6 },
  { etichetta: "Alto", da: 7, a: 8 },
  { etichetta: "Critico", da: 9, a: 10 },
] as const;

export type CellaMatrice = {
  readonly fascia: string;
  readonly priorita: Priorita;
  readonly quanti: number;
  /** Rischio pesato accumulato nella cella: è ciò che ne determina l'intensità. */
  readonly peso: number;
  /** 0-1, rapportato alla cella più carica. Zero se la matrice è vuota. */
  readonly intensita: number;
  readonly codici: readonly string[];
};

/**
 * Matrice 4×4 con assi reali e intensità presa dai dati.
 *
 * Righe: fasce di rischio intrinseco. Colonne: priorità dichiarata. Ogni cella è
 * raggiungibile, e l'intensità è il peso della cella rapportato alla più carica, non la
 * sua posizione nella griglia.
 *
 * Nota per la relazione: NON è una matrice probabilità × impatto. I dati non contengono
 * una stima di probabilità, e presentarla come tale sarebbe inventare un asse.
 */
export function matriceRischio(adempimenti: readonly AdempimentoRisolto[]): readonly CellaMatrice[] {
  const daVedere = daPresidiare(adempimenti);
  const celle: CellaMatrice[] = [];

  for (const fascia of FASCE_RISCHIO) {
    for (const priorita of PRIORITA) {
      const dentro = daVedere.filter((a) => {
        const r = rischioEffettivo(a);
        return a.priorita === priorita && r >= fascia.da && r <= fascia.a;
      });
      celle.push({
        fascia: fascia.etichetta,
        priorita,
        quanti: dentro.length,
        peso: arrotonda(dentro.reduce((t, a) => t + rischioPesatoDi(a), 0)),
        intensita: 0,
        codici: dentro.map((a) => a.codice),
      });
    }
  }

  // L'intensità è un rapporto 0-1 che pilota l'opacità: serve più precisione del peso,
  // altrimenti una cella poco carica ma non vuota si arrotonda a zero e sparisce.
  const massimo = Math.max(...celle.map((c) => c.peso), 0);
  return celle.map((c) => ({
    ...c,
    intensita: massimo === 0 ? 0 : Math.round((c.peso / massimo) * 1000) / 1000,
  }));
}
