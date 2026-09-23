// Identità del prodotto, in un posto solo.
//
// Ogni titolo, metadato, intestazione di relazione e testo di posta legge da qui.
//
// IL NOME È DECISO _(2026-09-23)_. `legisboard.it` e `legisboard.eu` sono stati registrati il
// 14 settembre; `docs/05-arretrato.md` §2.2 raccomandava `compliancedesk.it`, mai comprato, e
// la raccomandazione è stata superata dal committente. Il nome di lavoro «Suite Compliance»
// non esiste più.
//
// `nomeBreve` è stato tolto: non lo leggeva nessuno, e un secondo nome che nessuno usa è solo
// un invito a introdurre un'incoerenza il giorno che qualcuno lo scopre.

export const PRODOTTO = {
  nome: "Legisboard",
  descrizione:
    "Gestione integrata degli adempimenti GDPR, D.Lgs 231/2001 e D.Lgs 81/2008 per consulenti, DPO e organismi di vigilanza.",
  /**
   * Dominio di marca su cui poggiano i sottodomini delle istanze: `verdi.legisboard.it`.
   *
   * La vetrina gira ancora su `gdprhub.vercel.app`. Il dominio è registrato e per ora
   * parcheggiato su Hostinger.
   */
  dominio: "legisboard.it",
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
