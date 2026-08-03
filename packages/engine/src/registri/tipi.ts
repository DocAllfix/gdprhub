import type { Dominio } from "../core/types";
import { type DataISO } from "../core/deadlines";

// I REGISTRI DI FATTI.
//
// Fin qui il motore ha trattato ADEMPIMENTI: cose che si fanno a scadenza, dove la data si
// deriva dall'ultima esecuzione più la periodicità. I registri sono un'altra natura:
// raccolgono FATTI che accadono quando accadono — una violazione dei dati, la richiesta di
// un interessato, una segnalazione, un corso di formazione erogato a una persona.
//
// LA DIFFERENZA È IL TEMPO. Un adempimento chiede «ogni quanto»; un fatto chiede «entro
// quanto da quando si è saputo». L'art. 33 GDPR fa decorrere le 72 ore dal momento in cui il
// titolare ne viene a conoscenza, non dal momento del fatto: sono due date diverse e spesso
// distanti, e confonderle è il modo più comune di calcolare male un termine.
//
// TUTTE LE REGOLE STANNO QUI, non nelle schermate. Un termine calcolato dentro una vista è
// un termine che nessun test copre e che il giorno dopo diverge da quello della relazione.

export const TIPI_REGISTRO = [
  "violazione",
  "diritto",
  "segnalazione",
  "flusso-odv",
  "formazione",
  "sorveglianza",
  "verifica-attrezzatura",
  "fornitore",
  "trasferimento",
  "trattamento",
  "dpia",
] as const;

export type TipoRegistro = (typeof TIPI_REGISTRO)[number];

export type StatoRegistro = "aperto" | "in-istruttoria" | "chiuso" | "archiviato";

/** Come si misura il termine di un registro. */
export type RegolaTermine =
  | {
      /** Il termine decorre dalla conoscenza del fatto ed è espresso in ORE. */
      readonly tipo: "ore";
      readonly ore: number;
      /** Cosa si deve fare entro quel termine. */
      readonly obbligo: string;
    }
  | {
      readonly tipo: "giorni";
      readonly giorni: number;
      readonly obbligo: string;
      /** Alcuni termini si possono prorogare, e la proroga va motivata. */
      readonly prorogabileA?: number;
    }
  | {
      /** Nessun termine dal fatto: la voce ha una propria data di validità (o nessuna). */
      readonly tipo: "validita";
      readonly obbligo: string;
    }
  | {
      /** Anagrafica: esiste e va tenuta aggiornata, senza un termine che scade. */
      readonly tipo: "anagrafica";
      readonly obbligo: string;
    };

export type CampoRegistro = {
  readonly chiave: string;
  readonly etichetta: string;
  readonly tipo: "testo" | "testo-lungo" | "numero" | "data" | "scelta" | "booleano";
  readonly opzioni?: readonly string[];
  readonly obbligatorio?: boolean;
  /** Perché questo campo esiste. Compare come aiuto sotto al campo, non in un manuale. */
  readonly nota?: string;
};

export type DefinizioneRegistro = {
  readonly tipo: TipoRegistro;
  readonly dominio: Dominio;
  readonly nome: string;
  readonly nomeSingolare: string;
  readonly norma: string;
  /** A cosa serve, in una frase che non ripete il nome. */
  readonly scopo: string;
  readonly termine: RegolaTermine;
  /** Come si chiama la data di riferimento in questo registro. */
  readonly etichettaData: string;
  readonly campi: readonly CampoRegistro[];
};

// ============================================================================================
// Le definizioni
// ============================================================================================

