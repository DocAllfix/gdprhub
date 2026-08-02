import type { Controllo } from "./types";

// Scadenze e ritardi.
//
// Principio: una scadenza è una DATA DI CALENDARIO, non un istante. "Il registro va
// aggiornato entro il 14 agosto" non ha un'ora. Trattarla come un istante e calcolare i
// giorni dividendo una differenza di millisecondi per 86.400.000 produce errori nelle due
// notti dell'anno in cui cambia l'ora legale: è il difetto F7 rilevato nel prototipo.
//
// Qui si confrontano date di calendario, quindi il cambio d'ora non entra mai in gioco.
// Nessuna funzione legge l'orologio: `oggi` è sempre un parametro, così i test sono
// deterministici e il motore resta puro.

/** Fuso di riferimento del prodotto: la scadenza è quella percepita dal consulente in Italia. */
export const FUSO_ORARIO = "Europe/Rome";

/** Data di calendario ISO `YYYY-MM-DD`. */
export type DataISO = string;

const FORMATO_ISO = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Converte un istante nella data di calendario del fuso indicato.
 * `en-CA` è la scorciatoia che produce già `YYYY-MM-DD` senza ricomporre i pezzi a mano.
 */
export function dataDiCalendario(istante: Date, fuso: string = FUSO_ORARIO): DataISO {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: fuso,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(istante);
}

/** Interpreta una data di calendario come mezzanotte UTC: due date così sono sempre confrontabili. */
function aMezzanotteUtc(data: DataISO): number {
  if (!FORMATO_ISO.test(data)) throw new Error(`Data non valida: "${data}". Atteso YYYY-MM-DD.`);
  const [anno, mese, giorno] = data.split("-").map(Number) as [number, number, number];
  const istante = Date.UTC(anno, mese - 1, giorno);
  // Date.UTC accetta il 31 febbraio e lo fa scivolare a marzo: qui non lo vogliamo.
  if (dataDiCalendario(new Date(istante), "UTC") !== data) {
    throw new Error(`Data inesistente nel calendario: "${data}".`);
  }
  return istante;
}

/**
 * Giorni di calendario fra due date. Negativo se `a` precede `da`.
 * Entrambe sono mezzanotti UTC, quindi il risultato è esatto anche attraverso il cambio d'ora.
 */
export function giorniTra(da: DataISO, a: DataISO): number {
  return Math.round((aMezzanotteUtc(a) - aMezzanotteUtc(da)) / 86_400_000);
}

/** Somma giorni di calendario a una data. */
export function piuGiorni(data: DataISO, giorni: number): DataISO {
  return dataDiCalendario(new Date(aMezzanotteUtc(data) + giorni * 86_400_000), "UTC");
}

/**
 * Giorni che mancano alla scadenza. Zero = scade oggi, negativo = giorni di ritardo.
 * La scadenza di oggi NON è in ritardo: si ha tempo fino a fine giornata.
 */
export function giorniAllaScadenza(controllo: Pick<Controllo, "scadenza">, oggi: DataISO): number {
  return giorniTra(oggi, controllo.scadenza);
}

/** Un controllo pesa sulle scadenze solo se c'è ancora qualcosa da fare. */
function èAperto(controllo: Pick<Controllo, "stato">): boolean {
  return controllo.stato !== "Completata" && controllo.stato !== "Non applicabile";
}

/**
 * In ritardo = aperto e con scadenza già passata.
 *
 * Nel prototipo "In ritardo" era uno stato salvato, e questo produceva dati impossibili
 * (T14, R04 e D04 erano marcati in ritardo con scadenza futura). Qui è un derivato: non
 * può contraddire la data perché discende dalla data.
 */
export function èInRitardo(controllo: Pick<Controllo, "stato" | "scadenza">, oggi: DataISO): boolean {
  return èAperto(controllo) && giorniAllaScadenza(controllo, oggi) < 0;
}

/** Imminente = aperto, non ancora scaduto, ed entro la finestra indicata. */
export function èImminente(
  controllo: Pick<Controllo, "stato" | "scadenza">,
  oggi: DataISO,
  finestraGiorni = 7,
): boolean {
  if (!èAperto(controllo)) return false;
  const giorni = giorniAllaScadenza(controllo, oggi);
  return giorni >= 0 && giorni <= finestraGiorni;
}

export type QuadroScadenze = {
  /** Aperti con scadenza passata. */
  readonly inRitardo: number;
  /** Aperti in scadenza entro la finestra (oggi compreso). */
  readonly imminenti: number;
  /** Giorni di ritardo del controllo più arretrato. Zero se non ci sono ritardi. */
  readonly ritardoMassimoGiorni: number;
  /** Somma dei giorni di ritardo: distingue dieci ritardi di un giorno da uno di dieci mesi. */
  readonly ritardoTotaleGiorni: number;
};

export function quadroScadenze(
  controlli: readonly Controllo[],
  oggi: DataISO,
  finestraGiorni = 7,
): QuadroScadenze {
  let inRitardo = 0;
  let imminenti = 0;
  let ritardoMassimoGiorni = 0;
  let ritardoTotaleGiorni = 0;

  for (const c of controlli) {
    if (èInRitardo(c, oggi)) {
      const giorni = -giorniAllaScadenza(c, oggi);
      inRitardo++;
      ritardoTotaleGiorni += giorni;
      if (giorni > ritardoMassimoGiorni) ritardoMassimoGiorni = giorni;
    } else if (èImminente(c, oggi, finestraGiorni)) {
      imminenti++;
    }
  }

  return { inRitardo, imminenti, ritardoMassimoGiorni, ritardoTotaleGiorni };
}

/** I controlli aperti ordinati per urgenza: prima i più arretrati, poi i più vicini a scadere. */
export function perUrgenza(controlli: readonly Controllo[]): readonly Controllo[] {
  return [...controlli].filter(èAperto).sort((a, b) => a.scadenza.localeCompare(b.scadenza));
}
