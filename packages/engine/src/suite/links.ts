import type { AdempimentoRisolto, Dominio } from "../core/types";

// Il grafo che rende la suite più della somma dei tre moduli.
//
// I tre decreti non sono silos: si intrecciano nella pratica professionale e nella norma.
// La prova sta nei prototipi stessi del committente, che avevano già annotato a mano i
// collegamenti senza poterli rappresentare: «Coordinamento DPO-OdV 72h», «Interferenza
// 231-81», «Art. 28 D.Lgs 81/08» dentro il catalogo 231.
//
// Il ponte normativo è reale:
//   art. 30 D.Lgs 81/08      un MOG 231 efficace richiede un sistema di gestione sicurezza
//   art. 25-septies 231      omicidio colposo e lesioni gravi con violazione antinfortunistica
//                            sono reati presupposto: l'ENTE risponde
//   art. 24-bis 231          delitti informatici: tocca le misure dell'art. 32 GDPR
//   art. 6 c.2 lett. d 231   flussi informativi verso l'OdV, fra cui il data breach
//
// MODELLO: adempimento unico, doppia lettura.
// Il DVR si censisce UNA volta nel modulo che ne è proprietario (81/08) e il 231 lo LEGGE.
// Una scadenza, una evidenza, due viste. Se il modulo proprietario non è attivo per
// quell'azienda, il modulo lettore lo prende in carico da sé: nessun buco.

export type TipoCollegamento =
  /** Lo stesso presidio soddisfa obblighi di due decreti. Il lettore non duplica: legge. */
  | "presidio_condiviso"
  /** Un fatto del dominio di origine deve essere comunicato nel dominio di destinazione. */
  | "flusso_informativo"
  /** Una violazione nel dominio di origine può far scattare la responsabilità nel destinazione. */
  | "reato_presupposto"
  /** La stessa evidenza documentale vale per entrambi: si carica una volta sola. */
  | "evidenza_condivisa";

export type Collegamento = {
  /** Dominio e codice di chi POSSIEDE l'adempimento: lì si censisce e si aggiorna. */
  readonly da: { readonly dominio: Dominio; readonly codice: string };
  /** Dominio e codice di chi lo LEGGE. */
  readonly a: { readonly dominio: Dominio; readonly codice: string };
  readonly tipo: TipoCollegamento;
  /** La norma che giustifica il collegamento. Va mostrata all'utente, non nascosta. */
  readonly riferimento: string;
  /** Perché esiste, in una riga leggibile da un consulente. */
  readonly motivo: string;
};

/**
 * I collegamenti curati, tutti tracciabili a un'annotazione dei prototipi o a una norma.
 *
 * Non è un elenco esaustivo e non pretende di esserlo: è la prima stesura, da estendere
 * con il committente. Ogni voce dichiara la propria fonte.
 */