export const REGISTRI: readonly DefinizioneRegistro[] = [
  {
    tipo: "violazione",
    dominio: "gdpr",
    nome: "Violazioni dei dati personali",
    nomeSingolare: "Violazione",
    norma: "Artt. 33-34 Reg. UE 2016/679",
    scopo:
      "Ogni violazione va registrata anche quando non si notifica: l'art. 33.5 impone la documentazione di tutte, e l'assenza del registro è essa stessa una contestazione.",
    termine: {
      tipo: "ore",
      ore: 72,
      obbligo: "Notifica all'autorità di controllo",
    },
    etichettaData: "Conosciuta il",
    campi: [
      {
        chiave: "categorie",
        etichetta: "Categorie di dati interessate",
        tipo: "testo",
        obbligatorio: true,
        nota: "Anagrafici, di contatto, particolari ex art. 9, giudiziari: la categoria determina la gravità.",
      },
      {
        chiave: "interessati",
        etichetta: "Interessati coinvolti (stima)",
        tipo: "numero",
        nota: "Una stima motivata vale più di un campo vuoto: l'art. 33.3 la richiede espressamente.",
      },
      {
        chiave: "natura",
        etichetta: "Natura della violazione",
        tipo: "scelta",
        opzioni: ["Perdita di riservatezza", "Perdita di integrità", "Perdita di disponibilità"],
        obbligatorio: true,
      },
      {
        chiave: "notificata",
        etichetta: "Notificata al Garante",
        tipo: "booleano",
        nota: "Se non notificata, la motivazione è obbligatoria: è ciò che l'art. 33.1 chiama «improbabile che presenti un rischio».",
      },
      {
        chiave: "comunicataInteressati",
        etichetta: "Comunicata agli interessati",
        tipo: "booleano",
        nota: "Dovuta ex art. 34 quando il rischio è elevato. Senza ritardo ingiustificato, non entro un termine fisso.",
      },
      { chiave: "misure", etichetta: "Misure adottate", tipo: "testo-lungo" },
    ],
  },
  {
    tipo: "diritto",
    dominio: "gdpr",
    nome: "Richieste degli interessati",
    nomeSingolare: "Richiesta",
    norma: "Artt. 12-22 Reg. UE 2016/679",
    scopo:
      "Il riscontro è dovuto anche quando la richiesta è infondata: il silenzio è la violazione più facile da contestare e la più semplice da evitare.",
    termine: {
      tipo: "giorni",
      giorni: 30,
      prorogabileA: 90,
      obbligo: "Riscontro all'interessato",
    },
    etichettaData: "Ricevuta il",
    campi: [
      {
        chiave: "diritto",
        etichetta: "Diritto esercitato",
        tipo: "scelta",
        opzioni: [
          "Accesso (art. 15)",
          "Rettifica (art. 16)",
          "Cancellazione (art. 17)",
          "Limitazione (art. 18)",
          "Portabilità (art. 20)",
          "Opposizione (art. 21)",
          "Decisione automatizzata (art. 22)",
        ],
        obbligatorio: true,
      },
      { chiave: "richiedente", etichetta: "Richiedente", tipo: "testo", obbligatorio: true },
      {
        chiave: "canale",
        etichetta: "Canale di arrivo",
        tipo: "scelta",
        opzioni: ["Posta elettronica", "PEC", "Raccomandata", "Modulo sul sito", "Di persona"],
      },
      {
        chiave: "identificato",
        etichetta: "Identità verificata",
        tipo: "booleano",
        nota: "Riscontrare senza aver verificato chi chiede è a sua volta una violazione: si comunicherebbero dati a un terzo.",
      },
      {
        chiave: "proroga",
        etichetta: "Motivazione della proroga",
        tipo: "testo-lungo",
        nota: "La proroga a novanta giorni va comunicata all'interessato entro i primi trenta, con i motivi.",
      },
    ],
  },
  {
    tipo: "segnalazione",
    dominio: "d231",
    nome: "Segnalazioni whistleblowing",
    nomeSingolare: "Segnalazione",
    norma: "D.Lgs 24/2023",
    scopo:
      "Il canale deve garantire la riservatezza del segnalante: qui si registra il fatto e il suo esito, non l'identità di chi ha segnalato.",
    termine: {
      tipo: "giorni",
      giorni: 7,
      obbligo: "Avviso di ricevimento al segnalante",
    },
    etichettaData: "Ricevuta il",
    campi: [
      {
        chiave: "canale",
        etichetta: "Canale",
        tipo: "scelta",
        opzioni: ["Interno scritto", "Interno orale", "Esterno ANAC", "Divulgazione pubblica"],
        obbligatorio: true,
      },
      { chiave: "ambito", etichetta: "Ambito della segnalazione", tipo: "testo", obbligatorio: true },
      {
        chiave: "anonima",
        etichetta: "Anonima",
        tipo: "booleano",
        nota: "Una segnalazione anonima va comunque istruita: l'anonimato non la rende inammissibile.",
      },
      {
        chiave: "istruttoriaChiusa",
        etichetta: "Istruttoria conclusa",
        tipo: "booleano",
        nota: "Il D.Lgs 24/2023 fissa tre mesi dall'avviso di ricevimento per il riscontro sull'esito.",
      },
      {
        chiave: "ritorsioni",
        etichetta: "Ritorsioni segnalate",
        tipo: "testo-lungo",
        nota: "Il divieto di ritorsione è autonomo dalla fondatezza della segnalazione, e la sua violazione è sanzionata a parte.",
      },
    ],
  },
  {
    tipo: "flusso-odv",
    dominio: "d231",
    nome: "Flussi informativi verso l'OdV",
    nomeSingolare: "Flusso",
    norma: "Art. 6 co. 2 lett. d) D.Lgs 231/2001",
    scopo:
      "L'OdV non può vigilare su ciò che non gli arriva: il flusso documentato è ciò che distingue un organismo effettivo da uno nominale.",
    termine: { tipo: "validita", obbligo: "Trasmissione all'Organismo di Vigilanza" },
    etichettaData: "Trasmesso il",
    campi: [
      { chiave: "fonte", etichetta: "Funzione che trasmette", tipo: "testo", obbligatorio: true },
      {
        chiave: "oggetto",
        etichetta: "Oggetto del flusso",
        tipo: "scelta",
        opzioni: [
          "Infortuni e quasi infortuni",
          "Sanzioni da enti pubblici",
          "Procedimenti giudiziari",
          "Operazioni societarie straordinarie",
          "Incidenti ambientali",
          "Violazioni privacy e data breach",
          "Anomalie sui protocolli 231",
        ],
        obbligatorio: true,
      },
      { chiave: "presaAtto", etichetta: "Presa d'atto dell'OdV", tipo: "booleano" },
      { chiave: "verbale", etichetta: "Verbale di riferimento", tipo: "testo" },
    ],
  },
  {
    tipo: "formazione",
    dominio: "d81",
    nome: "Formazione erogata",
    nomeSingolare: "Corso",
    norma: "Artt. 36-37 D.Lgs 81/2008 · Accordo Stato-Regioni",
    scopo:
      "La formazione scade per persona, non per azienda: un corso valido per venti lavoratori e scaduto per il ventunesimo è comunque una posizione scoperta.",
    termine: { tipo: "validita", obbligo: "Aggiornamento entro la scadenza del corso" },
    etichettaData: "Erogato il",
    campi: [
      { chiave: "lavoratore", etichetta: "Lavoratore", tipo: "testo", obbligatorio: true },
      { chiave: "mansione", etichetta: "Mansione", tipo: "testo" },
      {
        chiave: "corso",
        etichetta: "Tipo di corso",
        tipo: "scelta",
        opzioni: [
          "Formazione generale",
          "Formazione specifica",
          "Preposto",
          "Dirigente",
          "RLS",
          "Antincendio",
          "Primo soccorso",
          "Attrezzature specifiche",
        ],
        obbligatorio: true,
      },
      { chiave: "ore", etichetta: "Ore", tipo: "numero" },
      { chiave: "ente", etichetta: "Ente formatore", tipo: "testo" },
      {
        chiave: "scadenzaCorso",
        etichetta: "Valido fino al",
        tipo: "data",
        nota: "L'aggiornamento è quinquennale per la maggior parte dei corsi, triennale per il primo soccorso.",
      },
    ],
  },
  {
    tipo: "sorveglianza",
    dominio: "d81",
    nome: "Sorveglianza sanitaria",
    nomeSingolare: "Giudizio",
    norma: "Artt. 41-42 D.Lgs 81/2008",
    scopo:
      "Il giudizio di idoneità ha una validità e delle prescrizioni: entrambe vanno tracciate, perché una prescrizione dimenticata è una responsabilità del datore.",
    termine: { tipo: "validita", obbligo: "Visita periodica entro la scadenza del giudizio" },
    etichettaData: "Visita del",
    campi: [
      { chiave: "lavoratore", etichetta: "Lavoratore", tipo: "testo", obbligatorio: true },
      {
        chiave: "giudizio",
        etichetta: "Giudizio",
        tipo: "scelta",
        opzioni: [
          "Idoneo",
          "Idoneo con prescrizioni",
          "Idoneo con limitazioni",
          "Temporaneamente non idoneo",
          "Non idoneo",
        ],
        obbligatorio: true,
      },
      {
        chiave: "prescrizioni",
        etichetta: "Prescrizioni e limitazioni",
        tipo: "testo-lungo",
        nota: "Vanno attuate dal datore di lavoro: registrarle senza darvi seguito aggrava la posizione invece di alleggerirla.",
      },
      { chiave: "medico", etichetta: "Medico competente", tipo: "testo" },
      { chiave: "scadenzaGiudizio", etichetta: "Valido fino al", tipo: "data" },
    ],
  },
  {
    tipo: "verifica-attrezzatura",
    dominio: "d81",
    nome: "Verifiche periodiche delle attrezzature",
    nomeSingolare: "Verifica",
    norma: "Art. 71 co. 11 D.Lgs 81/2008 · All. VII",
    scopo:
      "Le periodicità dell'Allegato VII variano per tipo di attrezzatura: tenerle su un foglio significa scoprire lo scaduto quando arriva l'ispezione.",
    termine: { tipo: "validita", obbligo: "Verifica successiva entro la periodicità di legge" },
    etichettaData: "Verificata il",
    campi: [
      { chiave: "attrezzatura", etichetta: "Attrezzatura", tipo: "testo", obbligatorio: true },
      { chiave: "matricola", etichetta: "Matricola o identificativo", tipo: "testo" },
      {
        chiave: "verificatore",
        etichetta: "Soggetto verificatore",
        tipo: "scelta",
        opzioni: ["INAIL", "ASL", "Organismo abilitato", "Datore di lavoro"],
      },
      {
        chiave: "esitoVerifica",
        etichetta: "Esito",
        tipo: "scelta",
        opzioni: ["Regolare", "Con prescrizioni", "Negativo"],
      },
      { chiave: "scadenzaVerifica", etichetta: "Prossima verifica entro il", tipo: "data" },
    ],
  },
  {
    tipo: "fornitore",
    dominio: "gdpr",
    nome: "Responsabili del trattamento",
    nomeSingolare: "Responsabile",
    norma: "Art. 28 Reg. UE 2016/679",
    scopo:
      "Ogni fornitore che tratta dati per conto del titolare deve avere un atto di nomina: senza, il titolare risponde anche di ciò che non ha fatto.",
    termine: { tipo: "anagrafica", obbligo: "Atto di nomina ex art. 28 in essere" },
    etichettaData: "Nominato il",
    campi: [
      { chiave: "fornitore", etichetta: "Denominazione", tipo: "testo", obbligatorio: true },
      { chiave: "servizio", etichetta: "Servizio reso", tipo: "testo", obbligatorio: true },
      {
        chiave: "attoNomina",
        etichetta: "Atto di nomina sottoscritto",
        tipo: "booleano",
        nota: "L'accordo dev'essere scritto e contenere gli elementi dell'art. 28.3: un contratto di servizio generico non basta.",
      },
      { chiave: "subResponsabili", etichetta: "Sub-responsabili autorizzati", tipo: "testo-lungo" },
      { chiave: "audit", etichetta: "Ultima verifica sul responsabile", tipo: "data" },
    ],
  },
  {
    tipo: "trasferimento",
    dominio: "gdpr",
    nome: "Trasferimenti extra UE",
    nomeSingolare: "Trasferimento",
    norma: "Capo V Reg. UE 2016/679",
    scopo:
      "Ogni trasferimento fuori dallo Spazio economico europeo richiede una base giuridica dichiarata: l'assenza rende illecito il trattamento a valle.",
    termine: { tipo: "anagrafica", obbligo: "Base giuridica del trasferimento in essere" },
    etichettaData: "In essere dal",
    campi: [
      { chiave: "destinatario", etichetta: "Destinatario", tipo: "testo", obbligatorio: true },
      { chiave: "paese", etichetta: "Paese", tipo: "testo", obbligatorio: true },
      {
        chiave: "base",
        etichetta: "Base giuridica",
        tipo: "scelta",
        opzioni: [
          "Decisione di adeguatezza (art. 45)",
          "Clausole contrattuali tipo (art. 46.2.c)",
          "Norme vincolanti d'impresa (art. 47)",
          "Deroga per situazioni specifiche (art. 49)",
        ],
        obbligatorio: true,
      },
      {
        chiave: "tia",
        etichetta: "Valutazione d'impatto sul trasferimento",
        tipo: "booleano",
        nota: "Dopo Schrems II le clausole tipo non bastano da sole: serve valutare la legislazione del paese di destinazione.",
      },
    ],
  },
  {
    tipo: "trattamento",
    dominio: "gdpr",
    nome: "Registro dei trattamenti",
    nomeSingolare: "Trattamento",
    norma: "Art. 30 Reg. UE 2016/679",
    scopo:
      "È il primo documento che il Garante chiede, e l'unico che dimostra di sapere quali dati si trattano e perché. Va tenuto in forma scritta, anche elettronica.",
    termine: { tipo: "anagrafica", obbligo: "Registro aggiornato e disponibile su richiesta" },
    etichettaData: "Censito il",
    campi: [
      { chiave: "finalita", etichetta: "Finalità del trattamento", tipo: "testo", obbligatorio: true },
      {
        chiave: "baseGiuridica",
        etichetta: "Base giuridica",
        tipo: "scelta",
        opzioni: [
          "Consenso (art. 6.1.a)",
          "Contratto (art. 6.1.b)",
          "Obbligo legale (art. 6.1.c)",
          "Interesse vitale (art. 6.1.d)",
          "Interesse pubblico (art. 6.1.e)",
          "Legittimo interesse (art. 6.1.f)",
        ],
        obbligatorio: true,
      },
      {
        chiave: "categorieInteressati",
        etichetta: "Categorie di interessati",
        tipo: "testo",
        obbligatorio: true,
      },
      { chiave: "categorieDati", etichetta: "Categorie di dati", tipo: "testo", obbligatorio: true },
      {
        chiave: "conservazione",
        etichetta: "Termine di conservazione",
        tipo: "testo",
        obbligatorio: true,
        nota: "«Per il tempo necessario» non è un termine: l'art. 30.1.f chiede una previsione, e senza non si può dimostrare la minimizzazione.",
      },
      { chiave: "destinatari", etichetta: "Destinatari", tipo: "testo-lungo" },
      { chiave: "misureSicurezza", etichetta: "Misure di sicurezza", tipo: "testo-lungo" },
    ],
  },
  {
    tipo: "dpia",
    dominio: "gdpr",
    nome: "Valutazioni d'impatto",
    nomeSingolare: "Valutazione",
    norma: "Art. 35 Reg. UE 2016/679 · WP248",
    scopo:
      "La valutazione è dovuta quando il trattamento presenta un rischio elevato. I nove criteri del WP248 servono a decidere: due soddisfatti e la DPIA si fa.",
    termine: { tipo: "anagrafica", obbligo: "Valutazione condotta e riesaminata" },
    etichettaData: "Condotta il",
    campi: [
      { chiave: "trattamento", etichetta: "Trattamento valutato", tipo: "testo", obbligatorio: true },
      {
        chiave: "criteri",
        etichetta: "Criteri WP248 soddisfatti",
        tipo: "numero",
        obbligatorio: true,
        nota: "Valutazione sistematica, decisione automatizzata, monitoraggio sistematico, dati particolari, larga scala, incrocio di insiemi, soggetti vulnerabili, uso innovativo, ostacolo all'esercizio di un diritto. Da due in su la DPIA è dovuta.",
      },
      {
        chiave: "esitoRischio",
        etichetta: "Rischio residuo",
        tipo: "scelta",
        opzioni: ["Accettabile", "Elevato: consultazione preventiva dovuta"],
      },
      {
        chiave: "consultazione",
        etichetta: "Consultazione preventiva al Garante",
        tipo: "booleano",
        nota: "Dovuta ex art. 36 quando il rischio residuo resta elevato nonostante le misure.",
      },
      { chiave: "parereDpo", etichetta: "Parere del DPO", tipo: "testo-lungo" },
    ],
  },
];

