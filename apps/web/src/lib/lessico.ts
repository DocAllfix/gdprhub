import type { Dominio } from "@legisboard/engine";

// Il modello dati è uno, il lessico è quello di chi legge.
//
// Un DPO dice «controlli», un OdV «flussi informativi» e «vigilanza», un RSPP «scadenze» e
// «nomine». Normalizzare tutto su «adempimento» sarebbe corretto e sbagliato: farebbe suonare
// il prodotto come un software generico calato dall'alto su tre mestieri diversi.
//
// Qui vivono anche le etichette dei due profili di istanza, perché è la stessa questione:
// per un consulente l'entità si chiama «cliente», per un'azienda «la mia organizzazione».

export type ProfiloIstanza = "consulente" | "azienda";

type VoceLessico = {
  /** Nome del modulo nella navigazione. */
  readonly modulo: string;
  /** Come chiama i suoi adempimenti chi lavora in questo dominio. */
  readonly adempimento: string;
  readonly adempimenti: string;
  /** Chi risponde, nel vocabolario del dominio. */
  readonly responsabile: string;
  /** Titolo della vista di assessment. */
  readonly assessment: string;
  /** L'autorità che può presentarsi: serve al fascicolo ispettivo. */
  readonly autorita: string;
};

export const LESSICO: Readonly<Record<Dominio, VoceLessico>> = {
  gdpr: {
    modulo: "Protezione dati",
    adempimento: "controllo",
    adempimenti: "controlli",
    responsabile: "ruolo",
    assessment: "Stato dei controlli",
    autorita: "Garante per la protezione dei dati personali",
  },
  d231: {
    modulo: "Modello 231",
    adempimento: "attività di vigilanza",
    adempimenti: "attività di vigilanza",
    responsabile: "funzione",
    assessment: "Piano di vigilanza",
    autorita: "Autorità giudiziaria",
  },
  d81: {
    modulo: "Sicurezza sul lavoro",
    adempimento: "scadenza",
    adempimenti: "scadenze e nomine",
    responsabile: "figura",
    assessment: "Scadenzario sicurezza",
    autorita: "Ispettorato del Lavoro e ASL",
  },
};

type VoceProfilo = {
  readonly cliente: string;
  readonly clienti: string;
  readonly portafoglio: string;
  readonly nessunCliente: string;
};

export const PROFILO: Readonly<Record<ProfiloIstanza, VoceProfilo>> = {
  consulente: {
    cliente: "azienda cliente",
    clienti: "aziende clienti",
    portafoglio: "Portafoglio",
    nessunCliente: "Nessuna azienda in portafoglio",
  },
  azienda: {
    cliente: "organizzazione",
    clienti: "sedi",
    portafoglio: "La mia organizzazione",
    nessunCliente: "Organizzazione non ancora configurata",
  },
};

/** Prima lettera maiuscola, per usare le stesse voci a inizio frase. */
export const maiuscola = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);
