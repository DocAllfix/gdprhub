// Esposizione sanzionatoria ex D.Lgs 81/2008.
//
// Qui la logica è diversa dagli altri due domini, e la differenza va detta apertamente
// nella relazione invece di essere nascosta dietro un numero omogeneo.
//
// Nel GDPR e nel 231 la sanzione colpisce l'ENTE ed è pecuniaria. Nell'81/08 le violazioni
// sono in larga parte CONTRAVVENZIONI PENALI che colpiscono le PERSONE FISICHE: datore di
// lavoro, dirigente, preposto, RSPP, medico competente. La pena è arresto o ammenda, e
// l'importo è aggiornato periodicamente con decreto direttoriale.
//
// Di conseguenza:
//   - non si produce una cifra unica «per l'azienda», perché non esiste;
//   - si espone l'ammenda per fattispecie, con la persona che ne risponde;
//   - si segnala il ponte con il 231, che è la vera esposizione dell'ente.
//
// PONTE CON IL 231
// L'art. 25-septies D.Lgs 231/2001 rende l'omicidio colposo e le lesioni gravi commessi con
// violazione delle norme antinfortunistiche un reato presupposto: se un infortunio grave
// discende da una violazione dell'81/08, l'ente risponde con la sanzione per quote e con le
// interdittive. È il collegamento cross-dominio più pesante di tutta la suite.

/** Chi risponde personalmente della contravvenzione. */
export type SoggettoResponsabile =
  "Datore di lavoro" | "Dirigente" | "Preposto" | "RSPP" | "Medico competente" | "Lavoratore";

export type FattispecieSanzionatoria = {
  readonly codiceAdempimento: string;
  readonly riferimento: string;
  readonly soggetto: SoggettoResponsabile;
  /** Ammenda in euro, forbice edittale. */
  readonly ammenda: { readonly min: number; readonly max: number };
  /** Arresto previsto in alternativa o in aggiunta, se applicabile. */
  readonly arresto: string | null;
  /** Vero se la violazione può concorrere a un reato presupposto ex art. 25-septies. */
  readonly rilevante231: boolean;
};

export type EsposizioneD81 = {
  /** Somma delle ammende minime delle fattispecie scoperte. */
  readonly ammendeMinimo: number;
  readonly ammendeMassimo: number;
  readonly fattispecie: readonly FattispecieSanzionatoria[];
  /** Quante fra queste possono attivare la responsabilità dell'ente ex art. 25-septies. */
  readonly rilevanti231: number;
  readonly metodo: string;
  readonly assunzioni: readonly string[];
};

/**
 * Fattispecie sanzionatorie indicizzate per codice del catalogo 81/08.
 *
 * Non esaurisce il Titolo XII: copre gli adempimenti cardine fra quelli estratti dal
 * prototipo, e si estende man mano. Gli importi sono soggetti a rivalutazione periodica con
 * decreto direttoriale, quindi vivono qui come dati versionati e non come costanti sparse
 * nel codice.
 */
const TABELLA: Readonly<Record<string, Omit<FattispecieSanzionatoria, "codiceAdempimento">>> = {
  // DVR — omessa redazione: è la violazione cardine del decreto.
  S01: {
    riferimento: "Art. 55 c.1 lett. a) — omessa valutazione dei rischi",
    soggetto: "Datore di lavoro",
    ammenda: { min: 3071, max: 7862 },
    arresto: "da 3 a 6 mesi",
    rilevante231: true,
  },
  // DUVRI — appalti.
  S02: {
    riferimento: "Art. 55 c.5 lett. d) — omesso DUVRI negli appalti",
    soggetto: "Datore di lavoro",
    ammenda: { min: 2740, max: 7014 },
    arresto: "da 2 a 4 mesi",
    rilevante231: true,
  },
  // Piano di emergenza ed evacuazione.
  S06: {
    riferimento: "Art. 55 c.5 lett. a) — misure di emergenza ed evacuazione",
    soggetto: "Datore di lavoro",
    ammenda: { min: 2192, max: 4384 },
    arresto: "da 2 a 4 mesi",
    rilevante231: true,
  },
};

/**
 * Esposizione sanzionatoria per gli adempimenti dell'81/08 non presidiati.
 *
 * Riceve i codici scoperti e restituisce le fattispecie note fra quelli. Gli adempimenti
 * per cui la tabella non ha una fattispecie non producono numeri inventati: semplicemente
 * non compaiono, e il chiamante sa che l'elenco non è esaustivo.
 */
export function esposizioneD81(codiciScoperti: readonly string[]): EsposizioneD81 {
  const fattispecie = codiciScoperti
    .map((codiceAdempimento) => {
      const f = TABELLA[codiceAdempimento];
      return f ? { codiceAdempimento, ...f } : null;
    })
    .filter((f): f is FattispecieSanzionatoria => f !== null);

  return {
    ammendeMinimo: fattispecie.reduce((t, f) => t + f.ammenda.min, 0),
    ammendeMassimo: fattispecie.reduce((t, f) => t + f.ammenda.max, 0),
    fattispecie,
    rilevanti231: fattispecie.filter((f) => f.rilevante231).length,
    metodo: "D.Lgs 81/2008, Titolo XII — sanzioni per contravvenzioni",
    assunzioni: [
      "Le sanzioni dell'81/08 sono contravvenzioni penali a carico delle PERSONE FISICHE " +
        "(datore di lavoro, dirigente, preposto, RSPP, medico competente), non dell'azienda: " +
        "sommarle a quelle GDPR e 231 come se fossero omogenee sarebbe fuorviante.",
      "Gli importi delle ammende sono soggetti a rivalutazione periodica con decreto direttoriale: " +
        "vanno verificati alla data della relazione.",
      "L'elenco copre le fattispecie principali riferite agli adempimenti del catalogo e non " +
        "esaurisce il Titolo XII.",
      "L'estinzione agevolata ex artt. 20-21 D.Lgs 758/1994 può ridurre l'ammenda a un quarto " +
        "del massimo in caso di regolarizzazione entro il termine prescritto.",
      "Le violazioni segnalate come rilevanti ex art. 25-septies D.Lgs 231/2001 possono attivare " +
        "la responsabilità amministrativa dell'ENTE se da esse discende un infortunio grave: " +
        "in quel caso l'esposizione va letta nel modulo 231.",
    ],
  };
}