export const registroPerTipo = (t: string): DefinizioneRegistro | undefined =>
  REGISTRI.find((r) => r.tipo === t);

export const registriDelDominio = (d: Dominio): readonly DefinizioneRegistro[] =>
  REGISTRI.filter((r) => r.dominio === d);

export const isTipoRegistro = (s: string): s is TipoRegistro =>
  (TIPI_REGISTRO as readonly string[]).includes(s);

export type { DataISO };

// ============================================================================================
// I collegamenti fra registri di domini diversi
// ============================================================================================

/**
 * UN FATTO SOLO CHE RIGUARDA DUE DECRETI.
 *
 * È la ragione per cui questa è una suite e non tre strumenti affiancati. Una violazione
 * dei dati non è solo un adempimento GDPR: se l'ente ha un modello 231, quello stesso
 * fatto è anche un flusso informativo dovuto all'Organismo di Vigilanza, e i due termini
 * corrono insieme. Il prototipo del committente lo annotava a mano, «Coordinamento
 * DPO-OdV 72h»: era una nota su un foglio, e le note su un foglio non avvisano nessuno.
 *
 * NON SI CREA NIENTE DA SOLI. Aprire d'ufficio la voce nell'altro registro sarebbe magia:
 * comparirebbe un atto che nessuno ha scritto, con una data che nessuno ha deciso. Il
 * prodotto dice che il collegamento esiste e lascia il gesto a chi ne risponde.
 *
 * Il collegamento vale solo se ENTRAMBI i moduli sono attivi. Su un'azienda senza modello
 * 231 la nota sul flusso all'OdV non è un promemoria utile: è rumore su un obbligo che
 * quell'azienda non ha.
 */
