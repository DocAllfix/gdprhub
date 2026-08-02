import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "@/lib/env";
import * as schema from "./schema";

// Connessione al database.
//
// Una sola stringa, `DATABASE_URL`, che punta a Neon sulla vetrina e al container Postgres
// nelle istanze dedicate. Il codice di dominio non sa quale dei due sta usando: è la stessa
// scelta di progetto degli adapter di storage e PDF.

if (!env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL mancante. In sviluppo copiala in apps/web/.env (vedi .env.example); " +
      "sulla vetrina la inietta l'integrazione Neon; in produzione arriva dal file .env.prod dell'istanza.",
  );
}

// `prepare: false` è necessario dietro un pooler in modalità transazione (Neon e Supabase
// la usano entrambi): le prepared statement non sopravvivono al cambio di connessione.
const client = postgres(env.DATABASE_URL, { prepare: false });

export const db = drizzle(client, { schema });
export type Db = typeof db;
export { schema };
