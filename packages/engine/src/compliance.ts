import type { Controllo, Ruolo, Stato } from "./types";
import { RUOLI } from "./types";

// Grado di conformità.
//
// Due scelte che cambiano i numeri rispetto al prototipo, entrambe volute:
//
// 1. I controlli NON APPLICABILI escono dal denominatore. Se un'azienda non fa
//    videosorveglianza, il controllo sulla DPIA per videosorveglianza non deve pesare
//    come un adempimento mancato: nel prototipo non era possibile escluderlo, e ogni
//    percentuale ne risultava falsata verso il basso.
//
// 2. Con zero controlli applicabili la percentuale è `null`, non 100. Un 100% su un
//    assessment vuoto è esattamente il genere di numero che finisce in una relazione
//    per il CdA senza che nessuno lo abbia guardato.

export type Conformita = {
  /** Percentuale 0-100, oppure null se non c'è nulla di applicabile su cui misurarsi. */
  readonly percentuale: number | null;
  readonly completati: number;
  /** Denominatore: i controlli che contano, cioè tutti tranne i non applicabili. */
  readonly applicabili: number;
  readonly nonApplicabili: number;
};

function èApplicabile(c: Pick<Controllo, "stato">): boolean {
  return c.stato !== "Non applicabile";
}

export function conformita(controlli: readonly Controllo[]): Conformita {
  const applicabili = controlli.filter(èApplicabile);
  const completati = applicabili.filter((c) => c.stato === "Completata").length;

  return {
    percentuale: applicabili.length === 0 ? null : Math.round((completati / applicabili.length) * 100),
    completati,
    applicabili: applicabili.length,
    nonApplicabili: controlli.length - applicabili.length,
  };
}

export function conformitaPerRuolo(controlli: readonly Controllo[], ruolo: Ruolo): Conformita {
  return conformita(controlli.filter((c) => c.ruolo === ruolo));
}

export type ConformitaPerRuolo = Readonly<Record<Ruolo, Conformita>>;

export function conformitaPerTuttiIRuoli(controlli: readonly Controllo[]): ConformitaPerRuolo {
  return Object.fromEntries(RUOLI.map((r) => [r, conformitaPerRuolo(controlli, r)])) as ConformitaPerRuolo;
}

/**
 * Quanti controlli per stato.
 *
 * Gli stati sono quattro e si escludono a vicenda, quindi la somma fa sempre il totale.
 * Il ritardo NON compare qui: è un derivato della scadenza e vive in `deadlines.ts`.
 * Nel prototipo "In ritardo" stava insieme agli altri stati e un controllo scaduto veniva
 * contato due volte, sia fra i "Da fare" sia fra i ritardi (difetto F4).
 */
export function conteggioPerStato(controlli: readonly Controllo[]): Readonly<Record<Stato, number>> {
  const conteggio: Record<Stato, number> = {
    "Da fare": 0,
    "In corso": 0,
    Completata: 0,
    "Non applicabile": 0,
  };
  for (const c of controlli) conteggio[c.stato]++;
  return conteggio;
}

/** Controlli su cui c'è ancora lavoro da fare. */
export function aperti(controlli: readonly Controllo[]): readonly Controllo[] {
  return controlli.filter((c) => c.stato !== "Completata" && c.stato !== "Non applicabile");
}

/** Aperti di priorità Critica: sono quelli che aprono un'ispezione, non quelli che la chiudono. */
export function criticiAperti(controlli: readonly Controllo[]): readonly Controllo[] {
  return aperti(controlli).filter((c) => c.priorita === "Critica");
}

/**
 * Un controllo escluso deve dire perché.
 * Il motore non può leggere il database, quindi si limita a segnalare le esclusioni:
 * l'obbligo di motivazione lo impone lo schema, questo è il controllo di coerenza che
 * la relazione userà per non pubblicare esclusioni non spiegate.
 */
export function esclusioniDaMotivare(
  controlli: readonly Controllo[],
  motivazioni: Readonly<Record<string, string | null | undefined>>,
): readonly string[] {
  return controlli
    .filter((c) => c.stato === "Non applicabile" && !motivazioni[c.codice]?.trim())
    .map((c) => c.codice);
}
