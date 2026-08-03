// Applica le migrazioni all'avvio dell'istanza.
//
// Non usa `drizzle-kit`: quello è uno strumento di sviluppo, e trascinarlo in un'immagine
// di produzione significherebbe portarsi dietro un compilatore TypeScript e la sua catena
// di dipendenze per eseguire una manciata di `CREATE TABLE`. Il migratore di `drizzle-orm`
// fa la stessa cosa leggendo la stessa cartella, e sta già nell'immagine perché
// l'applicazione lo importa.
//
// SI APPLICA A OGNI AVVIO, ed è voluto. Il migratore tiene la propria tabella di controllo
// e salta ciò che ha già fatto: un riavvio dopo un aggiornamento porta lo schema al passo
// senza che nessuno debba ricordarsi un comando. Il caso che si vuole evitare è
// l'aggiornamento dell'immagine con lo schema vecchio, che non dà errore subito — dà
// errore la prima volta che qualcuno apre la pagina sbagliata.
//
// FALLISCE RUMOROSAMENTE. Se le migrazioni non passano, l'istanza non deve partire: un
// server che risponde con uno schema a metà è peggio di un server che non risponde,
// perché il primo scrive dati che il secondo non avrebbe scritto.

import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL mancante: le migrazioni non si possono applicare.");
  process.exit(1);
}

// `max: 1` perché il migratore prende un lock: più connessioni non servono e complicano
// soltanto la chiusura. Il timeout è generoso perché la prima migrazione su un database
// vuoto crea tutto lo schema.
const sql = postgres(url, { max: 1, prepare: false, idle_timeout: 20, connect_timeout: 30 });

try {
  await migrate(drizzle(sql), { migrationsFolder: "./migrazioni" });
  console.log("Migrazioni applicate.");
} catch (errore) {
  console.error("Migrazioni fallite:", errore instanceof Error ? errore.message : errore);
  process.exit(1);
} finally {
  await sql.end({ timeout: 5 });
}
