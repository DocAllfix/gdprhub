// Le voci dimostrative dei registri.
//
// UNDICI REGISTRI VUOTI NON DIMOSTRANO NIENTE.
//
// La prima istanza online è la vetrina, ed è la prima cosa che il committente apre. Un
// registro vuoto con un buon testo di cortesia spiega a cosa servirebbe; non mostra come si
// comporta. Il comportamento è tutto lì: una violazione a poche ore dalla scadenza che
// conta le ore in rosso, una notificata in tempo che resta verde, una notificata tardi che
// conserva il proprio ritardo. Sono tre righe, e valgono più di tre paragrafi.
//
// LE DATE SONO RELATIVE A OGGI, come tutto il resto del demo. I tre prototipi del
// committente avevano scadenze cablate al 2025-2026, e il loro demo invecchia: fra un anno
// mostravano solo scadute. Qui `oreFa` si risolve al momento della semina, così una vetrina
// riseminata fra un anno mostra ancora una violazione che brucia e una chiusa in tempo.
//
// I CONTENUTI SONO PLAUSIBILI, NON DECORATIVI. Un consulente privacy che apre la vetrina
// riconosce il proprio mestiere o non ci torna: «invio massivo con destinatari in chiaro»,
// «portatile smarrito con disco cifrato», «credenziali di un fornitore cessato ancora
// attive» sono i tre casi che si vedono davvero, e il secondo è quello che insegna la cosa
// meno ovvia — la cifratura rende improbabile il rischio e la notifica non è dovuta.

export type VoceDemo = {
  readonly tipo: string;
  readonly titolo: string;
  readonly descrizione?: string;
  /** Quante ore fa se n'è avuta conoscenza. */
  readonly oreFa: number;
  /** Quante ore fa l'obbligo è stato assolto, se lo è stato. */
  readonly assoltoOreFa?: number;
  readonly esito?: string;
  readonly stato?: string;
  readonly dettagli: Record<string, unknown>;
};

const GIORNO = 24;

