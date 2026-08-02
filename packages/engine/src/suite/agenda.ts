import type { AdempimentoRisolto, Dominio, Priorita } from "../core/types";
import { daPresidiare } from "../core/compliance";
import { conformitaEffettiva, type Quota } from "../core/compliance";
import { esposizione, type Esposizione } from "../core/exposure";

// Scadenzario unificato: il pezzo che rende la suite più della somma dei tre moduli.
//
/** Ordine di lettura delle priorità: la critica per prima. */
const ORDINE_PRIORITA: Readonly<Record<Priorita, number>> = { Critica: 0, Alta: 1, Media: 2, Bassa: 3 };

// Un consulente non pensa «oggi faccio GDPR»: pensa «cosa scade questa settimana per Rossi
// Srl». Oggi deve aprire tre strumenti e incrociare a mano. Qui è una lista sola, ordinata
// per data, che attraversa i tre decreti.

export type VoceAgenda = AdempimentoRisolto & {
  /** Giorni residui. Negativo se la scadenza è già passata. */
  readonly giorni: number;
};

/**
 * Gli adempimenti da presidiare dei tre domini, in una lista sola ordinata per urgenza.
 *
 * Chi non ha una scadenza calcolabile resta fuori: i presidi continui e quelli mai
 * programmati non appartengono a un'agenda, appartengono a un elenco di cose da impostare.
 * Confonderli riempirebbe lo scadenzario di righe che nessuno può chiudere entro una data.
 */
export function agenda(
  adempimenti: readonly AdempimentoRisolto[],
  opzioni: { readonly entroGiorni?: number; readonly domini?: readonly Dominio[] } = {},
): readonly VoceAgenda[] {
  const { entroGiorni, domini } = opzioni;

  return (
    daPresidiare(adempimenti)
      .filter((a) => (domini ? domini.includes(a.dominio) : true))
      .filter((a): a is AdempimentoRisolto & { giorniAllaScadenza: number } => a.giorniAllaScadenza !== null)
      .map((a) => ({ ...a, giorni: a.giorniAllaScadenza }))
      .filter((v) => (entroGiorni === undefined ? true : v.giorni <= entroGiorni))
      // A parità di giorni decide la priorità: fra due cose che scadono lo stesso giorno, il
      // consulente vuole vedere prima la critica. Dominio e codice servono solo a rendere
      // l'ordinamento deterministico, non a esprimere una preferenza.
      .sort(
        (a, b) =>
          a.giorni - b.giorni ||
          ORDINE_PRIORITA[a.priorita] - ORDINE_PRIORITA[b.priorita] ||
          a.dominio.localeCompare(b.dominio) ||
          a.codice.localeCompare(b.codice),
      )
  );
}

/**
 * Adempimenti senza una data: presidi permanenti e cose mai avviate.
 * Vanno mostrati, ma in un elenco separato dall'agenda.
 */
export function senzaScadenza(adempimenti: readonly AdempimentoRisolto[]): readonly AdempimentoRisolto[] {
  return daPresidiare(adempimenti).filter((a) => a.giorniAllaScadenza === null);
}

export type FinestreAgenda = {
  readonly scadute: readonly VoceAgenda[];
  readonly entro7: readonly VoceAgenda[];
  readonly entro30: readonly VoceAgenda[];
  readonly entro90: readonly VoceAgenda[];
};

/** L'agenda divisa nelle finestre che il consulente usa davvero. Insiemi disgiunti. */
export function finestre(adempimenti: readonly AdempimentoRisolto[]): FinestreAgenda {
  const tutte = agenda(adempimenti);
  return {
    scadute: tutte.filter((v) => v.giorni < 0),
    entro7: tutte.filter((v) => v.giorni >= 0 && v.giorni <= 7),
    entro30: tutte.filter((v) => v.giorni > 7 && v.giorni <= 30),
    entro90: tutte.filter((v) => v.giorni > 30 && v.giorni <= 90),
  };
}

export type QuadroDominio = {
  readonly dominio: Dominio;
  readonly conformita: Quota;
  readonly esposizione: Esposizione;
  readonly scadute: number;
  readonly entro30: number;
};

export type QuadroAzienda = {
  /** Un riquadro per ciascun modulo attivo. */
  readonly perDominio: readonly QuadroDominio[];
  /** Conformità ed esposizione sull'insieme dei domini attivi. */
  readonly complessivo: { readonly conformita: Quota; readonly esposizione: Esposizione };
  readonly agenda: FinestreAgenda;
};

/**
 * Il cruscotto di un'azienda cliente sui moduli attivi.
 *
 * Il complessivo si calcola sull'insieme unito, non come media delle tre percentuali: la
 * media pesarebbe allo stesso modo un dominio con 42 adempimenti e uno con 65, e basterebbe
 * disattivare un modulo per far salire il numero.
 */
export function quadroAzienda(
  adempimenti: readonly AdempimentoRisolto[],
  dominiAttivi: readonly Dominio[],
): QuadroAzienda {
  const attivi = adempimenti.filter((a) => dominiAttivi.includes(a.dominio));

  const perDominio = dominiAttivi.map((dominio): QuadroDominio => {
    const suoi = attivi.filter((a) => a.dominio === dominio);
    const f = finestre(suoi);
    return {
      dominio,
      conformita: conformitaEffettiva(suoi),
      esposizione: esposizione(suoi),
      scadute: f.scadute.length,
      entro30: f.entro7.length + f.entro30.length,
    };
  });

  return {
    perDominio,
    complessivo: { conformita: conformitaEffettiva(attivi), esposizione: esposizione(attivi) },
    agenda: finestre(attivi),
  };
}
