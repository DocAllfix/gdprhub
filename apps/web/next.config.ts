import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const radiceMonorepo = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

/** Il Chromium compresso. Percorso relativo alla cartella dell'applicazione. */
const CHROMIUM_BIN = "../../node_modules/.pnpm/@sparticuz+chromium@*/node_modules/@sparticuz/chromium/bin/**";

const nextConfig: NextConfig = {
  // Motore e componenti condivisi sono pubblicati come sorgente TypeScript dal workspace:
  // niente passo di build separato, né in sviluppo né su Vercel.
  transpilePackages: ["@gdpr/engine", "@gdpr/ui"],

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
  //
  // OGNI ROTTA CHE PRODUCE UN PDF VA ELENCATA QUI. Non è automatico e non lo diventerà:
  // una chiave `/**` metterebbe cinquanta megabyte di Chromium dentro ogni funzione. La
  // rete di sicurezza è `node scripts/prototipi-pdf.mjs --base <produzione>`, che ha già
  // colto questa dimenticanza una volta: i prototipi rispondevano 500 su Vercel e 200 in
  // locale, perché la rotta nuova non era in questo elenco.
  outputFileTracingIncludes: {
    "/api/spike-pdf": [CHROMIUM_BIN],
    // NON scrivere `/prototipi/[documento]`: le chiavi sono glob, e le parentesi quadre
    // valgono come classe di caratteri. `[documento]` significa «un carattere fra d, o, c,
    // u, m, e, n, t», quindi non corrisponde a nulla e la cartella non viene inclusa.
    // La build resta verde e la rotta risponde 500 solo in produzione.
    "/prototipi/**": [CHROMIUM_BIN],
    // La relazione vera segue la stessa regola: glob con `**`, mai le parentesi quadre.
    // È lo stesso difetto che ha fatto rispondere 500 alla rotta dei prototipi in
    // produzione mentre in locale funzionava, e si ripeterebbe identico.
    "/api/relazioni/**": [CHROMIUM_BIN],
    "/api/fascicolo/**": [CHROMIUM_BIN],
  },

  // IL LIMITE DI CARICAMENTO DICHIARATO ERA FITTIZIO.
  //
  // `lib/storage` dichiara `DIMENSIONE_MASSIMA = 25 MB` e l'azione lo verifica, ma il corpo
  // di una server action si ferma a 1 MB per impostazione predefinita: un file piu' grande
  // veniva respinto PRIMA di arrivare al controllo, con un errore che non parla di
  // dimensioni. Un DVR in PDF supera 1 MB di regola, quindi il difetto si sarebbe
  // presentato al primo documento vero del primo cliente.
  //
  // Il valore combacia con `DIMENSIONE_MASSIMA`: se un giorno divergono, vince il piu'
  // piccolo e il messaggio d'errore torna a mentire.
  experimental: {
    serverActions: { bodySizeLimit: "25mb" },
  },

  poweredByHeader: false,
};

export default nextConfig;
