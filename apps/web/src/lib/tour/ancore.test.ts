// Ogni passo del tour punta a un ancoraggio che esiste davvero.
//
// È il cancello che il piano chiede per F11, e la ragione è che il difetto è SILENZIOSO:
// driver.js non protesta se un selettore non trova nulla, salta il passo e va avanti. Il
// tour continua a funzionare, spiega una cosa in meno, e nessuno se ne accorge finché un
// cliente non chiede perché la guida non gli mostra quello che gli serve.
//
// Il test legge i sorgenti invece di ispezionare il DOM, e non è un ripiego: un test sul DOM
// verificherebbe solo le pagine che riesce ad aprire, mentre qui si copre ogni ancoraggio
// di ogni tour senza dover autenticare nulla. Il costo è che un `data-tour` scritto in un
// modo che il lettore non riconosce sfugge — per questo il test verifica anche il contrario,
// cioè che gli ancoraggi trovati nel codice siano un insieme non vuoto e plausibile.

import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { extname, join } from "node:path";
import { ANCORE_USATE, TOUR } from "./passi";

const RADICE = join(process.cwd(), "src");

function sorgenti(cartella: string): string[] {
  const dentro = readdirSync(cartella, { withFileTypes: true });
  return dentro.flatMap((v) => {
    const percorso = join(cartella, v.name);
    // Le anteprime di design non sono il prodotto: un ancoraggio che esiste solo lì non
    // conta come esistente.
    if (v.isDirectory()) return v.name === "varianti" ? [] : sorgenti(percorso);
    return [".tsx", ".ts"].includes(extname(v.name)) ? [percorso] : [];
  });
}

const testo = sorgenti(RADICE)
  .map((f) => readFileSync(f, "utf8"))
  .join("\n");

/** Gli ancoraggi scritti come stringa letterale nel codice. */
const ANCORE_NEL_CODICE = new Set(
  [...testo.matchAll(/data-tour="([^"{]+)"/g)].map((m) => m[1]).filter((a): a is string => Boolean(a)),
);

describe("gli ancoraggi del tour", () => {
  it("il lettore trova ancoraggi nel codice: se questo fallisce, tutto il resto è finto", () => {
    // Senza questa verifica, un errore nell'espressione regolare renderebbe l'insieme vuoto
    // e i test sotto passerebbero per il motivo sbagliato.
    expect(ANCORE_NEL_CODICE.size).toBeGreaterThan(15);
    expect(ANCORE_NEL_CODICE.has("tabella-scadenzario")).toBe(true);
  });

  it("ogni passo di ogni tour punta a un `data-tour` che esiste nel prodotto", () => {
    const mancanti = ANCORE_USATE.filter((a) => !ANCORE_NEL_CODICE.has(a));
    expect(
      mancanti,
      `ancoraggi citati dal tour ma non presenti nel codice: ${mancanti.join(", ")}`,
    ).toEqual([]);
  });

  it("nessun tour è vuoto e nessuna chiave è ripetuta", () => {
    for (const t of TOUR) {
      expect(t.passi.length, `il tour «${t.chiave}» non ha passi`).toBeGreaterThan(0);
    }
    const chiavi = TOUR.map((t) => t.chiave);
    expect(new Set(chiavi).size, "due tour con la stessa chiave: uno dei due non si aprirà mai").toBe(
      chiavi.length,
    );
  });

  it("ogni passo dice qualcosa: niente titoli senza testo o testi da didascalia", () => {
    for (const t of TOUR) {
      for (const p of t.passi) {
        expect(p.titolo.length, `${t.chiave}: titolo vuoto`).toBeGreaterThan(3);
        // Sotto le ottanta battute è una didascalia — «questa è la tabella» — e una
        // didascalia non insegna niente a chi sta già guardando la tabella.
        expect(
          p.testo.length,
          `${t.chiave} · «${p.titolo}»: il testo è troppo corto per spiegare un perché`,
        ).toBeGreaterThan(80);
      }
    }
  });
});
