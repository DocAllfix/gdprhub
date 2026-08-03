import { registroPerTipo, type DefinizioneRegistro, type StatoRegistro, type TipoRegistro } from "./tipi";

// IL CALCOLO DEI TERMINI.
//
// Tutto ciò che riguarda «entro quando» sta qui, e da nessun'altra parte. Un termine
// calcolato dentro una schermata è un termine che nessun test copre e che il giorno dopo
// diverge da quello scritto nella relazione.
//
// TRE COSE CHE SEMBRANO DETTAGLI E NON LO SONO.
//
// 1. LE 72 ORE SONO ORE, non tre giorni. L'art. 33 dice «entro 72 ore»: una violazione
//    conosciuta venerdì alle 18 scade lunedì alle 18, non lunedì a mezzanotte. Arrotondare
//    ai giorni regalerebbe sei ore che non esistono, e nella notifica tardiva quelle sei ore
//    sono la differenza fra un adempimento e una violazione.
//
// 2. IL TERMINE DECORRE DALLA CONOSCENZA, non dall'accadimento. Sono due date diverse e
//    spesso distanti. Il modello le tiene separate perché servono a due cose diverse: la
//    prima al termine, la seconda alla ricostruzione dei fatti.
//
// 3. UN TERMINE ASSOLTO NON SCADE PIÙ. Una violazione notificata in tempo resta notificata
//    in tempo anche fra un anno: mostrare «scaduta» su un obbligo già adempiuto è il difetto
//    che rende un registro inutilizzabile dopo tre mesi d'uso.

export type StatoTermine =
  | "assolto" // fatto, e nei tempi
  | "assolto-tardi" // fatto, ma dopo il termine — resta scritto
  | "in-termine"
  | "in-scadenza" // meno di un quarto del tempo residuo
  | "scaduto"
  | "senza-termine"; // registri anagrafici e a validità

export type Termine = {
  readonly stato: StatoTermine;
  /** Quando scade l'obbligo. `null` per i registri senza termine. */
  readonly scadeIl: Date | null;
  /** Ore residue, negative se scaduto. `null` se non c'è termine. */
  readonly oreResidue: number | null;
  /** Cosa si deve fare, dalla definizione del registro. */
  readonly obbligo: string;
  /** Testo pronto: «restano 41 ore», «scaduto da 3 giorni», «notificata in tempo». */
  readonly descrizione: string;
};

const ORA = 60 * 60 * 1000;

function frasiOre(ore: number): string {
  const assolute = Math.abs(ore);
  if (assolute < 1) return "meno di un'ora";
  if (assolute < 48) return `${Math.floor(assolute)} ${Math.floor(assolute) === 1 ? "ora" : "ore"}`;
  const giorni = Math.floor(assolute / 24);
  return `${giorni} ${giorni === 1 ? "giorno" : "giorni"}`;
}

/**
 * Lo stato di un termine.
 *
 * `adesso` si passa sempre: il motore non legge l'orologio, come tutto il resto di questo
 * pacchetto. È ciò che rende il calcolo riproducibile in un test e identico fra la
 * schermata e la relazione.
 */
export function calcolaTermine(
  tipo: TipoRegistro | string,
  voce: {
    readonly conosciutoIl: Date;
    readonly assoltoIl: Date | null;
    readonly stato: StatoRegistro | string;
    /** Data di validità propria della voce: scadenza di un corso, di un giudizio, di una verifica. */
    readonly validoFinoA?: Date | null;
    /** Il termine è stato prorogato: cambia la durata, non la decorrenza. */
    readonly prorogato?: boolean;
  },
  adesso: Date,
): Termine {
  const def: DefinizioneRegistro | undefined = registroPerTipo(tipo);
  if (!def) {
    return {
      stato: "senza-termine",
      scadeIl: null,
      oreResidue: null,
      obbligo: "",
      descrizione: "registro sconosciuto",
    };
  }

  const r = def.termine;

  // --- Registri anagrafici: esistono, non scadono ------------------------------------------
  if (r.tipo === "anagrafica") {
    return {
      stato: "senza-termine",
      scadeIl: null,
      oreResidue: null,
      obbligo: r.obbligo,
      descrizione: voce.stato === "chiuso" ? "censito" : "da tenere aggiornato",
    };
  }

  // --- Registri a validità: la scadenza è un dato della voce, non una regola ----------------
  if (r.tipo === "validita") {
    if (!voce.validoFinoA) {
      return {
        stato: "senza-termine",
        scadeIl: null,
        oreResidue: null,
        obbligo: r.obbligo,
        // Una validità non indicata NON è «in regola»: è un dato mancante, e dirlo è
        // l'unico modo perché qualcuno lo compili.
        descrizione: "validità non indicata",
      };
    }
    const ore = (voce.validoFinoA.getTime() - adesso.getTime()) / ORA;
    return {
      stato: ore < 0 ? "scaduto" : ore < 30 * 24 ? "in-scadenza" : "in-termine",
      scadeIl: voce.validoFinoA,
      oreResidue: ore,
      obbligo: r.obbligo,
      descrizione:
        ore < 0 ? `scaduto da ${frasiOre(ore)}` : `valido ancora ${frasiOre(ore)}`,
    };
  }

  // --- Termini che decorrono dalla conoscenza ----------------------------------------------
  const durataOre =
    r.tipo === "ore" ? r.ore : (voce.prorogato && r.prorogabileA ? r.prorogabileA : r.giorni) * 24;
  const scadeIl = new Date(voce.conosciutoIl.getTime() + durataOre * ORA);

  // UN TERMINE ASSOLTO NON SCADE PIÙ, e resta scritto se fu tardivo.
  if (voce.assoltoIl) {
    const tardi = voce.assoltoIl.getTime() > scadeIl.getTime();
    const scarto = (voce.assoltoIl.getTime() - scadeIl.getTime()) / ORA;
    return {
      stato: tardi ? "assolto-tardi" : "assolto",
      scadeIl,
      oreResidue: null,
      obbligo: r.obbligo,
      descrizione: tardi ? `assolto con ${frasiOre(scarto)} di ritardo` : "assolto nei termini",
    };
  }

  const ore = (scadeIl.getTime() - adesso.getTime()) / ORA;
  if (ore < 0) {
    return {
      stato: "scaduto",
      scadeIl,
      oreResidue: ore,
      obbligo: r.obbligo,
      descrizione: `termine scaduto da ${frasiOre(ore)}`,
    };
  }
  // «In scadenza» è l'ultimo quarto del tempo concesso, non una soglia fissa: su 72 ore sono
  // le ultime 18, su 30 giorni gli ultimi 7. Una soglia unica renderebbe l'avviso inutile su
  // uno dei due — o arriverebbe troppo tardi sulle ore, o troppo presto sui giorni.
  const soglia = durataOre / 4;
  return {
    stato: ore <= soglia ? "in-scadenza" : "in-termine",
    scadeIl,
    oreResidue: ore,
    obbligo: r.obbligo,
    descrizione: `restano ${frasiOre(ore)}`,
  };
}

/** Le voci che richiedono un intervento adesso: scadute o agli sgoccioli. */
export function daPresidiareOra<T extends { termine: Termine }>(voci: readonly T[]): readonly T[] {
  return voci.filter((v) => v.termine.stato === "scaduto" || v.termine.stato === "in-scadenza");
}
