import type { Adempimento, AdempimentoRisolto, Periodicita, StatoScadenza } from "./types";
import { type DataISO, dataDiCalendario, giorniTra, piuMesi } from "./deadlines";

// Ricorrenza: da «ultima esecuzione + periodicità» alla scadenza.
//
// È la semantica del prototipo 81/08, l'unico dei tre che modellasse davvero la ricorrenza,
// estesa a tutti i domini. Nel GDPR il campo `frequenza` esisteva e non produceva nulla;
// nel 231 le scadenze erano date assolute scritte a mano, che invecchiavano da sole.
//
// Regola: la scadenza NON si persiste quando è derivabile. Si persiste solo dove non c'è
// nulla da derivare, cioè per gli adempimenti a evento e una tantum.

/** Giorni entro i quali una scadenza si considera imminente. */
export const FINESTRA_IMMINENZA_GIORNI = 30;

/**
 * Calcola la scadenza di un adempimento.
 *
 * - periodica  → ultima esecuzione + N mesi. Mai eseguito ⇒ nessuna scadenza: prima va programmato
 * - evento     → la scadenza esplicita, se c'è
 * - una tantum → la scadenza esplicita se c'è, altrimenti nessuna
 * - continua   → nessuna scadenza per definizione: è un presidio permanente
 */
export function scadenzaDi(
  a: Pick<Adempimento, "periodicita" | "ultimaEsecuzione" | "scadenzaEsplicita">,
): DataISO | null {
  switch (a.periodicita.tipo) {
    case "periodica":
      return a.ultimaEsecuzione ? piuMesi(a.ultimaEsecuzione, a.periodicita.mesi) : null;
    case "evento":
    case "una_tantum":
      return a.scadenzaEsplicita;
    case "continua":
      return null;
  }
}

/**
 * Classifica una scadenza rispetto a oggi.
 *
 * «Da programmare» non è un ripiego: dice una cosa precisa e diversa dalle altre tre, cioè
 * che l'adempimento non ha mai avuto un'esecuzione da cui far partire il conteggio. Un
 * registro mai redatto e un registro redatto tre anni fa sono problemi diversi, e la
 * relazione deve poterli distinguere.
 */
export function classificaScadenza(
  scadenza: DataISO | null,
  oggi: DataISO,
  finestraGiorni: number = FINESTRA_IMMINENZA_GIORNI,
): StatoScadenza {
  if (!scadenza) return "Da programmare";
  const giorni = giorniTra(oggi, scadenza);
  if (giorni < 0) return "Scaduta";
  if (giorni <= finestraGiorni) return "In scadenza";
  return "Regolare";
}

/**
 * Risolve un adempimento: gli attacca scadenza, stato di scadenza e giorni residui.
 *
 * I due stati restano ortogonali. Un adempimento «Completata» con l'ultima esecuzione
 * troppo vecchia risulta «Completata» e «Scaduta» insieme, ed è corretto così: il lavoro
 * fu fatto, il ciclo è scaduto.
 *
 * Unica eccezione: chi è «Non applicabile» non ha scadenze da rispettare, perché quel
 * presidio è stato motivatamente escluso.
 */
export function risolvi(
  a: Adempimento,
  oggi: DataISO,
  finestraGiorni: number = FINESTRA_IMMINENZA_GIORNI,
): AdempimentoRisolto {
  if (a.stato === "Non applicabile") {
    return { ...a, scadenza: null, statoScadenza: "Da programmare", giorniAllaScadenza: null };
  }
  const scadenza = scadenzaDi(a);
  return {
    ...a,
    scadenza,
    statoScadenza: classificaScadenza(scadenza, oggi, finestraGiorni),
    giorniAllaScadenza: scadenza ? giorniTra(oggi, scadenza) : null,
  };
}

export function risolviTutti(
  adempimenti: readonly Adempimento[],
  oggi: DataISO,
  finestraGiorni: number = FINESTRA_IMMINENZA_GIORNI,
): readonly AdempimentoRisolto[] {
  return adempimenti.map((a) => risolvi(a, oggi, finestraGiorni));
}

/**
 * La prossima scadenza dopo aver eseguito l'adempimento oggi.
 * Serve all'interfaccia per mostrare l'effetto del gesto prima che l'utente lo compia.
 */
export function prossimaScadenzaSeEseguitoOggi(periodicita: Periodicita, oggi: DataISO): DataISO | null {
  return periodicita.tipo === "periodica" ? piuMesi(oggi, periodicita.mesi) : null;
}

/** Descrizione leggibile della periodicità, per interfaccia e relazioni. */
export function descriviPeriodicita(p: Periodicita): string {
  switch (p.tipo) {
    case "periodica":
      if (p.mesi === 1) return "Mensile";
      if (p.mesi === 3) return "Trimestrale";
      if (p.mesi === 6) return "Semestrale";
      if (p.mesi === 12) return "Annuale";
      if (p.mesi === 24) return "Biennale";
      if (p.mesi % 12 === 0) return `Ogni ${p.mesi / 12} anni`;
      return `Ogni ${p.mesi} mesi`;
    case "continua":
      return "Continuo";
    case "evento":
      return "Al verificarsi";
    case "una_tantum":
      return "Una tantum";
  }
}

/** Rende esplicito che il motore non legge mai l'orologio: `oggi` arriva da fuori. */
export function oggiA(fuso?: string): DataISO {
  return dataDiCalendario(new Date(), fuso);
}
