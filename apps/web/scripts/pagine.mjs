// Inventario delle pagine sottoposte al cancello visivo.
//
// Regola di fase: una schermata nuova entra qui NELLA STESSA fase in cui viene scritta.
// Se una pagina non è in questo elenco, nessuno ha verificato che i suoi bottoni
// funzionino, che non sporchi la console e che si veda in tema scuro.

export const PAGINE = [
  { percorso: "/", nome: "Radice", fase: 0 },
  { percorso: "/design", nome: "Sistema di design", fase: 5 },
];
