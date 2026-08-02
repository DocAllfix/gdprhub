import type { Dominio } from "../core/types";

// Catalogo dei reati presupposto del D.Lgs 231/2001.
//
// Aggiunta rispetto ai prototipi, che li citavano solo in nota («Art. 25-ter»,
// «Reati informatici 24-bis», «Art. 25-quinquiesdecies») senza poterli usare.
//
// Serve perché **un OdV ragiona per reati, non per attività**. La domanda che si pone in
// riunione non è «quante attività sono aperte», è «il rischio di corruzione è presidiato?».
// Senza questa entità la relazione al CdA non può rispondere.
//
// Ogni famiglia dichiara gli adempimenti che la presidiano, anche in altri domini: è il
// punto in cui il grafo cross-dominio produce valore consulenziale invece che solo
// deduplicazione.

export type FamigliaReato = {
  /** Articolo del decreto che introduce la famiglia. */
  readonly articolo: string;
  readonly titolo: string;
  /** Sanzione interdittiva prevista per la famiglia (art. 9 c.2). */
  readonly interdittive: boolean;
  /** Adempimenti che presidiano la famiglia, anche di domini diversi dal 231. */
  readonly presidi: readonly { readonly dominio: Dominio; readonly codice: string }[];
  /** Note operative per l'OdV. */
  readonly nota?: string;
};

/**
 * Le famiglie rilevanti per gli adempimenti presenti nei nostri cataloghi.
 *
 * Non è l'elenco completo degli artt. 24 – 25-duodevicies, e non finge di esserlo: contiene
 * le famiglie che i tre cataloghi presidiano davvero. Estenderlo è lavoro di contenuto, non
 * di codice.
 */
export const FAMIGLIE_REATO: readonly FamigliaReato[] = [
  {
    articolo: "Art. 24",
    titolo: "Indebita percezione di erogazioni e frode in danno dello Stato",
    interdittive: true,
    presidi: [
      { dominio: "d231", codice: "M26" }, // Flusso: contributi pubblici
      { dominio: "d231", codice: "M34" }, // Flusso: gare e appalti pubblici
    ],
    nota: "Fondi PNRR e rendicontazione contributi: il flusso verso l'OdV è il presidio primario.",
  },
  {
    articolo: "Art. 24-bis",
    titolo: "Delitti informatici e trattamento illecito di dati",
    interdittive: true,
    presidi: [
      { dominio: "d231", codice: "M50" }, // Audit IT
      { dominio: "d231", codice: "M61" }, // Verifica reati informatici L. 90/2024
      { dominio: "gdpr", codice: "T08" }, // Misure di sicurezza art. 32
      { dominio: "gdpr", codice: "R02" }, // Sicurezza dei trattamenti
    ],
    nota: "È il punto di contatto più stretto fra 231 e GDPR: le misure dell'art. 32 sono il presidio.",
  },
  {
    articolo: "Art. 25",
    titolo: "Peculato, concussione, corruzione e induzione indebita",
    interdittive: true,
    presidi: [
      { dominio: "d231", codice: "M25" }, // Flusso: rapporti con PA / ex PA
      { dominio: "d231", codice: "M27" }, // Flusso: donazioni, sponsorizzazioni, omaggi
      { dominio: "d231", codice: "M34" }, // Flusso: gare e appalti
      { dominio: "d231", codice: "M16" }, // Verifica procure e deleghe
    ],
    nota: "Pantouflage, soglie sugli omaggi e coerenza delle procure sono i tre presidi classici.",
  },
  {
    articolo: "Art. 25-ter",
    titolo: "Reati societari",
    interdittive: false,
    presidi: [
      { dominio: "d231", codice: "M59" }, // Verifica reati societari e false comunicazioni
      { dominio: "d231", codice: "M29" }, // Flusso: operazioni societarie straordinarie
    ],
  },
  {
    articolo: "Art. 25-septies",
    titolo: "Omicidio colposo e lesioni gravi con violazione delle norme antinfortunistiche",
    interdittive: true,
    presidi: [
      { dominio: "d81", codice: "S01" }, // DVR
      { dominio: "d81", codice: "S02" }, // DUVRI
      { dominio: "d81", codice: "S22" }, // Nomina RSPP
      { dominio: "d81", codice: "S59" }, // Riunione periodica art. 35
      { dominio: "d231", codice: "M47" }, // Audit sicurezza art. 30
      { dominio: "d231", codice: "M21" }, // Flusso infortuni
    ],
    nota: "È il collegamento più pesante della suite: l'esimente dell'art. 6 passa dal sistema di gestione richiesto dall'art. 30 D.Lgs 81/08. Un DVR scaduto indebolisce direttamente la difesa dell'ente.",
  },
  {
    articolo: "Art. 25-octies.1",
    titolo: "Riciclaggio, autoriciclaggio e impiego di denaro di provenienza illecita",
    interdittive: true,
    presidi: [
      { dominio: "d231", codice: "M49" }, // Audit finanziari
      { dominio: "d231", codice: "M28" }, // Flusso: anomalie ciclo attivo/passivo
    ],
  },
  {
    articolo: "Art. 25-undecies",
    titolo: "Reati ambientali",
    interdittive: true,
    presidi: [
      { dominio: "d231", codice: "M48" }, // Audit ambiente
      { dominio: "d231", codice: "M30" }, // Flusso: incidenti ambientali
      { dominio: "d231", codice: "M60" }, // Verifica reati ambientali
    ],
  },
  {
    articolo: "Art. 25-quinquiesdecies",
    titolo: "Reati tributari",
    interdittive: false,
    presidi: [
      { dominio: "d231", codice: "M62" }, // Reati tributari: soglie ed esterovestizione
      { dominio: "d231", codice: "M33" }, // Flusso: verifiche fiscali e doganali
    ],
  },
];