export const VOCI_DIMOSTRATIVE: readonly VoceDemo[] = [
  // --- GDPR ---------------------------------------------------------------------------
  {
    tipo: "violazione",
    titolo: "Invio massivo con destinatari in chiaro",
    descrizione:
      "Una comunicazione commerciale a 1.240 indirizzi è partita con i destinatari in copia semplice anziché in copia nascosta. Ogni destinatario ha visto l'indirizzo di tutti gli altri.",
    // Ne restano quattordici: siamo nell'ultimo quarto, il contatore è rosso. È la riga che
    // fa capire in un colpo d'occhio a cosa serve questo registro.
    oreFa: 58,
    dettagli: {
      natura: "Divulgazione non autorizzata",
      interessati: 1240,
      categorieDati: "Comuni",
      rischioElevato: false,
      notificaGarante: false,
      misure:
        "Richiamo immediato del messaggio dal server di posta, comunicazione di scuse, revisione della procedura di invio.",
    },
  },
  {
    tipo: "violazione",
    titolo: "Portatile smarrito in trasferta",
    descrizione:
      "Un portatile aziendale è stato smarrito su un treno. Il disco era cifrato per intero e la sessione bloccata.",
    oreFa: 22 * GIORNO,
    assoltoOreFa: 21 * GIORNO + 6,
    esito:
      "Notifica al Garante non dovuta: cifratura integrale del disco, rischio improbabile ex art. 33.1. Valutazione verbalizzata e conservata agli atti.",
    stato: "chiuso",
    dettagli: {
      natura: "Perdita di disponibilità",
      interessati: 0,
      categorieDati: "Comuni",
      rischioElevato: false,
      notificaGarante: false,
      misure: "Cancellazione remota eseguita. Disco cifrato, nessun accesso possibile.",
    },
  },
  {
    tipo: "violazione",
    titolo: "Accesso non autorizzato all'area riservata fornitori",
    descrizione:
      "Credenziali di un fornitore cessato ancora attive, utilizzate per accedere all'area documentale.",
    oreFa: 40 * GIORNO,
    // Assolta quattro giorni dopo: FUORI TERMINE, e la riga se lo porta dietro per sempre.
    assoltoOreFa: 36 * GIORNO,
    esito:
      "Notifica trasmessa al Garante oltre il termine di 72 ore. Il ritardo è dovuto alla catena di segnalazione interna, rivista con procedura del mese successivo.",
    stato: "chiuso",
    dettagli: {
      natura: "Accesso non autorizzato",
      interessati: 87,
      categorieDati: "Comuni",
      rischioElevato: true,
      notificaGarante: true,
      misure:
        "Revoca immediata delle credenziali, censimento delle utenze dormienti, disattivazione automatica a 30 giorni.",
    },
  },
  {
    tipo: "diritto",
    titolo: "Richiesta di accesso di un ex dipendente",
    oreFa: 26 * GIORNO,
    dettagli: {
      diritto: "Accesso (art. 15)",
      richiedente: "Ex dipendente, matricola 4417",
      canale: "PEC",
      proroga: false,
    },
  },
  {
    tipo: "diritto",
    titolo: "Cancellazione richiesta da un candidato non assunto",
    oreFa: 12 * GIORNO,
    assoltoOreFa: 5 * GIORNO,
    esito:
      "Curriculum e note di colloquio cancellati dal gestionale e dalla casella di posta. Conferma inviata via PEC.",
    stato: "chiuso",
    dettagli: {
      diritto: "Cancellazione (art. 17)",
      richiedente: "Candidato, selezione area tecnica",
      canale: "Posta elettronica",
      proroga: false,
    },
  },
  {
    tipo: "trattamento",
    titolo: "Gestione del rapporto di lavoro",
    oreFa: 200 * GIORNO,
    dettagli: {
      finalita: "Amministrazione del personale, adempimenti retributivi, previdenziali e fiscali",
      baseGiuridica: "Obbligo legale (art. 6.1.c)",
      categorieInteressati: "Dipendenti e collaboratori",
      categorieDati: "Anagrafici, retributivi, presenze, dati sanitari per l'idoneità",
      conservazione: "10 anni dalla cessazione, art. 2220 c.c.",
      destinatari: "Consulente del lavoro, istituti previdenziali, banca per i bonifici",
      misureSicurezza: "Accesso nominativo, cifratura a riposo, registro degli accessi",
    },
  },
  {
    tipo: "trattamento",
    titolo: "Videosorveglianza perimetrale",
    oreFa: 150 * GIORNO,
    dettagli: {
      finalita: "Sicurezza del patrimonio aziendale e prevenzione degli accessi non autorizzati",
      baseGiuridica: "Legittimo interesse (art. 6.1.f)",
      categorieInteressati: "Dipendenti, visitatori, fornitori",
      categorieDati: "Immagini",
      conservazione: "24 ore, salvo richiesta dell'autorità",
      destinatari: "Istituto di vigilanza, autorità giudiziaria su richiesta",
      misureSicurezza:
        "Accordo sindacale ex art. 4 Statuto dei lavoratori, cartellonistica, accesso alle immagini a due persone",
    },
  },
  {
    tipo: "dpia",
    titolo: "Videosorveglianza con riconoscimento delle targhe",
    oreFa: 90 * GIORNO,
    dettagli: {
      trattamento: "Lettura automatica delle targhe ai varchi dello stabilimento",
      criteri: 3,
      esitoRischio: "Accettabile",
      consultazione: false,
      parereDpo:
        "Rischio residuo accettabile a condizione che la conservazione resti entro le 48 ore e che l'incrocio con le anagrafiche dei dipendenti sia tecnicamente impedito.",
    },
  },
  {
    tipo: "fornitore",
    titolo: "Fornitore del gestionale paghe",
    oreFa: 300 * GIORNO,
    dettagli: {
      fornitore: "Studio associato, servizi di elaborazione paghe",
      servizio: "Elaborazione cedolini e adempimenti contributivi",
      attoNomina: true,
      subResponsabili: "Software house del gestionale, con autorizzazione scritta",
    },
  },
  {
    tipo: "trasferimento",
    titolo: "Piattaforma di posta elettronica e collaborazione",
    oreFa: 400 * GIORNO,
    dettagli: {
      destinatario: "Fornitore di posta e collaborazione",
      paese: "Stati Uniti",
      base: "Decisione di adeguatezza (art. 45)",
      tia: true,
    },
  },

  // --- 231 ----------------------------------------------------------------------------
  {
    tipo: "segnalazione",
    titolo: "Presunte irregolarità in una gara di fornitura",
    oreFa: 5 * GIORNO,
    dettagli: {
      canale: "Piattaforma informatica dedicata",
      ambito: "Rapporti con fornitori, area acquisti",
      identificato: false,
      riscontroDato: false,
      note: "Segnalazione anonima. Istruttoria avviata dall'Organismo di Vigilanza.",
    },
  },
  {
    tipo: "flusso-odv",
    titolo: "Flusso trimestrale della funzione acquisti",
    oreFa: 20 * GIORNO,
    dettagli: {
      fonte: "Direzione acquisti",
      oggetto: "Scostamenti di prezzo e affidamenti diretti sopra soglia",
      presaAtto: true,
      verbale: "Verbale OdV n. 3 dell'anno in corso",
    },
  },

  // --- 81/08 --------------------------------------------------------------------------
  {
    tipo: "formazione",
    titolo: "Formazione generale e specifica, rischio alto",
    oreFa: 700 * GIORNO,
    dettagli: {
      lavoratore: "Reparto produzione, 14 lavoratori",
      mansione: "Addetti alle presse",
      corso: "Formazione generale 4 ore e specifica 12 ore, rischio alto",
      ore: 16,
    },
  },
  {
    tipo: "sorveglianza",
    titolo: "Visita periodica, reparto verniciatura",
    oreFa: 300 * GIORNO,
    dettagli: {
      lavoratore: "Reparto verniciatura, 6 lavoratori",
      giudizio: "Idoneo con prescrizioni",
      prescrizioni: "Uso obbligatorio del facciale filtrante FFP3 durante le operazioni di spruzzatura.",
    },
  },
  {
    tipo: "verifica-attrezzatura",
    titolo: "Verifica periodica del carroponte",
    oreFa: 380 * GIORNO,
    dettagli: {
      attrezzatura: "Carroponte da 5 tonnellate, campata produzione",
      matricola: "CP-2019-441",
      organismo: "Organismo abilitato su incarico dell'ASL competente",
      esitoVerifica: "Positivo",
    },
  },
];
