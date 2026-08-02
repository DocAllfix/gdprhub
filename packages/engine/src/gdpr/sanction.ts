// Stima della sanzione GDPR secondo le Linee guida EDPB 04/2022.
//
// PERCHÉ ESISTE QUESTO MODULO
// Il prototipo calcolava `ritardi × 12.500 € + critici × 22.000 € + rischio × 850 €` e
// presentava il risultato come «esposizione sanzionatoria» in un documento destinato al CdA
// e all'Organismo di Vigilanza. Nessuno di quei tre coefficienti ha una fonte. Sul dataset
// di esempio produceva 636.515 €, con un «range prudenziale» ottenuto moltiplicando per
// 0,6 e 1,8. Consegnare quel numero a un cliente è un problema di responsabilità
// professionale, non un dettaglio estetico.
//
// COSA FA INVECE QUESTO
// Applica i passi delle Linee guida EDPB 04/2022 sul calcolo delle sanzioni pecuniarie,
// e restituisce SEMPRE le assunzioni usate insieme al risultato, perché finiscano stampate
// nella relazione accanto alla cifra.
//
// Non si calcola nulla senza il fatturato: senza quel dato la metodologia non è applicabile,
// e restituire comunque un numero significherebbe inventarlo.

/** Categoria di violazione: determina il massimo edittale (art. 83 GDPR). */
export type CategoriaViolazione = "art83.4" | "art83.5";

/** Gravità secondo il passo 2 delle Linee guida (art. 83.2 lett. a, b, g). */
export type Gravita = "bassa" | "media" | "alta";

/** Circostanze del passo 3 (art. 83.2 lett. b-k). Ciascuna sposta la forbice. */
export type Circostanze = {
  /** Lett. b: la violazione è dolosa anziché colposa. */
  readonly dolo?: boolean;
  /** Lett. c: sono state prese misure per attenuare il danno. */
  readonly mitigazione?: boolean;
  /** Lett. e: precedenti violazioni pertinenti. */
  readonly recidiva?: boolean;
  /** Lett. f: cooperazione con l'autorità di controllo. */
  readonly cooperazione?: boolean;
  /** Lett. h: la violazione è stata notificata spontaneamente. */
  readonly autodenuncia?: boolean;
};

export type ParametriSanzioneGdpr = {
  /** Fatturato mondiale annuo dell'esercizio precedente, in euro. Obbligatorio. */
  readonly fatturatoAnnuo: number;
  readonly categoria: CategoriaViolazione;
  readonly gravita: Gravita;
  readonly circostanze?: Circostanze;
};

export type StimaSanzione = {
  readonly minimo: number;
  readonly massimo: number;
  /** Il tetto di legge: la forbice non lo supera mai (passo 4). */
  readonly massimoEdittale: number;
  readonly metodo: string;
  /** Da stampare nella relazione accanto alla cifra. */
  readonly assunzioni: readonly string[];
  readonly passi: readonly string[];
};

/** Passo 1: massimo edittale. Il maggiore fra la soglia fissa e la percentuale del fatturato. */
const TETTI: Record<CategoriaViolazione, { fisso: number; quota: number; descrizione: string }> = {
  "art83.4": { fisso: 10_000_000, quota: 0.02, descrizione: "art. 83.4: 10 M€ o 2% del fatturato" },
  "art83.5": { fisso: 20_000_000, quota: 0.04, descrizione: "art. 83.5: 20 M€ o 4% del fatturato" },
};

/**
 * Passo 2: punto di partenza come quota del massimo edittale, per fascia di gravità.
 * Le Linee guida indicano 0-10%, 10-20% e 20-100%. Per la fascia alta si adotta 20-50%,
 * più prudente del tetto teorico: una forbice 20-100% non orienterebbe nessuna decisione.
 */
const FASCE_GRAVITA: Record<Gravita, { min: number; max: number; nota: string }> = {
  bassa: { min: 0.0, max: 0.1, nota: "gravità bassa: 0-10% del massimo edittale" },
  media: { min: 0.1, max: 0.2, nota: "gravità media: 10-20% del massimo edittale" },
  alta: {
    min: 0.2,
    max: 0.5,
    nota: "gravità alta: 20-50%, fascia prudenziale entro il 20-100% delle Linee guida",
  },
};

/**
 * Passo 2-bis: riduzione per dimensione dell'impresa.
 * Le Linee guida consentono di ridurre l'importo di partenza in funzione del fatturato,
 * perché una sanzione efficace per una multinazionale è distruttiva per una PMI.
 */