export const COLLEGAMENTI: readonly Collegamento[] = [
  // --- Sicurezza sul lavoro dentro il MOG 231 -------------------------------------------
  // Il catalogo 231 contiene un'intera categoria «Datore di Lavoro - Sicurezza» che
  // duplica adempimenti dell'81/08. Il proprietario è sempre l'81/08.
  {
    da: { dominio: "d81", codice: "S01" },
    a: { dominio: "d231", codice: "M53" },
    tipo: "presidio_condiviso",
    riferimento: "Art. 28 D.Lgs 81/08 · art. 30 D.Lgs 81/08 · art. 25-septies D.Lgs 231/01",
    motivo:
      "Il DVR è il presidio su cui si regge il sistema di gestione della sicurezza richiesto dall'art. 30 come esimente 231.",
  },
  {
    da: { dominio: "d81", codice: "S02" },
    a: { dominio: "d231", codice: "M54" },
    tipo: "presidio_condiviso",
    riferimento: "Art. 26 D.Lgs 81/08 · art. 30 D.Lgs 81/08",
    motivo: "Il DUVRI negli appalti è parte del sistema di gestione richiesto per l'esimente.",
  },
  {
    da: { dominio: "d81", codice: "S22" },
    a: { dominio: "d231", codice: "M55" },
    tipo: "presidio_condiviso",
    riferimento: "Art. 17 e 31 D.Lgs 81/08 · art. 30 D.Lgs 81/08",
    motivo: "La nomina dell'RSPP è un requisito organizzativo del sistema di gestione.",
  },
  {
    da: { dominio: "d81", codice: "S24" },
    a: { dominio: "d231", codice: "M55" },
    tipo: "presidio_condiviso",
    riferimento: "Art. 18 c.1 lett. a D.Lgs 81/08",
    motivo: "La nomina del medico competente concorre allo stesso adempimento 231.",
  },
  {
    da: { dominio: "d81", codice: "S59" },
    a: { dominio: "d231", codice: "M56" },
    tipo: "presidio_condiviso",
    riferimento: "Art. 35 D.Lgs 81/08",
    motivo: "La riunione periodica è l'adempimento che il 231 richiama per verbale e coinvolgimento RLS.",
  },
  {
    da: { dominio: "d81", codice: "S47" },
    a: { dominio: "d231", codice: "M57" },
    tipo: "presidio_condiviso",
    riferimento: "Art. 41 D.Lgs 81/08",
    motivo: "La sorveglianza sanitaria è presidiata nell'81/08 e letta dal 231.",
  },
  {
    da: { dominio: "d81", codice: "S60" },
    a: { dominio: "d231", codice: "M58" },
    tipo: "presidio_condiviso",
    riferimento: "Art. 50 D.Lgs 81/08",
    motivo: "La consultazione del RLS è l'adempimento che il 231 richiama sui rapporti con i rappresentanti.",
  },

  // --- Flussi informativi verso l'OdV ---------------------------------------------------
  // Annotati a mano nel prototipo 231, senza poterli collegare.
  {
    da: { dominio: "d81", codice: "S61" },
    a: { dominio: "d231", codice: "M21" },
    tipo: "flusso_informativo",
    riferimento: "Art. 6 c.2 lett. d D.Lgs 231/01 · art. 25-septies",
    motivo:
      "Un infortunio denunciato all'INAIL va comunicato all'OdV entro 24 ore: è la nota del prototipo, ed è anche il fatto da cui può nascere la responsabilità dell'ente.",
  },
  {
    da: { dominio: "d81", codice: "S63" },
    a: { dominio: "d231", codice: "M21" },
    tipo: "flusso_informativo",
    riferimento: "Art. 6 c.2 lett. d D.Lgs 231/01",
    motivo: "Il registro infortuni alimenta il flusso informativo verso l'OdV.",
  },
  {
    da: { dominio: "gdpr", codice: "T04" },
    a: { dominio: "d231", codice: "M31" },
    tipo: "flusso_informativo",
    riferimento: "Art. 33 GDPR · art. 6 c.2 lett. d D.Lgs 231/01",
    motivo:
      "Il registro delle violazioni alimenta il flusso verso l'OdV: è la nota «Coordinamento DPO-OdV 72h» del prototipo 231.",
  },
  {
    da: { dominio: "gdpr", codice: "R04" },
    a: { dominio: "d231", codice: "M31" },
    tipo: "flusso_informativo",
    riferimento: "Art. 33.2 GDPR",
    motivo: "La notifica del responsabile al titolare fa parte della stessa catena informativa.",
  },

  // --- Reati informatici: art. 24-bis ---------------------------------------------------
  {
    da: { dominio: "gdpr", codice: "T08" },
    a: { dominio: "d231", codice: "M50" },
    tipo: "presidio_condiviso",
    riferimento: "Art. 32 GDPR · art. 24-bis D.Lgs 231/01",
    motivo:
      "Le misure di sicurezza dell'art. 32 sono i presidi che l'audit IT del 231 verifica: è la nota «Reati informatici 24-bis» del prototipo.",
  },
  {
    da: { dominio: "gdpr", codice: "R02" },
    a: { dominio: "d231", codice: "M50" },
    tipo: "presidio_condiviso",
    riferimento: "Art. 32 GDPR · art. 24-bis D.Lgs 231/01",
    motivo: "Le misure tecniche del responsabile concorrono allo stesso audit.",
  },

  // --- Audit sulla sicurezza: la nota «Interferenza 231-81» -----------------------------
  {
    da: { dominio: "d81", codice: "S01" },
    a: { dominio: "d231", codice: "M47" },
    tipo: "reato_presupposto",
    riferimento: "Art. 30 D.Lgs 81/08 · art. 25-septies D.Lgs 231/01",
    motivo:
      "L'audit 231 sulla sicurezza verifica proprio il sistema dell'art. 30: senza DVR aggiornato l'esimente non regge.",
  },

  // --- Formazione: la stessa aula, tre obblighi -----------------------------------------
  {
    da: { dominio: "gdpr", codice: "T14" },
    a: { dominio: "d231", codice: "M42" },
    tipo: "evidenza_condivisa",
    riferimento: "Art. 39 GDPR · art. 6 c.2 lett. e D.Lgs 231/01",
    motivo: "Attestati e registri presenze della formazione valgono come evidenza per entrambi gli obblighi.",
  },
  {
    da: { dominio: "d81", codice: "S33" },
    a: { dominio: "d231", codice: "M42" },
    tipo: "evidenza_condivisa",
    riferimento: "Art. 37 D.Lgs 81/08",
    motivo: "La formazione sulla sicurezza documenta anche la parte 231 relativa all'art. 25-septies.",
  },
];

