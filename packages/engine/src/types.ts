// Vocabolario di dominio del motore. Questi tipi sono la frontiera fra il motore e il
// resto del sistema: il motore non conosce il database, non conosce React, non conosce
// il fornitore di hosting. Riceve strutture semplici e restituisce numeri e giudizi.

/** Chi risponde dell'adempimento. Ricalca artt. 24, 28 e 37-39 GDPR. */
export const RUOLI = ["Titolare", "Responsabile", "DPO"] as const;
export type Ruolo = (typeof RUOLI)[number];

/** Con quale cadenza l'adempimento va rinnovato. */
export const FREQUENZE = [
  "Continuo",
  "Mensile",
  "Semestrale",
  "Annuale",
  "Al verificarsi",
  "Una tantum",
] as const;
export type Frequenza = (typeof FREQUENZE)[number];

export const PRIORITA = ["Critica", "Alta", "Media", "Bassa"] as const;
export type Priorita = (typeof PRIORITA)[number];

/**
 * Stati di un controllo calato su un cliente.
 *
 * Nota di modello: "In ritardo" NON è uno stato. Nel prototipo lo era, e questo produceva
 * dati incoerenti (tre controlli marcati in ritardo avevano scadenza futura). Il ritardo è
 * un DERIVATO di scadenza e stato, calcolato da `deadlines.ts`.
 *
 * "Non applicabile" è un'aggiunta rispetto al prototipo: un DPO deve poter escludere un
 * controllo motivando la scelta. Senza, ogni percentuale è falsata.
 */
export const STATI = ["Da fare", "In corso", "Completata", "Non applicabile"] as const;
export type Stato = (typeof STATI)[number];

/** Voce del catalogo: cosa va presidiato, indipendentemente dal cliente. */
export type ControlTemplate = {
  readonly codice: string;
  readonly titolo: string;
  readonly descrizione: string;
  readonly articolo: string;
  readonly ruolo: Ruolo;
  readonly frequenza: Frequenza;
  readonly prioritaDefault: Priorita;
  /** Rischio intrinseco 1-10 suggerito dal catalogo; sovrascrivibile sul singolo cliente. */
  readonly rischioDefault: number;
};

/**
 * Controllo calato su un cliente: è ciò su cui il motore calcola.
 * `scadenza` è una data di calendario ISO (`YYYY-MM-DD`), non un istante: una scadenza
 * non ha un'ora, e trattarla come tale introduce errori sul cambio di ora legale.
 */
export type Controllo = {
  readonly codice: string;
  readonly ruolo: Ruolo;
  readonly stato: Stato;
  readonly priorita: Priorita;
  /** 1-10. */
  readonly rischio: number;
  /** Data di calendario ISO `YYYY-MM-DD`. */
  readonly scadenza: string;
};
