// Etichette dei campi dello storico.
//
// Vive in un file suo, senza dipendenze dal database: il pannello di dettaglio è un
// componente client e importare `dati.ts` si tirerebbe dietro Drizzle e la connessione.

export const ETICHETTA_CAMPO: Readonly<Record<string, string>> = {
  stato: "Stato del lavoro",
  ultimaEsecuzione: "Ultima esecuzione",
  motivazioneNonApplicabile: "Motivazione",
  priorita: "Priorità",
  note: "Note",
};
