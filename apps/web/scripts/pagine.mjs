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

export const PAGINE = [
  { percorso: "/accedi", nome: "Accesso", fase: 6 },
  { percorso: "/portafoglio", nome: "Portafoglio", fase: 6, autenticata: true },
  { percorso: "/azienda/:prima", nome: "Scheda azienda", fase: 6, autenticata: true, dinamica: true },
  {
    percorso: "/azienda/:prima/d81",
    nome: "Assessment 81/08",
    fase: 7,
    autenticata: true,
    dinamica: true,
  },
  { percorso: "/impostazioni", nome: "Impostazioni", fase: 6, autenticata: true },
  { percorso: "/design", nome: "Sistema di design", fase: 5 },
];
