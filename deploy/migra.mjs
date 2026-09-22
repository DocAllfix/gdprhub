// Applica le migrazioni all'avvio dell'istanza.
//
// Non usa `drizzle-kit`: quello è uno strumento di sviluppo, e trascinarlo in un'immagine
// di produzione significherebbe portarsi dietro un compilatore TypeScript e la sua catena
// di dipendenze per eseguire una manciata di `CREATE TABLE`. Il migratore di `drizzle-orm`
// fa la stessa cosa leggendo la stessa cartella.
//
// QUI C'ERA UN'ASSUNZIONE FALSA, e per questo la riga resta a ricordarlo: diceva che
// `drizzle-orm` «sta già nell'immagine perché l'applicazione lo importa». Non ci sta. Next
// IMPACCHETTA le dipendenze dentro `.next/server` invece di copiarle in `node_modules`,
// quindi nell'immagine non c'era né `drizzle-orm` né `postgres`, questo file moriva con
// `ERR_MODULE_NOT_FOUND`, e `set -e` in `avvio.sh` uccideva il contenitore a ogni avvio.
// Ora il Dockerfile installa le due dipendenze in `/migratore`, accanto a questo file.
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
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL mancante: le migrazioni non si possono applicare.");
  process.exit(1);
}

// `max: 1` perché il migratore prende un lock: più connessioni non servono e complicano
// soltanto la chiusura. Il timeout è generoso perché la prima migrazione su un database
// vuoto crea tutto lo schema.
const sql = postgres(url, { max: 1, prepare: false, idle_timeout: 20, connect_timeout: 30 });

// DICE SU COSA LAVORA, PRIMA DI TOCCARLO — senza la password, che finirebbe nei log.
//
// Un migratore che parte in silenzio e stampa «fatto» non permette di distinguere il caso
// buono da quello in cui ha migrato il database sbagliato. È successo su un progetto
// gemello: un caricatore d'ambiente con la precedenza al contrario ha fatto collegare uno
// script alla produzione mentre chi lo lanciava credeva di essere in locale.
const bersaglio = new URL(url);
console.log(`→ database ${bersaglio.hostname}:${bersaglio.port || 5432}${bersaglio.pathname}`);
const cartella = join(dirname(fileURLToPath(import.meta.url)), "migrazioni");
console.log(`→ migrazioni da ${cartella}`);

try {
  await migrate(drizzle(sql), { migrationsFolder: cartella });

  // E DICE CHE EFFETTO HA AVUTO, non solo di essere riuscito.
  //
  // Su un progetto gemello `drizzle-kit migrate` ha stampato «migrations applied
  // successfully!» ed è uscito con 0 **su un database rimasto vuoto**, schema di controllo
  // compreso. Un messaggio verde ha fatto perdere venti minuti. Contare le tabelle costa
  // una query e distingue «ha funzionato» da «non ha protestato».
  const [{ tabelle }] = await sql`
    select count(*)::int as tabelle
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r'`;
  console.log(`Migrazioni applicate: ${tabelle} tabelle nello schema public.`);

  if (tabelle === 0) {
    console.error("Nessuna tabella dopo le migrazioni: lo schema è vuoto, non è un successo.");
    process.exit(1);
  }
} catch (errore) {
  console.error("Migrazioni fallite:", errore instanceof Error ? errore.message : errore);
  process.exit(1);
} finally {
  await sql.end({ timeout: 5 });
}
