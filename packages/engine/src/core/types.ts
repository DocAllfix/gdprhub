// Vocabolario di dominio del motore, comune ai tre decreti.
//
// Questi tipi sono la frontiera fra il motore e il resto del sistema: il motore non conosce
// il database, non conosce React, non conosce il fornitore di hosting. Riceve strutture
// semplici e restituisce numeri e giudizi.

/** I tre corpi normativi presidiati dalla suite. */
export const DOMINI = ["gdpr", "d231", "d81"] as const;
export type Dominio = (typeof DOMINI)[number];

export const ETICHETTE_DOMINIO: Readonly<
  Record<Dominio, { readonly breve: string; readonly esteso: string; readonly norma: string }>
> = {
  gdpr: { breve: "GDPR", esteso: "Protezione dei dati personali", norma: "Reg. UE 2016/679" },
  d231: { breve: "231", esteso: "Responsabilità amministrativa degli enti", norma: "D.Lgs 231/2001" },
  d81: { breve: "81/08", esteso: "Salute e sicurezza sul lavoro", norma: "D.Lgs 81/2008" },
};

/**
 * Con quale cadenza un adempimento va rinnovato.
 *
 * I tre prototipi lo esprimevano in modi incompatibili: etichette nel GDPR e nel 231,
 * stringhe libere parsate a regex nell'81/08. Qui il modello è uno e distingue quattro
 * nature che si comportano diversamente nel calcolo della scadenza.
 */
export type Periodicita =
  /** Si ripete ogni N mesi: la scadenza si DERIVA dall'ultima esecuzione. */
  | { readonly tipo: "periodica"; readonly mesi: number }
  /** Presidio permanente: non ha una scadenza propria, si sorveglia e basta. */
  | { readonly tipo: "continua" }
  /** Scatta al verificarsi di un fatto: la scadenza, se c'è, è esplicita. */
  | { readonly tipo: "evento" }
  /** Si esegue una volta sola. */
  | { readonly tipo: "una_tantum" };

export const PRIORITA = ["Critica", "Alta", "Media", "Bassa"] as const;
export type Priorita = (typeof PRIORITA)[number];

/**
 * STATO DEL LAVORO — persistito, lo decide una persona.
 *
 * «In ritardo» e «Scaduto» non compaiono qui, ed è la correzione centrale rispetto ai
 * prototipi: erano stati salvati, e per questo potevano contraddire la data. Nel GDPR tre
 * controlli risultavano in ritardo con scadenza futura, e nel 231 la stessa cosa. Il
 * ritardo è un derivato e vive in `StatoScadenza`.
 *
 * «Non applicabile» è un'aggiunta: un DPO o un RSPP deve poter escludere un adempimento
 * motivando la scelta, altrimenti ogni percentuale è falsata verso il basso.
 */
export const STATI_LAVORO = ["Da fare", "In corso", "Completata", "Non applicabile"] as const;
export type StatoLavoro = (typeof STATI_LAVORO)[number];

/**
 * STATO DELLA SCADENZA — derivato, lo calcola la data.
 *
 * Ortogonale allo stato del lavoro: un adempimento «Completata» la cui ultima esecuzione
 * risale a quattro anni fa, su periodicità triennale, è **Completata e Scaduta**. È una
 * situazione reale che nessuno dei tre prototipi sapeva esprimere.
 */
export const STATI_SCADENZA = ["Regolare", "In scadenza", "Scaduta", "Da programmare"] as const;
export type StatoScadenza = (typeof STATI_SCADENZA)[number];

/** Voce di catalogo: cosa va presidiato, indipendentemente dal cliente. */
export type AdempimentoTemplate = {
  readonly dominio: Dominio;
  readonly codice: string;
  readonly titolo: string;
  readonly descrizione: string;
  /**
   * Annotazione operativa del prototipo, distinta dalla descrizione.
   * Nel 231 sono spesso l'indicazione più preziosa («Entro 24h a OdV», «Coordinamento
   * DPO-OdV 72h», «Interferenza 231-81»): sono le tracce dei collegamenti fra domini.
   */
  readonly nota: string | null;
  /** Riferimento normativo puntuale, es. «Art. 30.1 GDPR» o «Art. 28-29 D.Lgs 81/08». */
  readonly riferimento: string;
  readonly categoria: string;
  /** Chi risponde: varia per dominio (Titolare/DPO · OdV/CdA · Datore di lavoro/RSPP). */
  readonly ruolo: string;
  readonly periodicita: Periodicita;
  readonly prioritaDefault: Priorita;
  /** Rischio intrinseco 1-10. Solo il catalogo GDPR lo esprime; altrove è `null`. */
  readonly rischioDefault: number | null;
};

/**
 * Adempimento calato su un'azienda cliente: è ciò su cui il motore calcola.
 *
 * `ultimaEsecuzione` e `scadenzaEsplicita` sono date di calendario ISO `YYYY-MM-DD`, non
 * istanti: un adempimento non si esegue «alle 14:30», si esegue in un giorno. Trattarlo
 * come istante introduce errori nelle due notti del cambio d'ora.
 */
export type Adempimento = {
  readonly codice: string;
  readonly dominio: Dominio;
  readonly categoria: string;
  readonly ruolo: string;
  readonly stato: StatoLavoro;
  readonly priorita: Priorita;
  /** 1-10, oppure `null` quando il dominio non lo esprime. */
  readonly rischio: number | null;
  readonly periodicita: Periodicita;
  /** Data ISO dell'ultima volta che è stato eseguito. `null` se mai eseguito. */
  readonly ultimaEsecuzione: string | null;
  /**
   * Scadenza fissata a mano. Vale per gli adempimenti a evento e una tantum, dove non c'è
   * nulla da derivare. Per i periodici viene ignorata: comanda l'ultima esecuzione.
   */
  readonly scadenzaEsplicita: string | null;
};

/** Un adempimento con la scadenza già risolta e classificata. */
export type AdempimentoRisolto = Adempimento & {
  /** Data ISO, oppure `null` per i presidi continui e per chi non è mai stato eseguito. */
  readonly scadenza: string | null;
  readonly statoScadenza: StatoScadenza;
  /** Negativo se in ritardo, `null` se non c'è una scadenza da confrontare. */
  readonly giorniAllaScadenza: number | null;
};
