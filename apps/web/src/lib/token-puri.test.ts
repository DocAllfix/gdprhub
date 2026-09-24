import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

// LA GUARDIA DEI TOKEN — chiede al foglio quali esistono e al sorgente quali si usano.
//
// `DESIGN.md` riga 7: «Regola non negoziabile: nessun colore, raggio o ombra scritto a mano
// nei componenti. Se un valore serve e non c'è nei token, si aggiunge ai token.» Fino a qui
// la regola era scritta e nient'altro: niente la faceva rispettare.
//
// È la classe di difetto peggiore che questo progetto conosca, e qui è costata due volte:
//
//   - il compilatore non la vede, perché una stringa di classi è una stringa valida;
//   - Tailwind non protesta, perché genera le utility scandendo il TESTO del sorgente: per
//     un token inesistente semplicemente non genera niente, in silenzio;
//   - i test funzionali non la vedono, perché la pagina si apre e i comandi rispondono;
//   - il cancello visivo non la vede, perché guarda console, rete, collegamenti e focus,
//     non quale valore ha prodotto una misura.
//
// Resta un elemento senza fondo, o con l'ombra sbagliata, e lo vede il cliente.
//
// I DUE DIFETTI VERI da cui nasce, trovati il 2026-09-19 e non inventati per l'esempio:
//
//   1. `--shadow-sm/--shadow-md` esistevano in `:root` ma NON erano in `@theme inline`.
//      Quindi `shadow-md` nei componenti non era il nostro token: era l'ombra nera di serie
//      di Tailwind, che sul tema scuro non si azzera — mentre il token, di proposito, vale
//      `transparent` perché sul buio non c'è luce da bloccare. Quattro componenti
//      portavano un'ombra nera su fondo notte, e la build era verde.
//
//   2. 125 occorrenze di `text-[…]` scritte a mano: una scala tipografica reale che nessuno
//      aveva dichiarato, quindi che nessuno poteva cambiare in un punto solo.
//
// La guardia è STRUTTURALE e non un elenco di nomi: un token nuovo si protegge da solo, e
// un token rinominato fa fallire subito i punti rimasti indietro.

const RADICE = join(import.meta.dirname, "..");
const MONOREPO = join(RADICE, "..", "..", "..");

// I TOKEN STANNO IN UN PACCHETTO dal 2026-09-24, condivisi con la landing: `@theme inline` si
// legge da lì. E la guardia scansiona TUTTO il codice che ne usa le classi — il prodotto, il
// pacchetto condiviso e la landing — perché un valore a mano in uno qualunque dei tre è lo
// stesso difetto, e la landing è proprio il posto dove verrebbe voglia di scriverne.
const CSS = join(MONOREPO, "packages", "ui", "tokens.css");
const CARTELLE = [RADICE, join(MONOREPO, "packages", "ui", "src"), join(MONOREPO, "apps", "landing", "src")];

/** Le famiglie di utility che `DESIGN.md` vincola: colore, raggio, ombra. */
const FAMIGLIE = ["bg", "text", "border", "ring", "fill", "stroke", "shadow", "rounded", "from", "to", "via", "outline", "divide", "decoration", "accent", "caret"] as const;

/**
 * Fuori dal perimetro, ognuno con il suo perché.
 *
 * `varianti/` sono le pagine-laboratorio che hanno fatto scegliere la forma al committente:
 * confrontano palette candidate, quindi i valori letterali sono il loro contenuto. In
 * produzione rispondono 404 (`app/varianti/layout.tsx`).
 *
 * `global-error.tsx` sostituisce l'intero documento, `<html>` compreso, quindi non può
 * caricare il foglio di stile: è l'unico posto del progetto in cui i valori a mano sono
 * l'unica strada, ed è dichiarato nel file stesso.
 *
 * `spike-pdf` è una rotta di prova fuori dall'interfaccia: genera HTML per Puppeteer.
 */
const ESENTI = [
  join("app", "varianti"),
  join("app", "global-error.tsx"),
  join("app", "api", "spike-pdf"),
];

function sorgenti(dir: string, out: string[] = []): string[] {
  for (const voce of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, voce.name);
    if (voce.isDirectory()) sorgenti(p, out);
    else if (/\.tsx$/.test(voce.name)) out.push(p);
  }
  return out;
}

/**
 * Via i commenti prima di cercare.
 *
 * ⚠️ Serve davvero: questo file cita `text-[10px]` e `shadow-md` nel commento che RACCONTA
 * il difetto, e senza questo taglio la guardia accuserebbe se stessa. Una classe dentro un
 * commento non è una classe: Tailwind scandisce il testo, ma il browser non riceve niente
 * da una riga commentata, quindi non c'è nessun elemento da lasciare senza fondo.
 *
 * Il taglio a `//` può mangiare del codice vero dopo un `https://` sulla stessa riga. È un
 * difetto accettato e in una direzione sola: fa perdere un'occorrenza, non ne inventa una.
 * Una guardia che grida al lupo si smette di leggere.
 */
function senzaCommenti(testo: string): string {
  return testo.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/[^\n]*/g, " ");
}

function fileDaControllare(): { percorso: string; testo: string }[] {
  return CARTELLE.filter((c) => existsSync(c))
    .flatMap((c) => sorgenti(c))
    .filter((p) => !ESENTI.some((e) => p.includes(e)))
    .map((percorso) => ({ percorso, testo: senzaCommenti(readFileSync(percorso, "utf8")) }));
}

