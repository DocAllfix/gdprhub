// Aritmetica di calendario. Nessun concetto di dominio qui dentro: solo date.
//
// Principio: una scadenza è una DATA DI CALENDARIO, non un istante. «Il registro va
// aggiornato entro il 14 agosto» non ha un'ora. Trattarla come istante e calcolare i giorni
// dividendo una differenza di millisecondi per 86.400.000 produce errori nelle due notti
// dell'anno in cui cambia l'ora legale: è il difetto presente in tutti e tre i prototipi.
//
// Qui si confrontano date di calendario, quindi il cambio d'ora non entra mai in gioco.
// Nessuna funzione legge l'orologio se non le viene chiesto: `oggi` è sempre un parametro,
// così i test sono deterministici e il motore resta puro.

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

/** Scompone una data ISO validandola. Rifiuta sia il formato sbagliato sia il 31 febbraio. */
export function scomponi(data: DataISO): { anno: number; mese: number; giorno: number } {
  if (!FORMATO_ISO.test(data)) throw new Error(`Data non valida: "${data}". Atteso YYYY-MM-DD.`);
  const [anno, mese, giorno] = data.split("-").map(Number) as [number, number, number];
  // Date.UTC accetta il 31 febbraio e lo fa scivolare a marzo: qui non lo vogliamo.
  if (dataDiCalendario(new Date(Date.UTC(anno, mese - 1, giorno)), "UTC") !== data) {
    throw new Error(`Data inesistente nel calendario: "${data}".`);
  }
  return { anno, mese, giorno };
}

/** Interpreta una data di calendario come mezzanotte UTC: due date così sono sempre confrontabili. */
function aMezzanotteUtc(data: DataISO): number {
  const { anno, mese, giorno } = scomponi(data);
  return Date.UTC(anno, mese - 1, giorno);
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
 * Somma mesi di calendario, arretrando al giorno valido più vicino quando il mese di
 * arrivo è più corto.
 *
 * Serve alla ricorrenza: la formazione erogata il 31 gennaio, con periodicità di un mese,
 * scade il 28 febbraio, non il 3 marzo. L'aritmetica ingenua di JavaScript fa scivolare al
 * mese successivo e sposta la scadenza in avanti, cioè esattamente nella direzione
 * sbagliata per uno strumento di compliance.
 */
export function piuMesi(data: DataISO, mesi: number): DataISO {
  const { anno, mese, giorno } = scomponi(data);
  const totaleMesi = anno * 12 + (mese - 1) + mesi;
  const annoArrivo = Math.floor(totaleMesi / 12);
  const meseArrivo = totaleMesi - annoArrivo * 12; // 0-11

  // Giorno 0 del mese successivo = ultimo giorno del mese di arrivo.
  const giorniNelMese = new Date(Date.UTC(annoArrivo, meseArrivo + 1, 0)).getUTCDate();
  const giornoArrivo = Math.min(giorno, giorniNelMese);

  return dataDiCalendario(new Date(Date.UTC(annoArrivo, meseArrivo, giornoArrivo)), "UTC");
}

/** Formatta una data ISO per la lettura umana in italiano. */
export function formattaIt(data: DataISO): string {
  const { anno, mese, giorno } = scomponi(data);
  return `${String(giorno).padStart(2, "0")}/${String(mese).padStart(2, "0")}/${anno}`;
}
