// Sanzione pecuniaria per l'ente ex D.Lgs 231/2001, artt. 10-12.
//
// È la più difendibile delle tre metodologie della suite, perché il meccanismo è scritto
// nella norma e non stimato: il giudice determina un NUMERO DI QUOTE in base alla gravità
// e al grado di responsabilità dell'ente, e un VALORE DELLA QUOTA in base alle condizioni
// economiche e patrimoniali dell'ente. La sanzione è il prodotto dei due.
//
//   art. 10  — da 100 a 1.000 quote; quota da € 258 a € 1.549
//   art. 11  — criteri di commisurazione
//   art. 12  — riduzioni: metà o due terzi, con tetto di € 103.291 nei casi previsti
//
// Il modulo non decide per il consulente: riceve i parametri, applica la norma e stampa
// le assunzioni. Come per il GDPR, senza i dati non produce alcun numero.

export const QUOTE_MIN = 100;
export const QUOTE_MAX = 1000;
export const VALORE_QUOTA_MIN = 258;
export const VALORE_QUOTA_MAX = 1549;
/** Tetto previsto dall'art. 12 comma 2 nei casi di riduzione. */
export const TETTO_RIDUZIONE = 103_291;

/** Gravità del fatto e grado di responsabilità dell'ente (art. 11 comma 1). */
export type GravitaFatto = "lieve" | "media" | "grave" | "gravissima";

/** Riduzioni dell'art. 12. */
export type Riduzione =
  /** Comma 1: autore nell'interesse proprio, o danno patrimoniale di particolare tenuità. */
  | "meta"
  /** Comma 2: risarcimento integrale ed eliminazione delle carenze organizzative, o adozione del modello. */
  | "unTerzoAllaMeta"
  /** Comma 3: entrambe le condizioni del comma 2. */
  | "dalMetaAiDueTerzi"
  | "nessuna";

export type ParametriSanzione231 = {
  readonly gravita: GravitaFatto;
  /**
   * Condizioni economiche e patrimoniali dell'ente, che determinano il valore della quota
   * (art. 11 comma 2). Si esprime col fatturato annuo in euro.
   */
  readonly fatturatoAnnuo: number;
  /** Il modello organizzativo era adottato ed efficacemente attuato prima del fatto (art. 6). */
  readonly modelloAdottatoPrimaDelFatto?: boolean;
  readonly riduzione?: Riduzione;
};

export type StimaSanzione231 = {
  readonly minimo: number;
  readonly massimo: number;
  readonly quote: { readonly min: number; readonly max: number };
  readonly valoreQuota: number;
  readonly metodo: string;
  readonly assunzioni: readonly string[];
  readonly passi: readonly string[];
  /** Avvertenza sulle sanzioni interdittive, che non sono monetizzabili. */
  readonly avvertenzaInterdittive: string;
};

/** Fasce di quote per gravità, dentro il minimo e massimo dell'art. 10. */
const FASCE_QUOTE: Record<GravitaFatto, { min: number; max: number }> = {
  lieve: { min: 100, max: 250 },
  media: { min: 200, max: 450 },
  grave: { min: 400, max: 700 },
  gravissima: { min: 600, max: 1000 },
};

/** Valore della quota per condizioni economiche, entro i limiti dell'art. 10 comma 3. */
const SCAGLIONI_QUOTA: readonly { fino: number; valore: number; etichetta: string }[] = [
  { fino: 2_000_000, valore: 258, etichetta: "fatturato ≤ 2 M€: quota al minimo di legge" },
  { fino: 10_000_000, valore: 450, etichetta: "fatturato ≤ 10 M€" },
  { fino: 50_000_000, valore: 750, etichetta: "fatturato ≤ 50 M€" },
  { fino: 250_000_000, valore: 1100, etichetta: "fatturato ≤ 250 M€" },
  {
    fino: Number.POSITIVE_INFINITY,
    valore: 1549,
    etichetta: "fatturato > 250 M€: quota al massimo di legge",
  },
];

const FATTORI_RIDUZIONE: Record<Riduzione, { min: number; max: number; testo: string }> = {
  nessuna: { min: 1, max: 1, testo: "" },
  meta: { min: 0.5, max: 0.5, testo: "art. 12 comma 1: sanzione ridotta della metà" },
  unTerzoAllaMeta: { min: 0.5, max: 2 / 3, testo: "art. 12 comma 2: riduzione da un terzo alla metà" },
  dalMetaAiDueTerzi: { min: 1 / 3, max: 0.5, testo: "art. 12 comma 3: riduzione dalla metà ai due terzi" },
};

