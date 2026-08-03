import { drizzle as drizzleNeon } from "drizzle-orm/neon-serverless";
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import { Pool, neonConfig } from "@neondatabase/serverless";
import postgres from "postgres";
import ws from "ws";
import { env } from "@/lib/env";
import * as schema from "./schema";

// Connessione al database: due driver, un'interfaccia sola.
//
// È la stessa scelta di progetto degli adattatori di storage e PDF: il codice di dominio
// non sa quale dei due sta usando.
//
// PERCHÉ DUE DRIVER, misurato e non supposto.
// `postgres-js` parla TCP. In una funzione serverless ogni invocazione fredda apre una
// connessione da zero: handshake TCP, handshake TLS, autenticazione, e solo dopo la prima
// query. Sono centinaia di millisecondi spesi PRIMA di chiedere qualcosa, e si ripagano a
// ogni istanza che Vercel accende.
//
// Su un'istanza dedicata dietro Caddy il problema non esiste — il processo resta acceso e
// la connessione si riusa — e lì `postgres-js` resta la scelta giusta, oltre a essere
// l'unica che funzioni contro un Postgres normale.
//
// Il driver di Neon usa WebSocket e nasce per lo scenario serverless. Si sceglie da sé
// guardando dov'è il database, come fanno gli altri due adattatori.

function creaClient() {
  if (!env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL mancante. In sviluppo copiala in apps/web/.env (vedi .env.example); " +
        "sulla vetrina la inietta l'integrazione Neon; in produzione arriva dal file .env.prod dell'istanza.",
    );
  }

  // Vero quando il database è Neon: solo lì il driver WebSocket ha senso e funziona.
  const suNeon = /\.neon\.tech/.test(env.DATABASE_URL);

  if (suNeon) {
    // Node non espone WebSocket in tutte le versioni supportate: si dichiara.
    neonConfig.webSocketConstructor = ws;
    const pool = new Pool({ connectionString: env.DATABASE_URL });
    return drizzleNeon(pool, { schema });
  }
  // `prepare: false` è necessario dietro un pooler in modalità transazione: le prepared
  // statement non sopravvivono al cambio di connessione.
  return drizzlePostgres(postgres(env.DATABASE_URL!, { prepare: false }), { schema });
}

// LA CONNESSIONE SI APRE AL PRIMO USO, non all'importazione del modulo.
//
// Sembra un dettaglio e non lo è. `next build` carica ogni rotta per raccoglierne i dati,
// comprese quelle che importano questo file: aprendo il client all'importazione, COMPILARE
// richiederebbe un database. Sulla CI non c'è, e nella `docker build` di un'istanza cliente
// non deve esserci — un'immagine si costruisce prima di sapere a quale database parlerà.
//
// La verifica non si allenta, si sposta: la prima query senza `DATABASE_URL` fallisce come
// prima, con lo stesso messaggio. Cambia solo che il rifiuto arriva quando qualcuno chiede
// davvero un dato, invece che quando un compilatore legge un file.
//
// Il client resta uno solo per istanza: si crea alla prima query e sopravvive alle
// invocazioni calde, come prima.
//
// Il tipo si fissa su quello di `postgres-js`: i due driver espongono la stessa superficie
// per tutto ciò che usiamo, ma le loro firme differiscono nei dettagli, e lasciare
// l'unione costringerebbe ogni chiamante a distinguere fra due driver che esistono proprio
// per non doverli distinguere.
type Client = ReturnType<typeof drizzlePostgres<typeof schema>>;

let client: Client | null = null;
const clientVivo = (): Client => (client ??= creaClient() as Client);

export const db = new Proxy({} as Client, {
  get: (_, chiave) => Reflect.get(clientVivo(), chiave),
  has: (_, chiave) => Reflect.has(clientVivo(), chiave),
});
export type Db = typeof db;
export { schema };
