import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Tassonomia dei test, come nei progetti gemelli:
//   *.test.ts     puri, sempre eseguiti, nessuna dipendenza esterna
//   *.db.test.ts  richiedono un Postgres: si auto-escludono senza DATABASE_URL,
//                 così la suite resta verde su una macchina appena clonata
// Gli end-to-end stanno fuori da qui: girano con Playwright su build di produzione.

const conDatabase = Boolean(process.env.DATABASE_URL);

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    exclude: conDatabase ? [] : ["src/**/*.db.test.ts"],
    reporters: process.env.CI ? ["default", "github-actions"] : ["default"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