const SCAGLIONI_DIMENSIONE: readonly { fino: number; quota: number; etichetta: string }[] = [
  { fino: 2_000_000, quota: 0.002, etichetta: "fatturato ≤ 2 M€" },
  { fino: 10_000_000, quota: 0.004, etichetta: "fatturato ≤ 10 M€" },
  { fino: 50_000_000, quota: 0.02, etichetta: "fatturato ≤ 50 M€" },
  { fino: 100_000_000, quota: 0.1, etichetta: "fatturato ≤ 100 M€" },
  { fino: 250_000_000, quota: 0.2, etichetta: "fatturato ≤ 250 M€" },
  { fino: 500_000_000, quota: 0.5, etichetta: "fatturato ≤ 500 M€" },
  { fino: Number.POSITIVE_INFINITY, quota: 1, etichetta: "fatturato > 500 M€" },
];

/** Passo 3: come ciascuna circostanza sposta la forbice. */
const EFFETTO_CIRCOSTANZE: readonly { chiave: keyof Circostanze; fattore: number; testo: string }[] = [
  { chiave: "dolo", fattore: 1.3, testo: "violazione dolosa (art. 83.2.b): aggravante" },
  { chiave: "recidiva", fattore: 1.3, testo: "precedenti pertinenti (art. 83.2.e): aggravante" },
  {
    chiave: "mitigazione",
    fattore: 0.85,
    testo: "misure di attenuazione del danno (art. 83.2.c): attenuante",
  },
  { chiave: "cooperazione", fattore: 0.85, testo: "cooperazione con l'autorità (art. 83.2.f): attenuante" },
  { chiave: "autodenuncia", fattore: 0.9, testo: "notifica spontanea (art. 83.2.h): attenuante" },
];

export function stimaSanzioneGdpr(p: ParametriSanzioneGdpr): StimaSanzione {
  if (!Number.isFinite(p.fatturatoAnnuo) || p.fatturatoAnnuo < 0) {
    throw new Error("Fatturato annuo mancante o non valido: senza, la metodologia EDPB non è applicabile.");
  }

  const assunzioni: string[] = [];
  const passi: string[] = [];

  // Passo 1 — massimo edittale.
  const tetto = TETTI[p.categoria];
  const massimoEdittale = Math.max(tetto.fisso, p.fatturatoAnnuo * tetto.quota);
  passi.push(`Passo 1 — massimo edittale ${euro(massimoEdittale)} (${tetto.descrizione}).`);

  // Passo 2 — punto di partenza per gravità.
  const fascia = FASCE_GRAVITA[p.gravita];
  let min = massimoEdittale * fascia.min;
  let max = massimoEdittale * fascia.max;
  passi.push(`Passo 2 — punto di partenza ${euro(min)} – ${euro(max)} (${fascia.nota}).`);

  // Passo 2-bis — riduzione per dimensione.
  const scaglione = SCAGLIONI_DIMENSIONE.find((s) => p.fatturatoAnnuo <= s.fino)!;
  if (scaglione.quota < 1) {
    min *= scaglione.quota;
    max *= scaglione.quota;
    passi.push(
      `Passo 2-bis — riduzione dimensionale al ${(scaglione.quota * 100).toFixed(1)}% (${scaglione.etichetta}): ${euro(min)} – ${euro(max)}.`,
    );
  }

  // Passo 3 — circostanze aggravanti e attenuanti.
  const attive = EFFETTO_CIRCOSTANZE.filter((c) => p.circostanze?.[c.chiave]);
  for (const c of attive) {
    min *= c.fattore;
    max *= c.fattore;
    assunzioni.push(c.testo);
  }
  passi.push(
    attive.length
      ? `Passo 3 — applicate ${attive.length} circostanze (art. 83.2 lett. b-k): ${euro(min)} – ${euro(max)}.`
      : "Passo 3 — nessuna circostanza aggravante o attenuante dichiarata.",
  );

  // Passo 4 — il tetto di legge non si supera mai.
  const minFinale = Math.min(Math.round(min), massimoEdittale);
  const maxFinale = Math.min(Math.round(max), massimoEdittale);
  passi.push(
    `Passo 4 — verifica del massimo edittale: forbice finale ${euro(minFinale)} – ${euro(maxFinale)}.`,
  );

  assunzioni.unshift(
    `Fatturato mondiale annuo dichiarato: ${euro(p.fatturatoAnnuo)}.`,
    `Categoria di violazione: ${p.categoria === "art83.5" ? "art. 83.5 (violazioni più gravi)" : "art. 83.4"}.`,
    `Gravità valutata dal consulente: ${p.gravita}.`,
  );
  assunzioni.push(
    "Stima orientativa a supporto della valutazione professionale: non sostituisce un parere legale né predice la decisione dell'autorità di controllo.",
  );

  return {
    minimo: minFinale,
    massimo: maxFinale,
    massimoEdittale: Math.round(massimoEdittale),
    metodo: "EDPB Guidelines 04/2022 on the calculation of administrative fines under the GDPR",
    assunzioni,
    passi,
  };
}

function euro(n: number): string {
  return `€ ${Math.round(n).toLocaleString("it-IT")}`;
}
