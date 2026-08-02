#!/usr/bin/env node
// Verifica che ogni rotta che genera PDF si porti dietro il Chromium.
//
// Questo difetto è già costato due volte. La prima alla Fase 0: la cartella `bin` di
// @sparticuz non è importata da nessun modulo, quindi la tracciatura di Next non la vede e
// va dichiarata a mano in `outputFileTracingIncludes`. La seconda alla Fase 5: la rotta
// nuova non era nell'elenco, e poi la chiave `/prototipi/[documento]` non corrispondeva
// perché le chiavi sono glob e le parentesi quadre valgono come classe di caratteri.
//
// Entrambe le volte la build era verde, i test verdi, il PDF usciva in locale, e la rotta
// rispondeva 500 solo in produzione. Un controllo che si esegue dopo `pnpm build` e legge
// i file di tracciatura chiude la questione: nessun deploy per scoprirlo.
//
//   node scripts/traccia-pdf.mjs   (dopo pnpm build)

import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const APP = join(dirname(fileURLToPath(import.meta.url)), "..");
const SORGENTI = join(APP, "src", "app");
const COSTRUITO = join(APP, ".next", "server", "app");

if (!existsSync(COSTRUITO)) {
  console.error("✗ Nessuna build trovata. Esegui prima `pnpm build`.");
  process.exit(1);
}

/** Tutte le rotte del sorgente che importano il resa-PDF, direttamente o meno. */
function rottePdf(cartella, trovate = []) {
  for (const voce of readdirSync(cartella)) {
    const percorso = join(cartella, voce);
    if (statSync(percorso).isDirectory()) {
      rottePdf(percorso, trovate);
    } else if (voce === "route.ts" || voce === "route.tsx") {
      const testo = readFileSync(percorso, "utf8");
      // Import diretto o passaggio per un modulo di documenti: entrambi finiscono in
      // `rendiPdf`, e i moduli di documenti non esistono per altro scopo.
      if (/@\/lib\/pdf|rendiPdf/.test(testo)) {
        trovate.push(relative(SORGENTI, dirname(percorso)).split("\\").join("/"));
      }
    }
  }
  return trovate;
}

const rotte = rottePdf(SORGENTI);
if (rotte.length === 0) {
  console.error("✗ Nessuna rotta PDF trovata: il controllo non sta verificando nulla.");
  process.exit(1);
}

let errori = 0;
for (const rotta of rotte) {
  const traccia = join(COSTRUITO, rotta, "route.js.nft.json");
  if (!existsSync(traccia)) {
    console.log(`  ✗ /${rotta} · file di tracciatura assente`);
    errori += 1;
    continue;
  }
  const { files } = JSON.parse(readFileSync(traccia, "utf8"));
  const binari = files.filter((f) => f.includes("chromium/bin"));
  if (binari.length === 0) {
    console.log(`  ✗ /${rotta} · Chromium NON tracciato: in produzione risponderà 500`);
    console.log(`       aggiungi la rotta a outputFileTracingIncludes in next.config.ts`);
    errori += 1;
  } else {
    console.log(`  ok  /${rotta} · ${binari.length} binari di Chromium tracciati`);
  }
}

if (errori > 0) {
  console.log(`\n✗ ${errori} rotte PDF non funzioneranno in serverless.\n`);
  process.exit(1);
}
console.log(`\n✓ ${rotte.length} rotte PDF complete di Chromium.\n`);