// --- Risoluzione ---------------------------------------------------------------------

export type VoceLetta = {
  readonly collegamento: Collegamento;
  /** L'adempimento del modulo proprietario, con il suo stato reale. */
  readonly origine: AdempimentoRisolto;
};

/** Indice: per ogni adempimento lettore, quali collegamenti lo alimentano. */
const perDestinazione = new Map<string, Collegamento[]>();
for (const c of COLLEGAMENTI) {
  const k = `${c.a.dominio}:${c.a.codice}`;
  const g = perDestinazione.get(k);
  if (g) g.push(c);
  else perDestinazione.set(k, [c]);
}

const chiave = (dominio: Dominio, codice: string) => `${dominio}:${codice}`;

/**
 * Cosa vede il modulo lettore per un dato adempimento.
 *
 * Restituisce le voci lette dai moduli proprietari **attivi**. Se il proprietario non è
 * attivo per quell'azienda, il collegamento non produce nulla e il lettore censisce
 * l'adempimento per conto proprio: è la regola di ripiego, e impedisce che disattivare un
 * modulo apra un buco silenzioso.
 */
export function letturePer(
  dominio: Dominio,
  codice: string,
  adempimenti: readonly AdempimentoRisolto[],
  dominiAttivi: readonly Dominio[],
): readonly VoceLetta[] {
  const collegamenti = perDestinazione.get(chiave(dominio, codice)) ?? [];
  return collegamenti
    .filter((c) => dominiAttivi.includes(c.da.dominio))
    .map((c) => {
      const origine = adempimenti.find((a) => a.dominio === c.da.dominio && a.codice === c.da.codice);
      return origine ? { collegamento: c, origine } : null;
    })
    .filter((v): v is VoceLetta => v !== null);
}

/**
 * Gli adempimenti che il modulo lettore NON deve censire per conto proprio, perché li
 * legge da un modulo proprietario attivo. È ciò che evita la doppia scadenza e la doppia
 * evidenza.
 */
export function codiciDelegati(dominio: Dominio, dominiAttivi: readonly Dominio[]): readonly string[] {
  return [
    ...new Set(
      COLLEGAMENTI.filter(
        (c) =>
          c.a.dominio === dominio && c.tipo === "presidio_condiviso" && dominiAttivi.includes(c.da.dominio),
      ).map((c) => c.a.codice),
    ),
  ];
}

/** Dove un adempimento viene letto: serve a mostrare «questo alimenta anche il 231». */
export function lettoDa(dominio: Dominio, codice: string): readonly Collegamento[] {
  return COLLEGAMENTI.filter((c) => c.da.dominio === dominio && c.da.codice === codice);
}

/**
 * Verifica di integrità del grafo: ogni estremo deve puntare a un adempimento esistente.
 * Un collegamento rotto è peggio di un collegamento assente, perché fa sparire un obbligo.
 */
export function collegamentiRotti(
  cataloghi: Readonly<Record<Dominio, readonly { readonly codice: string }[]>>,
): readonly string[] {
  const esiste = (d: Dominio, c: string) => cataloghi[d].some((t) => t.codice === c);
  const rotti: string[] = [];
  for (const c of COLLEGAMENTI) {
    if (!esiste(c.da.dominio, c.da.codice)) rotti.push(`origine inesistente: ${c.da.dominio}:${c.da.codice}`);
    if (!esiste(c.a.dominio, c.a.codice))
      rotti.push(`destinazione inesistente: ${c.a.dominio}:${c.a.codice}`);
    if (c.da.dominio === c.a.dominio)
      rotti.push(`collegamento interno al dominio: ${c.da.dominio}:${c.da.codice}`);
  }
  return rotti;
}