export function stimaSanzione231(p: ParametriSanzione231): StimaSanzione231 {
  if (!Number.isFinite(p.fatturatoAnnuo) || p.fatturatoAnnuo < 0) {
    throw new Error(
      "Fatturato annuo mancante o non valido: senza, il valore della quota ex art. 11 comma 2 non è determinabile.",
    );
  }

  const assunzioni: string[] = [];
  const passi: string[] = [];

  // Passo 1 — numero di quote (artt. 10 comma 2, 11 comma 1).
  const fascia = FASCE_QUOTE[p.gravita];
  let quoteMin = fascia.min;
  let quoteMax = fascia.max;
  passi.push(
    `Passo 1 — numero di quote ${quoteMin}-${quoteMax} per gravità «${p.gravita}» (artt. 10, 11 c.1).`,
  );

  // Un modello adottato ed efficacemente attuato prima del fatto attenua il grado di
  // responsabilità dell'ente: è il senso dell'esimente dell'art. 6.
  if (p.modelloAdottatoPrimaDelFatto) {
    quoteMin = Math.max(QUOTE_MIN, Math.round(quoteMin * 0.7));
    quoteMax = Math.max(QUOTE_MIN, Math.round(quoteMax * 0.7));
    assunzioni.push(
      "Modello organizzativo adottato ed efficacemente attuato prima del fatto (art. 6): minore grado di responsabilità.",
    );
    passi.push(`Passo 1-bis — quote ridotte a ${quoteMin}-${quoteMax} per il modello preesistente.`);
  }

  // Passo 2 — valore della quota (artt. 10 comma 3, 11 comma 2).
  const scaglione = SCAGLIONI_QUOTA.find((s) => p.fatturatoAnnuo <= s.fino)!;
  const valoreQuota = scaglione.valore;
  passi.push(`Passo 2 — valore della quota € ${valoreQuota} (${scaglione.etichetta}, art. 11 c.2).`);

  // Passo 3 — prodotto.
  let min = quoteMin * valoreQuota;
  let max = quoteMax * valoreQuota;
  passi.push(`Passo 3 — sanzione ${euro(min)} – ${euro(max)}.`);

  // Passo 4 — riduzioni dell'art. 12.
  const riduzione = p.riduzione ?? "nessuna";
  if (riduzione !== "nessuna") {
    const f = FATTORI_RIDUZIONE[riduzione];
    min = min * f.min;
    max = max * f.max;
    assunzioni.push(f.testo);
    // Il comma 2 dell'art. 12 pone un tetto assoluto alla sanzione ridotta.
    if (riduzione !== "meta") {
      min = Math.min(min, TETTO_RIDUZIONE);
      max = Math.min(max, TETTO_RIDUZIONE);
      passi.push(`Passo 4 — riduzione applicata e tetto di ${euro(TETTO_RIDUZIONE)} (art. 12 c.2).`);
    } else {
      passi.push(`Passo 4 — riduzione applicata: ${euro(min)} – ${euro(max)}.`);
    }
  } else {
    passi.push("Passo 4 — nessuna riduzione ex art. 12 dichiarata.");
  }

  assunzioni.unshift(
    `Gravità del fatto e grado di responsabilità valutati dal consulente: ${p.gravita}.`,
    `Condizioni economiche dell'ente desunte dal fatturato dichiarato: ${euro(p.fatturatoAnnuo)}.`,
  );
  assunzioni.push(
    "Stima orientativa: la determinazione delle quote e del loro valore spetta al giudice ex artt. 10-12 D.Lgs 231/2001.",
  );

  return {
    minimo: Math.round(min),
    massimo: Math.round(max),
    quote: { min: quoteMin, max: quoteMax },
    valoreQuota,
    metodo: "D.Lgs 231/2001, artt. 10-12: sanzione per quote",
    assunzioni,
    passi,
    avvertenzaInterdittive:
      "Alla sanzione pecuniaria possono aggiungersi le sanzioni interdittive dell'art. 9 comma 2 " +
      "(interdizione dall'attività, sospensione di autorizzazioni, divieto di contrattare con la PA, " +
      "esclusione da agevolazioni, divieto di pubblicizzare beni o servizi). Il loro impatto non è " +
      "monetizzabile e va valutato a parte: per molte imprese è più grave della sanzione pecuniaria.",
  };
}

function euro(n: number): string {
  return `€ ${Math.round(n).toLocaleString("it-IT")}`;
}
