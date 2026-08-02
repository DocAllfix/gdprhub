import { defineConfig } from "drizzle-kit";

// Le migrazioni si applicano con la stessa `DATABASE_URL` del runtime: un solo indirizzo,
// nessun secondo canale da tenere allineato.
export default defineConfig({
  schema: "./src/lib/db/schema/index.ts",
  out: "./src/lib/db/migrations",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
  casing: "snake_case",
  verbose: true,
  strict: true,
});