/** Le famiglie che un dato adempimento contribuisce a presidiare. */
export function famigliePresidiateDa(dominio: Dominio, codice: string): readonly FamigliaReato[] {
  return FAMIGLIE_REATO.filter((f) => f.presidi.some((p) => p.dominio === dominio && p.codice === codice));
}

export type CoperturaReato = {
  readonly famiglia: FamigliaReato;
  readonly presidiTotali: number;
  /** Presidi completati e in regola sui tempi. */
  readonly presidiInOrdine: number;
  /** Presidi che non reggerebbero: codici, con il dominio. */
  readonly scoperti: readonly string[];
  /** 0-100. `null` se nessuno dei presidi appartiene a un modulo attivo. */
  readonly copertura: number | null;
};

/**
 * Quanto è presidiata ciascuna famiglia di reati, guardando i tre domini insieme.
 *
 * È la vista che serve all'OdV per la relazione al CdA: non «42 attività aperte», ma «il
 * rischio 25-septies è coperto al 30% e mancano il DVR e la riunione art. 35».
 */
export function coperturaReati(
  adempimenti: readonly {
    readonly dominio: Dominio;
    readonly codice: string;
    readonly stato: string;
    readonly statoScadenza: string;
  }[],
  dominiAttivi: readonly Dominio[],
): readonly CoperturaReato[] {
  return FAMIGLIE_REATO.map((famiglia): CoperturaReato => {
    const rilevanti = famiglia.presidi.filter((p) => dominiAttivi.includes(p.dominio));
    const trovati = rilevanti
      .map((p) => adempimenti.find((a) => a.dominio === p.dominio && a.codice === p.codice))
      .filter((a): a is NonNullable<typeof a> => a !== undefined);

    const inOrdine = trovati.filter((a) => a.stato === "Completata" && a.statoScadenza !== "Scaduta");

    return {
      famiglia,
      presidiTotali: trovati.length,
      presidiInOrdine: inOrdine.length,
      scoperti: trovati.filter((a) => !inOrdine.includes(a)).map((a) => `${a.dominio}:${a.codice}`),
      copertura: trovati.length === 0 ? null : Math.round((inOrdine.length / trovati.length) * 100),
    };
  });
}

/** Verifica di integrità: ogni presidio dichiarato deve esistere nei cataloghi. */
export function presidiRotti(
  cataloghi: Readonly<Record<Dominio, readonly { readonly codice: string }[]>>,
): readonly string[] {
  const rotti: string[] = [];
  for (const f of FAMIGLIE_REATO) {
    for (const p of f.presidi) {
      if (!cataloghi[p.dominio].some((t) => t.codice === p.codice)) {
        rotti.push(`${f.articolo} → presidio inesistente ${p.dominio}:${p.codice}`);
      }
    }
  }
  return rotti;
}