export type LegameRegistri = {
  readonly da: TipoRegistro;
  readonly a: TipoRegistro;
  readonly norma: string;
  /** Cosa dire a chi ha appena registrato il fatto nel registro di partenza. */
  readonly avviso: string;
};

export const LEGAMI_REGISTRI: readonly LegameRegistri[] = [
  {
    da: "violazione",
    a: "flusso-odv",
    norma: "art. 33 GDPR · art. 6.2.d D.Lgs 231/01",
    avviso:
      "Una violazione dei dati è anche un flusso informativo dovuto all'Organismo di Vigilanza: i due termini corrono insieme dallo stesso momento, e il DPO e l'OdV devono saperlo entrambi entro le stesse 72 ore.",
  },
  {
    da: "segnalazione",
    a: "flusso-odv",
    norma: "D.Lgs 24/2023 · art. 6.2.d D.Lgs 231/01",
    avviso:
      "Se la segnalazione riguarda un reato presupposto, l'Organismo di Vigilanza va informato: è il destinatario che il modello indica, e il canale di whistleblowing non lo sostituisce.",
  },
  {
    da: "formazione",
    a: "flusso-odv",
    norma: "art. 37 D.Lgs 81/08 · art. 6.2.d D.Lgs 231/01",
    avviso:
      "La formazione sulla sicurezza è un presidio dell'art. 30 D.Lgs 81/08, e l'art. 25-septies rende l'infortunio un reato presupposto: l'evidenza serve a entrambi i fascicoli e si carica una volta sola.",
  },
];

/** I legami che partono da questo registro, verso registri di moduli effettivamente attivi. */
export const legamiDa = (tipo: string, moduliAttivi: readonly Dominio[]): readonly LegameRegistri[] =>
  LEGAMI_REGISTRI.filter((l) => {
    if (l.da !== tipo) return false;
    const destinazione = registroPerTipo(l.a);
    return destinazione ? moduliAttivi.includes(destinazione.dominio) : false;
  });
