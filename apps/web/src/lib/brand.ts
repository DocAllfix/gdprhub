// Identità del prodotto, in un posto solo.
//
// Il nome commerciale non è ancora deciso: lo screening dei domini ha dato
// `compliancedesk.it` libero come prima scelta e `compliancedossier.it` come seconda.
// Finché non si decide, «Suite Compliance» è il nome di lavoro.
//
// Ogni titolo, metadato, intestazione di relazione e testo di posta legge da qui: il giorno
// della decisione si cambia questo file, non si va a caccia di stringhe.

export const PRODOTTO = {
  nome: "Suite Compliance",
  nomeBreve: "Suite",
  descrizione:
    "Gestione integrata degli adempimenti GDPR, D.Lgs 231/2001 e D.Lgs 81/2008 per consulenti, DPO e organismi di vigilanza.",
  /** Dominio di marca su cui poggiano i sottodomini delle istanze. Da registrare. */
  dominio: "da-definire.it",
} as const;

/**
 * Il marchio dello STUDIO che possiede l'istanza, non il nostro.
 * Sovrascrive nome e logo nella shell e nell'intestazione delle relazioni: per uno studio
 * legale che consegna una perizia al CdA di un cliente, la carta intestata propria vale più
 * di molte funzionalità.
 */
export type Marchio = {
  readonly nome: string;
  readonly logoUrl: string | null;
  /** Colore del marchio dello studio. Non tocca gli stati né i domini: solo la shell. */
  readonly colore: string | null;
};

export const MARCHIO_PREDEFINITO: Marchio = { nome: PRODOTTO.nome, logoUrl: null, colore: null };
