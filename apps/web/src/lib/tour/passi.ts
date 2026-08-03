// I TOUR, uno per contesto.
//
// Non esiste un tour unico che spiega il prodotto: esistono cinque momenti in cui una
// persona non sa cosa sta guardando, e ognuno ha bisogno di tre o quattro frasi in quel
// momento lì. Un giro di venti passi al primo accesso viene saltato da tutti, e chi lo
// salta non lo riapre mai.
//
// OGNI PASSO PUNTA A UN `data-tour` CHE ESISTE. Il selettore non è una stringa a caso: c'è
// un test che legge i sorgenti e fallisce se un ancoraggio non si trova. Un tour che punta
// a un elemento rinominato non dà errore — salta il passo in silenzio — e nessuno se ne
// accorge finché un cliente non chiede perché la guida non spiega la cosa che gli serve.
//
// IL TESTO NON DESCRIVE, SPIEGA PERCHÉ. «Questa è la tabella degli adempimenti» è una
// didascalia e non serve a nessuno: chi guarda vede già che è una tabella. Serve dire cosa
// distingue questa tabella da un foglio di calcolo, ed è l'unica cosa che il prodotto deve
// insegnare.

export type Passo = {
  /** Il valore di `data-tour` sull'elemento da illuminare. Senza, il passo è centrato. */
  readonly ancora?: string;
  readonly titolo: string;
  readonly testo: string;
};

export type Tour = {
  readonly chiave: string;
  readonly nome: string;
  /** Su quale percorso si apre da solo la prima volta. */
  readonly percorso: string;
  /** Si alza quando il contenuto cambia: chi l'ha già visto lo rivede una volta sola. */
  readonly versione: number;
  readonly passi: readonly Passo[];
};

