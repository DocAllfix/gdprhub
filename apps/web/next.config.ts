import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const radiceMonorepo = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

const nextConfig: NextConfig = {
  // Il motore è pubblicato come sorgente TypeScript dal workspace: niente passo di build
  // separato, né in sviluppo né su Vercel.
  transpilePackages: ["@gdpr/engine"],

  // Serve al Dockerfile della distribuzione per istanza (Fase 16). Vercel lo ignora,
  // quindi tenerlo qui non costa nulla e impedisce che produzione e vetrina divergano.
  output: "standalone",
  // In un monorepo la tracciatura dei file deve partire dalla radice, altrimenti il
  // pacchetto `engine` resta fuori dall'output.
  outputFileTracingRoot: radiceMonorepo,

  // Chromium non va impacchettato dal bundler: resta un modulo esterno della funzione.
  // `playwright` serve solo al driver PDF locale; su Vercel quel ramo non viene mai
  // caricato, ma va comunque dichiarato esterno perché la tracciatura lo incontra.
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core", "playwright"],

  // La tracciatura di Next segue gli import JavaScript, non i file di dati. Il Chromium
  // compresso di @sparticuz vive in una cartella `bin/` che nessuno importa, quindi
  // restava fuori dalla funzione e la resa falliva con "input directory does not exist".
  // È il difetto che lo spike della Fase 0 doveva far emergere, e lo ha fatto.
  //
  // I percorsi sono relativi alla cartella dell'applicazione; con pnpm il pacchetto reale
  // sta sotto `.pnpm/` nella radice del monorepo, quindi si risale di due livelli.
  outputFileTracingIncludes: {
    "/api/spike-pdf": [
      "../../node_modules/.pnpm/@sparticuz+chromium@*/node_modules/@sparticuz/chromium/bin/**",
    ],
  },

  poweredByHeader: false,
};

export default nextConfig;
