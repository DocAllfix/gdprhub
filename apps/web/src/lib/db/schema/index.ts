// Schema Drizzle della suite, diviso per dominio funzionale.
//
//   auth      tabelle di Better Auth: utenti, sessioni, studio (organization), membri
//   catalog   contenuto di piattaforma: i 171 adempimenti, i collegamenti, i reati
//   tenancy   dati dei clienti: aziende, moduli, assessment, evidenze, storico
//
// Regola: ogni tabella di `tenancy` porta `organization_id`. Aggiungendone una senza,
// il test di isolamento fallisce.

export * from "./auth";
export * from "./catalog";
export * from "./tenancy";
