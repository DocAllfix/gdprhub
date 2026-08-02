#!/usr/bin/env node
// Incorpora i font del documento PDF in un modulo TypeScript, come data URI.
//
// PERCHÉ ESISTE. Lo spike della Fase 0 ha dimostrato che il Chromium serverless non ha
// font di sistema: il titolo del PDF di prova è uscito con un sans di ripiego. Un
// documento che dipende dai font della macchina si stampa diverso a ogni ambiente, e
// quello del cliente è l'ambiente su cui non abbiamo alcun controllo.
//
// Perché un modulo TS committato e non una lettura da `node_modules` a runtime: i file
// di `node_modules` non entrano nel bundle della funzione serverless a meno di tracciarli
// a mano, ed è esattamente il difetto che ha fatto fallire il primo PDF su Vercel. Un
// modulo importato dal codice viene tracciato dal bundler senza che nessuno se ne ricordi.
//
//   node scripts/incorpora-font.mjs           rigenera il modulo
//   node scripts/incorpora-font.mjs --check   fallisce se il modulo è disallineato (CI)

import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const QUI = dirname(fileURLToPath(import.meta.url));
const RADICE = join(QUI, "..", "..", "..");
const USCITA = join(QUI, "..", "src", "lib", "documenti", "font-incorporati.ts");

// Solo i tagli che il documento usa davvero. Ogni taglio in più sono ~30 KB nel bundle
// della funzione, e un font che nessuna riga richiama è peso senza resa.
const TAGLI = [
  { pacchetto: "newsreader", famiglia: "Newsreader", peso: 400, stile: "normal" },
  { pacchetto: "newsreader", famiglia: "Newsreader", peso: 400, stile: "italic" },
  { pacchetto: "newsreader", famiglia: "Newsreader", peso: 600, stile: "normal" },
  { pacchetto: "ibm-plex-sans", famiglia: "IBM Plex Sans", peso: 400, stile: "normal" },
  { pacchetto: "ibm-plex-sans", famiglia: "IBM Plex Sans", peso: 600, stile: "normal" },
  { pacchetto: "ibm-plex-mono", famiglia: "IBM Plex Mono", peso: 400, stile: "normal" },
];

/** Risolve la cartella `files` del pacchetto dentro lo store di pnpm. */
function cartellaFile(pacchetto) {
  const store = join(RADICE, "node_modules", ".pnpm");
  const prefisso = `@fontsource+${pacchetto}@`;
  const cartella = readdirSync(store).find((n) => n.startsWith(prefisso));
  if (!cartella) throw new Error(`@fontsource/${pacchetto} non installato`);
  return join(store, cartella, "node_modules", "@fontsource", pacchetto, "files");
}

function generaModulo() {
  const facce = TAGLI.map((t) => {
    const file = join(cartellaFile(t.pacchetto), `${t.pacchetto}-latin-${t.peso}-${t.stile}.woff2`);
    const base64 = readFileSync(file).toString("base64");
    return `@font-face{font-family:"${t.famiglia}";font-style:${t.stile};font-weight:${t.peso};font-display:block;src:url(data:font/woff2;base64,${base64}) format("woff2")}`;
  });

  const kb = Math.round(facce.join("").length / 1024);

  return `// GENERATO da scripts/incorpora-font.mjs — non modificare a mano.
// Rigenera con \`pnpm font:incorpora\`; \`pnpm font:check\` lo verifica in CI.
//
// Sottoinsieme latino di Newsreader (serif editoriale del documento), IBM Plex Sans e
// IBM Plex Mono. ~${kb} KB di base64: è il prezzo di un documento che si stampa identico
// su Vercel, su una VPS del cliente e su un portatile senza rete.

/** Blocco \`@font-face\` autonomo, da incollare nello \`<style>\` del documento. */
export const FONT_INCORPORATI = ${JSON.stringify(facce.join("\n"))};

/** Tagli incorporati, per i test che verificano che il documento non ne chieda altri. */
export const TAGLI_INCORPORATI = ${JSON.stringify(
    TAGLI.map((t) => ({ famiglia: t.famiglia, peso: t.peso, stile: t.stile })),
    null,
    2,
  )} as const;
`;
}

const atteso = generaModulo();

if (process.argv.includes("--check")) {
  let presente = "";
  try {
    presente = readFileSync(USCITA, "utf8");
  } catch {
    console.error("✗ font-incorporati.ts assente. Esegui `pnpm font:incorpora`.");
    process.exit(1);
  }
  if (presente !== atteso) {
    console.error("✗ font-incorporati.ts disallineato dai file di @fontsource.");
    console.error("  Esegui `pnpm font:incorpora` e includi il risultato nel commit.");
    process.exit(1);
  }
  console.log(`✓ font incorporati allineati (${TAGLI.length} tagli)`);
} else {
  writeFileSync(USCITA, atteso);
  console.log(`✓ ${TAGLI.length} tagli incorporati in src/lib/documenti/font-incorporati.ts`);
}
