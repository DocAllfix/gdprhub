import type { AdempimentoRisolto, StatoLavoro, StatoScadenza } from "./types";
import { STATI_LAVORO, STATI_SCADENZA } from "./types";

// Grado di conformità e conteggi, comuni ai tre domini.
//
// Tre scelte che cambiano i numeri rispetto ai prototipi, tutte volute:
//
// 1. I NON APPLICABILI escono dal denominatore. Se un'azienda non ha cantieri, il PSC non
//    deve pesare come un adempimento mancato: nei prototipi non era possibile escluderlo,
//    e ogni percentuale ne risultava falsata verso il basso.
//
// 2. Con zero adempimenti applicabili la percentuale è `null`, non 100. Un 100% su un
//    assessment vuoto è esattamente il genere di numero che finisce in una relazione per
//    il CdA senza che nessuno lo abbia guardato.
//
// 3. La conformità si misura su DUE assi, non uno. Il prototipo 81/08 contava i «Regolari»
//    (asse scadenza), GDPR e 231 i «Completati» (asse lavoro): due numeri diversi che si
//    chiamavano entrambi «compliance». Qui si espongono entrambi, distinti e nominati.

export type Quota = {
  /** Percentuale 0-100, oppure `null` se non c'è nulla di applicabile su cui misurarsi. */
  readonly percentuale: number | null;
  readonly numeratore: number;
  /** Denominatore: gli adempimenti che contano, cioè tutti tranne i non applicabili. */
  readonly applicabili: number;
  readonly nonApplicabili: number;
};

function quota(applicabili: number, numeratore: number, nonApplicabili: number): Quota {
  return {
    percentuale: applicabili === 0 ? null : Math.round((numeratore / applicabili) * 100),
    numeratore,
    applicabili,
    nonApplicabili,
  };
}

const applicabile = (a: Pick<AdempimentoRisolto, "stato">) => a.stato !== "Non applicabile";

/**
 * Quanto lavoro è stato portato a termine.
 * Risponde a: «di quello che c'è da fare, quanto è fatto?»
 */
export function conformitaLavoro(adempimenti: readonly AdempimentoRisolto[]): Quota {
  const app = adempimenti.filter(applicabile);
  const completati = app.filter((a) => a.stato === "Completata").length;
  return quota(app.length, completati, adempimenti.length - app.length);
}

/**
 * Quanto è in regola con i tempi.
 * Risponde a: «di quello che c'è da presidiare, quanto è aggiornato?»
 *
 * È la metrica che il prototipo 81/08 chiamava «compliance», ed è quella che pesa in
 * un'ispezione: un documento redatto ma scaduto non protegge nessuno.
 */
export function conformitaScadenze(adempimenti: readonly AdempimentoRisolto[]): Quota {
  const app = adempimenti.filter(applicabile);
  const regolari = app.filter((a) => a.statoScadenza === "Regolare").length;
  return quota(app.length, regolari, adempimenti.length - app.length);
}

/**
 * Conformità effettiva: un adempimento conta solo se è **sia** completato **sia** in regola
 * sui tempi. È la lettura più severa delle tre ed è quella difendibile davanti a un
 * ispettore, perché non consente di compensare un documento scaduto con uno chiuso.
 * I presidi continui, che per natura non hanno scadenza, contano se completati.
 */
export function conformitaEffettiva(adempimenti: readonly AdempimentoRisolto[]): Quota {
  const app = adempimenti.filter(applicabile);
  const buoni = app.filter(
    (a) => a.stato === "Completata" && (a.statoScadenza === "Regolare" || a.periodicita.tipo === "continua"),
  ).length;
  return quota(app.length, buoni, adempimenti.length - app.length);
}

/** Raggruppa e misura per una chiave qualsiasi: ruolo, categoria, dominio. */
export function conformitaPer<C extends string>(
  adempimenti: readonly AdempimentoRisolto[],
  chiave: (a: AdempimentoRisolto) => C,
  misura: (gruppo: readonly AdempimentoRisolto[]) => Quota = conformitaEffettiva,
): Readonly<Record<C, Quota>> {
  const gruppi = new Map<C, AdempimentoRisolto[]>();
  for (const a of adempimenti) {
    const k = chiave(a);
    const g = gruppi.get(k);
    if (g) g.push(a);
    else gruppi.set(k, [a]);
  }
  return Object.fromEntries([...gruppi].map(([k, g]) => [k, misura(g)])) as Record<C, Quota>;
}

/**
 * Conteggi per stato di lavoro e per stato di scadenza.
 *
 * Ogni insieme somma al totale, perché gli stati di ciascun asse si escludono a vicenda.
 * Nei prototipi «In ritardo» stava insieme agli stati di lavoro e un adempimento scaduto
 * veniva contato due volte, sia fra i «Da fare» sia fra i ritardi.
 */
export function conteggi(adempimenti: readonly AdempimentoRisolto[]): {
  readonly perLavoro: Readonly<Record<StatoLavoro, number>>;
  readonly perScadenza: Readonly<Record<StatoScadenza, number>>;
} {
  const perLavoro = Object.fromEntries(STATI_LAVORO.map((s) => [s, 0])) as Record<StatoLavoro, number>;
  const perScadenza = Object.fromEntries(STATI_SCADENZA.map((s) => [s, 0])) as Record<StatoScadenza, number>;
  for (const a of adempimenti) {
    perLavoro[a.stato]++;
    perScadenza[a.statoScadenza]++;
  }
  return { perLavoro, perScadenza };
}

/** Adempimenti su cui c'è ancora lavoro da fare. */
export function aperti(adempimenti: readonly AdempimentoRisolto[]): readonly AdempimentoRisolto[] {
  return adempimenti.filter((a) => a.stato !== "Completata" && a.stato !== "Non applicabile");
}

/**
 * Adempimenti che richiedono un intervento: o il lavoro è aperto, o la scadenza incombe o
 * è già mancata. È l'insieme che alimenta lo scadenzario e il piano di rimedio.
 */
export function daPresidiare(adempimenti: readonly AdempimentoRisolto[]): readonly AdempimentoRisolto[] {
  return adempimenti.filter(
    (a) =>
      applicabile(a) &&
      (a.stato !== "Completata" || a.statoScadenza === "Scaduta" || a.statoScadenza === "In scadenza"),
  );
}

/** Da presidiare e di priorità Critica: sono quelli che aprono un'ispezione, non quelli che la chiudono. */
export function criticiAperti(adempimenti: readonly AdempimentoRisolto[]): readonly AdempimentoRisolto[] {
  return daPresidiare(adempimenti).filter((a) => a.priorita === "Critica");
}

/**
 * Le esclusioni prive di motivazione.
 *
 * Il motore non legge il database, quindi riceve le motivazioni e si limita a segnalare i
 * buchi: è il controllo che impedisce di pubblicare una relazione con adempimenti esclusi
 * senza una ragione scritta.
 */
export function esclusioniDaMotivare(
  adempimenti: readonly AdempimentoRisolto[],
  motivazioni: Readonly<Record<string, string | null | undefined>>,
): readonly string[] {
  return adempimenti
    .filter((a) => a.stato === "Non applicabile" && !motivazioni[a.codice]?.trim())
    .map((a) => a.codice);
}
