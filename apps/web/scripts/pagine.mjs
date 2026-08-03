// Inventario delle pagine sottoposte al cancello visivo.
//
// Regola di fase: una schermata nuova entra qui NELLA STESSA fase in cui viene scritta.
// Se una pagina non è in questo elenco, nessuno ha verificato che i suoi bottoni
// funzionino, che non sporchi la console e che si veda in tema scuro.

// `autenticata` fa aprire una sessione al contesto prima di navigare: le pagine operative
// stanno dietro il guard, e verificarle da anonimo significherebbe verificare la pagina di
// accesso tre volte credendo di aver controllato il portafoglio.
//
// `dinamica` marca i percorsi che dipendono da un identificativo: l'inventario non può
// scriverlo a mano, lo risolve il cancello leggendo il primo collegamento del portafoglio.

// `atteso` è un selettore che DEVE esistere sulla pagina.
//
// Senza, il cancello dice «ok» a una schermata che ha reso il proprio ripiego. È successo:
// il cancello clicca ogni comando azionabile, e sulla scheda azienda quei comandi
// includono gli interruttori dei moduli. Uno di quei clic ha spento l'81/08 e la pagina
// dell'assessment successiva ha reso «il modulo non è attivo» — nessun errore in console,
// nessuna richiesta rotta, verdetto verde. L'unico indizio era il numero di comandi
// azionabili, sceso da centotrentasette a nove, e l'ho notato per caso.
//
// Un marcatore per pagina costa una riga e chiude quella classe intera di silenzi.

export const PAGINE = [
  { percorso: "/accedi", nome: "Accesso", fase: 6, atteso: "form" },
  {
    percorso: "/cruscotto",
    nome: "Cruscotto unificato",
    fase: 10,
    autenticata: true,
    atteso: "[data-tour=indicatori-cruscotto], main section",
  },
  {
    percorso: "/portafoglio",
    nome: "Portafoglio",
    fase: 6,
    autenticata: true,
    atteso: "[data-tour=tabella-portafoglio]",
  },
  {
    percorso: "/azienda/:prima",
    nome: "Scheda azienda",
    fase: 6,
    autenticata: true,
    dinamica: true,
    atteso: "[data-tour=moduli-azienda], main",
  },
  {
    percorso: "/azienda/:prima/d81",
    nome: "Assessment 81/08",
    fase: 7,
    autenticata: true,
    dinamica: true,
    atteso: "[data-tour=tabella-assessment]",
  },
  {
    percorso: "/scadenzario",
    nome: "Scadenzario unificato",
    fase: 8,
    autenticata: true,
    atteso: "[data-tour=tabella-scadenzario]",
  },
  {
    percorso: "/impostazioni",
    nome: "Impostazioni",
    fase: 6,
    autenticata: true,
    atteso: "main",
  },
  { percorso: "/design", nome: "Sistema di design", fase: 5, atteso: "main" },
];