export const TOUR: readonly Tour[] = [
  {
    chiave: "portafoglio",
    nome: "Il portafoglio",
    percorso: "/portafoglio",
    versione: 1,
    passi: [
      {
        titolo: "Una riga per azienda, una colonna per decreto",
        testo:
          "È la vista da cui si comincia la giornata. Ogni percentuale è la conformità effettiva: gli adempimenti fatti E ancora validi, non quelli spuntati. Sono due cose diverse, e la differenza è il motivo per cui questo prodotto esiste.",
      },
      {
        ancora: "indicatori-portafoglio",
        titolo: "I numeri in testa sono cumulativi",
        testo:
          "Le scadenze mancate contano tutte le aziende insieme. Se il numero è alto, la riga da guardare è quella con l'esposizione più alta — non quella con la percentuale più bassa: un modulo piccolo tutto scoperto pesa meno di uno grande a metà.",
      },
      {
        ancora: "filtro-portafoglio",
        titolo: "Il filtro resta nell'indirizzo",
        testo:
          "Quello che cerchi finisce nell'URL, quindi una ricerca si può mandare a un collega o tenere fra i segnalibri. Non si perde ricaricando la pagina.",
      },
      {
        titolo: "⌘K cerca ovunque",
        testo:
          "Premi ⌘K (o Ctrl+K) da qualunque schermata: cerca aziende, codici e adempimenti insieme. Scrivendo «dvr ferrarini» si arriva al documento di valutazione dei rischi di quel cliente, con la riga già evidenziata. È il modo più veloce di muoversi qui dentro.",
      },
      {
        ancora: "prima-azienda",
        titolo: "Da qui si entra nel cliente",
        testo:
          "La scheda azienda raccoglie i tre moduli, le prossime scadenze e le relazioni emesse. È il posto da cui si lavora su un cliente solo.",
      },
    ],
  },
  {
    chiave: "azienda",
    nome: "La scheda azienda",
    percorso: "/azienda",
    versione: 1,
    passi: [
      {
        ancora: "moduli-azienda",
        titolo: "I moduli si attivano per azienda",
        testo:
          "Una PMI senza modello 231 non deve vedere sessantacinque adempimenti che non la riguardano e un cruscotto perennemente rosso: il primo effetto è che smette di fidarsi dei numeri. Disattivare non cancella niente — l'assessment e le evidenze restano, e riattivando si ritrovano.",
      },
      {
        ancora: "vai-simulatore",
        titolo: "Il simulatore serve a chiedere un budget",
        testo:
          "«Ci sono trentanove adempimenti scaduti» è una constatazione, e chi la ascolta la sapeva già. «Con questi cinque interventi l'esposizione scende da 71 a 48» è una frase su cui si decide. Il calcolo è lo stesso del cruscotto: nessuna stima a parte.",
      },
      {
        ancora: "vai-relazioni",
        titolo: "La relazione è il documento che si consegna",
        testo:
          "Congela i numeri del giorno in cui è generata. Se i dati cambiano il documento non cambia: se ne genera uno nuovo, e i due restano entrambi con il proprio numero. È quello che rende una relazione difendibile davanti a un'autorità.",
      },
    ],
  },
  {
    chiave: "assessment",
    nome: "L'assessment",
    percorso: "/azienda",
    versione: 1,
    passi: [
      {
        titolo: "Due stati, non uno",
        testo:
          "Lo stato del LAVORO lo decidi tu e dice che l'attività è stata svolta. Lo stato della SCADENZA lo decide la data e dice che è ancora valida. Un adempimento può essere completato e nondimeno scaduto: è la situazione più frequente e la più pericolosa, perché il registro dice «fatto».",
      },
      {
        ancora: "tabella-assessment",
        titolo: "La scadenza non si scrive",
        testo:
          "Si registra l'ultima esecuzione e la scadenza si ricalcola dalla periodicità del catalogo. Renderla scrivibile permetterebbe di dichiarare una data che i fatti non sostengono — ed è il difetto che i tre strumenti di partenza avevano tutti.",
      },
      {
        ancora: "apri-adempimento",
        titolo: "Il pannello porta la norma e lo storico",
        testo:
          "Ogni modifica lascia una traccia irreversibile: il registro è append-only per vincolo sul database, non per disciplina di chi scrive il codice. È la risposta alla domanda che un ispettore fa sempre, «da quando è così?».",
      },
      {
        ancora: "evidenze",
        titolo: "Senza documento resta una dichiarazione",
        testo:
          "L'evidenza si allega qui. Il tipo si verifica dal contenuto e non dall'estensione, l'impronta si calcola al caricamento e si ricontrolla a ogni scaricamento: se il file in archivio cambia, non esce.",
      },
    ],
  },
  {
    chiave: "scadenzario",
    nome: "Lo scadenzario",
    percorso: "/scadenzario",
    versione: 1,
    passi: [
      {
        ancora: "indicatori-scadenzario",
        titolo: "La larghezza è quanto lavoro, non quanto tempo",
        testo:
          "La fascia in alto è un asse temporale: la posizione dice quando, la larghezza dice quanto. Se il rosso occupa un terzo della barra, un terzo del lavoro è già in ritardo — e si vede prima di aver letto una cifra.",
      },
      {
        ancora: "finestre",
        titolo: "La finestra è la domanda",
        testo:
          "«Cosa scade questa settimana» non è la stessa domanda di «cosa è già scaduto». Per questo la finestra sta da sola e in evidenza, e azzerare i filtri non la tocca.",
      },
      {
        ancora: "tabella-scadenzario",
        titolo: "Una lista sola sui tre decreti",
        testo:
          "Un consulente non pensa «oggi faccio GDPR»: pensa «cosa scade per Rossi Srl». Finora doveva aprire tre strumenti e incrociare a mano. Gli adempimenti condivisi fra decreti compaiono una volta sola, con l'origine dichiarata.",
      },
    ],
  },
  {
    chiave: "relazioni",
    nome: "Le relazioni",
    percorso: "/azienda",
    versione: 1,
    passi: [
      {
        ancora: "genera-relazione",
        titolo: "Prima una bozza, poi un atto",
        testo:
          "La bozza si rifà quante volte serve: è lì che ci si accorge che un'esclusione non ha motivazione o che un adempimento era stato dimenticato. Pubblicandola diventa un atto e il contenuto si congela — nemmeno dal database si può più toccare.",
      },
      {
        ancora: "relazioni",
        titolo: "L'impronta identifica il documento",
        testo:
          "Ogni relazione porta l'impronta SHA-256 del proprio contenuto. Serve a dire «questa è quella che ti ho consegnato il 3 agosto» senza doverla riaprire, e a scoprire se qualcuno l'ha alterata: in quel caso il PDF non viene nemmeno prodotto.",
      },
    ],
  },
];

export const tourPerChiave = (chiave: string): Tour | undefined =>
  TOUR.find((t) => t.chiave === chiave);

/** Tutti gli ancoraggi usati, per il test che verifica che esistano davvero. */
export const ANCORE_USATE: readonly string[] = [
  ...new Set(TOUR.flatMap((t) => t.passi.map((p) => p.ancora).filter((a): a is string => Boolean(a)))),
];