function relativo(p: string): string {
  return p.slice(MONOREPO.length + 1).replace(/\\/g, "/");
}

describe("i token sono l'unica sorgente di colore, raggio e ombra", () => {
  it("nessuna utility con valore arbitrario che non passi da un token", () => {
    const famiglie = FAMIGLIE.join("|");
    // `bg-[oklch(...)]` fallisce; `bg-[var(--scaduta)]` passa, perché il token c'è comunque.
    const arbitraria = new RegExp(`\\b(?:${famiglie})-\\[([^\\]]+)\\]`, "g");

    const colpe: string[] = [];
    for (const { percorso, testo } of fileDaControllare()) {
      for (const m of testo.matchAll(arbitraria)) {
        const valore = m[1] ?? "";
        if (valore.includes("var(--")) continue; // deriva da un token: è lecito
        const riga = testo.slice(0, m.index).split("\n").length;
        colpe.push(`${relativo(percorso)}:${riga}  ${m[0]}`);
      }
    }

    expect(colpe, `Valori scritti a mano invece che presi dai token:\n  ${colpe.join("\n  ")}`).toEqual([]);
  });

  it("nessun colore letterale nei componenti", () => {
    // Un colore scritto per esteso non commuta col tema: resta quello in entrambi.
    const letterale = /#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?|oklch|oklab|lab)\(/g;

    const colpe: string[] = [];
    for (const { percorso, testo } of fileDaControllare()) {
      for (const m of testo.matchAll(letterale)) {
        const riga = testo.slice(0, m.index).split("\n").length;
        colpe.push(`${relativo(percorso)}:${riga}  ${m[0]}`);
      }
    }

    expect(colpe, `Colori letterali: non commutano col tema.\n  ${colpe.join("\n  ")}`).toEqual([]);
  });

  it("ogni token di ombra, raggio e misura usato nel sorgente è esposto in @theme inline", () => {
    // QUESTO È IL CONTROLLO CHE AVREBBE TROVATO IL DIFETTO DELLE OMBRE.
    //
    // Un token può esistere in `:root` ed essere invisibile alle utility di Tailwind, che
    // le genera solo dai nomi dichiarati in `@theme`. In quel caso `shadow-md` non è il
    // token: è il valore di serie di Tailwind, che porta un'altra cosa. Il divario fra i
    // due elenchi è esattamente lo spazio in cui vive quel difetto.
    const css = readFileSync(CSS, "utf8");
    const blocco = css.match(/@theme inline\s*\{([\s\S]*?)\n\}/);
    expect(blocco, "`@theme inline` non trovato in packages/ui/tokens.css").not.toBeNull();

    const esposti = new Set<string>();
    const corpo = blocco?.[1] ?? "";
    for (const m of corpo.matchAll(/^\s*--([a-z0-9-]+)\s*:/gm)) {
      if (m[1]) esposti.add(m[1]);
    }

    // ⚠️ LA FAMIGLIA DI UTILITY NON SI CHIAMA COME LO SPAZIO DEI TOKEN: le utility
    // `rounded-*` leggono da `--radius-*`. Scriverlo a occhio fa accusare quaranta punti
    // corretti, che è il modo più rapido per far disattivare una guardia.
    const SPAZIO: Record<string, string> = { shadow: "shadow", rounded: "radius" };

    // Nomi di scala che un token non ce l'hanno e non devono averlo: sono estremi
    // geometrici, non gradini. `rounded-full` è «un cerchio», e nessun valore di marca
    // lo rende più nostro.
    const ESTREMI = ["none", "full", "inner"];

    const scale: Record<string, string[]> = {
      shadow: ["2xs", "xs", "sm", "md", "lg", "xl", "2xl", "none", "inner"],
      rounded: ["none", "full", "2xs", "xs", "sm", "md", "lg", "xl", "2xl", "3xl", "4xl"],
    };

    const colpe: string[] = [];
    for (const [famiglia, scala] of Object.entries(scale)) {
      const uso = new RegExp(`\\b${famiglia}-([a-z0-9]+(?:-[a-z0-9]+)*)\\b`, "g");
      for (const { percorso, testo } of fileDaControllare()) {
        for (const m of testo.matchAll(uso)) {
          const nome = m[1];
          if (!nome || !scala.includes(nome)) continue; // nomi nostri: coperti dal primo controllo
          if (ESTREMI.includes(nome)) continue;
          const spazio = SPAZIO[famiglia] ?? famiglia;
          if (esposti.has(`${spazio}-${nome}`)) continue; // esposto: è il nostro
          // Un nome della scala di Tailwind non esposto fra i nostri token significa che
          // quella utility porta il valore di SERIE, non il nostro.
          const riga = testo.slice(0, m.index).split("\n").length;
          colpe.push(`${relativo(percorso)}:${riga}  ${m[0]}  (scala Tailwind, non il token)`);
        }
      }
    }

    expect(
      colpe,
      `Utility che sembrano nostre e non lo sono: il token esiste in :root ma non è esposto\n` +
        `in @theme inline, quindi Tailwind serve il proprio valore di serie.\n  ${colpe.join("\n  ")}`,
    ).toEqual([]);
  });
});
