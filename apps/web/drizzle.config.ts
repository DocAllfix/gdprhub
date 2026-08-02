import { existsSync } from "node:fs";
import { defineConfig } from "drizzle-kit";

// Next carica `.env.local` da solo, drizzle-kit no: senza questo, le migrazioni girerebbero
// contro una stringa vuota. `process.loadEnvFile` è nativo di Node, nessuna dipendenza.
//
// L'ordine conta: un valore già presente nell'ambiente (la CI, o un `DATABASE_URL` passato a
// mano per puntare a un altro database) deve vincere sul file, non essere sovrascritto.
if (!process.env.DATABASE_URL) {
  for (const file of [".env.local", ".env"]) {
    if (existsSync(file)) {
      process.loadEnvFile(file);
      if (process.env.DATABASE_URL) break;
    }
  }
}

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL mancante. In locale: `vercel env pull apps/web/.env.local` dalla radice, " +
      "oppure esporta la variabile a mano.",
  );
}

// Le migrazioni si applicano con la stessa `DATABASE_URL` del runtime: un solo indirizzo,
// nessun secondo canale da tenere allineato.
export default defineConfig({
  schema: "./src/lib/db/schema/index.ts",
  out: "./src/lib/db/migrations",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL },
  casing: "snake_case",
  verbose: true,
  strict: true,
});
