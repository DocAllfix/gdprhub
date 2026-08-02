import type { AdempimentoRisolto } from "./types";
import { conformitaEffettiva, criticiAperti, daPresidiare } from "./compliance";
import { rischioPesato, rischioPesatoMassimo } from "./risk";

// Indice di esposizione 0-100.
//
// Sostituisce la cifra in euro come metrica sempre visibile. Nel prototipo GDPR
// l'esposizione era `ritardi × 12.500 + critici × 22.000 + rischio × 850`: coefficienti
// senza alcuna fonte, presentati come stima di sanzione in un documento diretto al CdA.
//
// Qui la cifra in euro esiste ancora, ma sta in `sanction/`, si calcola solo se il
// consulente inserisce i parametri richiesti dalla metodologia, e stampa le proprie
// assunzioni. L'indice invece è sempre disponibile perché **non pretende di essere denaro**:
// è una misura relativa di quanto rischio resta scoperto.
//
// Regola di progetto: l'indice restituisce sempre le proprie componenti. Un numero che
// non sa spiegarsi non è difendibile davanti a nessuno.

export type Esposizione = {
  /** 0-100. Più alto, più rischio resta scoperto. */
  readonly indice: number;
  readonly giudizio: "Contenuta" | "Moderata" | "Elevata" | "Critica";
  readonly componenti: {
    /** 0-1: quota di rischio pesato non ancora presidiata. */
    readonly rischioScoperto: number;
    /** 0-1: quanto pesano le scadenze già mancate. */
    readonly ritardo: number;
    /** 0-1: quota di adempimenti critici che richiedono un intervento. */
    readonly criticita: number;
  };
  /** I numeri grezzi da cui discende, per la relazione. */
  readonly dettaglio: {
    readonly rischioPesatoScoperto: number;
    readonly rischioPesatoTotale: number;
    readonly scadute: number;
    readonly daPresidiare: number;
    readonly applicabili: number;
    readonly criticiDaPresidiare: number;
  };
};

/** Pesi delle tre componenti. Espliciti e sommano a 1: nessun coefficiente nascosto. */
export const PESI = { rischioScoperto: 0.55, ritardo: 0.25, criticita: 0.2 } as const;

const arrotonda2 = (n: number) => Math.round(n * 100) / 100;

export function esposizione(adempimenti: readonly AdempimentoRisolto[]): Esposizione {
  const applicabili = adempimenti.filter((a) => a.stato !== "Non applicabile");
  const aperti = daPresidiare(adempimenti);
  const scadute = applicabili.filter((a) => a.statoScadenza === "Scaduta").length;
  const critici = criticiAperti(adempimenti).length;
  const criticiTotali = applicabili.filter((a) => a.priorita === "Critica").length;

  const pesoScoperto = rischioPesato(adempimenti);
  const pesoTotale = rischioPesatoMassimo(adempimenti);

  // Ogni componente è una quota fra 0 e 1: nessuna può sfondare da sola l'indice.
  const rischioScoperto = pesoTotale === 0 ? 0 : pesoScoperto / pesoTotale;
  const ritardo = applicabili.length === 0 ? 0 : scadute / applicabili.length;
  const criticita = criticiTotali === 0 ? 0 : critici / criticiTotali;

  const indice = Math.round(
    100 * (PESI.rischioScoperto * rischioScoperto + PESI.ritardo * ritardo + PESI.criticita * criticita),
  );

  return {
    indice,
    giudizio: giudizioDi(indice),
    componenti: {
      rischioScoperto: arrotonda2(rischioScoperto),
      ritardo: arrotonda2(ritardo),
      criticita: arrotonda2(criticita),
    },
    dettaglio: {
      rischioPesatoScoperto: pesoScoperto,
      rischioPesatoTotale: pesoTotale,
      scadute,
      daPresidiare: aperti.length,
      applicabili: applicabili.length,
      criticiDaPresidiare: critici,
    },
  };
}

function giudizioDi(indice: number): Esposizione["giudizio"] {
  if (indice < 25) return "Contenuta";
  if (indice < 50) return "Moderata";
  if (indice < 75) return "Elevata";
  return "Critica";
}

// --- Prontezza ispettiva -----------------------------------------------------------------

export type Prontezza = {
  /** 0-100: quanto si regge a un controllo domani mattina. */
  readonly indice: number;
  readonly componenti: {
    /** 0-1: conformità effettiva, cioè fatto E aggiornato. */
    readonly conformita: number;
    /** 0-1: quota di presidi chiave in ordine. */
    readonly presidiChiave: number;
    /** 0-1: assenza di scadenze mancate. */
    readonly puntualita: number;
  };
  /** I presidi chiave che oggi non reggerebbero. */
  readonly presidiScoperti: readonly string[];
};

/**
 * Prontezza a un'ispezione.
 *
 * Nel prototipo era `max(20, 100 − ritardi×8 − (100−compliance)/2)`: sul suo stesso dataset
 * la formula dava −8 e il risultato veniva schiacciato sul pavimento di 20, cioè il numero
 * mostrato non aveva più alcun rapporto con i dati. Qui le componenti sono quote fra 0 e 1
 * e il risultato non ha bisogno di essere tosato.
 *
 * `codiciChiave` sono gli adempimenti che un ispettore chiede per primi: li decide il
 * dominio, non il motore.
 */
export function prontezza(
  adempimenti: readonly AdempimentoRisolto[],
  codiciChiave: readonly string[],
): Prontezza {
  const applicabili = adempimenti.filter((a) => a.stato !== "Non applicabile");
  const q = conformitaEffettiva(adempimenti);
  const conformita = (q.percentuale ?? 0) / 100;

  const chiave = applicabili.filter((a) => codiciChiave.includes(a.codice));
  const chiaveInOrdine = chiave.filter((a) => a.stato === "Completata" && a.statoScadenza !== "Scaduta");
  const presidiChiave = chiave.length === 0 ? conformita : chiaveInOrdine.length / chiave.length;

  const scadute = applicabili.filter((a) => a.statoScadenza === "Scaduta").length;
  const puntualita = applicabili.length === 0 ? 1 : 1 - scadute / applicabili.length;

  const indice = Math.round(100 * (0.4 * conformita + 0.4 * presidiChiave + 0.2 * puntualita));

  return {
    indice,
    componenti: {
      conformita: arrotonda2(conformita),
      presidiChiave: arrotonda2(presidiChiave),
      puntualita: arrotonda2(puntualita),
    },
    presidiScoperti: chiave.filter((a) => !chiaveInOrdine.includes(a)).map((a) => a.codice),
  };
}
