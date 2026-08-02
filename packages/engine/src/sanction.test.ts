// Le tre metodologie sanzionatorie.
//
// Il requisito comune, e la ragione per cui questo file esiste: nessuna delle tre produce
// un numero senza dichiarare da dove viene. Il prototipo GDPR stimava 636.515 € con
// coefficienti inventati; qui ogni cifra si porta dietro il metodo, i passi e le assunzioni,
// perché finiscano stampati nella relazione accanto al risultato.

import { describe, expect, it } from "vitest";
import { stimaSanzioneGdpr } from "./gdpr/sanction";
import {
  stimaSanzione231,
  QUOTE_MAX,
  QUOTE_MIN,
  TETTO_RIDUZIONE,
  VALORE_QUOTA_MAX,
  VALORE_QUOTA_MIN,
} from "./d231/sanction";
import { esposizioneD81 } from "./d81/sanction";

describe("GDPR — EDPB 04/2022", () => {
  const base = { fatturatoAnnuo: 40_000_000, categoria: "art83.5", gravita: "media" } as const;

  it("senza fatturato la metodologia non è applicabile e si rifiuta di inventare", () => {
    expect(() => stimaSanzioneGdpr({ ...base, fatturatoAnnuo: Number.NaN })).toThrow(/non è applicabile/);
    expect(() => stimaSanzioneGdpr({ ...base, fatturatoAnnuo: -1 })).toThrow(/non valido/);
  });

  it("il massimo edittale è il maggiore fra soglia fissa e quota del fatturato", () => {
    // Fatturato piccolo: comanda la soglia fissa.
    expect(stimaSanzioneGdpr({ ...base, fatturatoAnnuo: 1_000_000 }).massimoEdittale).toBe(20_000_000);
    // Fatturato grande: comanda il 4%.
    expect(stimaSanzioneGdpr({ ...base, fatturatoAnnuo: 1_000_000_000 }).massimoEdittale).toBe(40_000_000);
    // Art. 83.4: 10 M€ o 2%.
    expect(
      stimaSanzioneGdpr({ ...base, categoria: "art83.4", fatturatoAnnuo: 1_000_000_000 }).massimoEdittale,
    ).toBe(20_000_000);
  });

  it("la forbice non supera mai il massimo edittale", () => {
    for (const fatturato of [500_000, 5_000_000, 80_000_000, 2_000_000_000]) {
      for (const gravita of ["bassa", "media", "alta"] as const) {
        const s = stimaSanzioneGdpr({ ...base, fatturatoAnnuo: fatturato, gravita });
        expect(s.massimo, `${fatturato} ${gravita}`).toBeLessThanOrEqual(s.massimoEdittale);
        expect(s.minimo).toBeLessThanOrEqual(s.massimo);
        expect(s.minimo).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("più grave, più alta la stima", () => {
    const b = stimaSanzioneGdpr({ ...base, gravita: "bassa" }).massimo;
    const m = stimaSanzioneGdpr({ ...base, gravita: "media" }).massimo;
    const a = stimaSanzioneGdpr({ ...base, gravita: "alta" }).massimo;
    expect(b).toBeLessThan(m);
    expect(m).toBeLessThan(a);
  });

  it("la riduzione dimensionale protegge le PMI", () => {
    // Con lo stesso massimo edittale di 20 M€, una PMI non deve ricevere la stima di una
    // multinazionale: è il senso del passo 2-bis delle Linee guida.
    const pmi = stimaSanzioneGdpr({ ...base, fatturatoAnnuo: 1_500_000 });
    const grande = stimaSanzioneGdpr({ ...base, fatturatoAnnuo: 400_000_000 });
    expect(pmi.massimo).toBeLessThan(grande.massimo);
  });

  it("le aggravanti alzano e le attenuanti abbassano", () => {
    const nudo = stimaSanzioneGdpr(base).massimo;
    const aggravato = stimaSanzioneGdpr({ ...base, circostanze: { dolo: true, recidiva: true } }).massimo;
    const attenuato = stimaSanzioneGdpr({
      ...base,
      circostanze: { cooperazione: true, mitigazione: true },
    }).massimo;
    expect(aggravato).toBeGreaterThan(nudo);
    expect(attenuato).toBeLessThan(nudo);
  });

  it("dichiara sempre metodo, passi e assunzioni", () => {
    const s = stimaSanzioneGdpr({ ...base, circostanze: { dolo: true } });
    expect(s.metodo).toContain("EDPB");
    expect(s.passi.length).toBeGreaterThanOrEqual(4);
    expect(s.assunzioni.some((x) => x.includes("Fatturato"))).toBe(true);
    expect(s.assunzioni.some((x) => x.includes("dolosa"))).toBe(true);
    // L'avvertenza finale deve esserci sempre.
    expect(s.assunzioni.at(-1)).toMatch(/non sostituisce un parere legale/);
  });
});

describe("231 — sanzione per quote, artt. 10-12", () => {
  const base = { gravita: "media", fatturatoAnnuo: 40_000_000 } as const;

  it("senza fatturato non determina il valore della quota", () => {
    expect(() => stimaSanzione231({ ...base, fatturatoAnnuo: Number.NaN })).toThrow(/non è determinabile/);
  });

  it("le quote restano dentro i limiti dell'art. 10", () => {
    for (const gravita of ["lieve", "media", "grave", "gravissima"] as const) {
      const s = stimaSanzione231({ ...base, gravita });
      expect(s.quote.min, gravita).toBeGreaterThanOrEqual(QUOTE_MIN);
      expect(s.quote.max, gravita).toBeLessThanOrEqual(QUOTE_MAX);
    }
  });

  it("il valore della quota resta dentro i limiti di legge", () => {
    for (const fatturato of [500_000, 8_000_000, 40_000_000, 900_000_000]) {
      const s = stimaSanzione231({ ...base, fatturatoAnnuo: fatturato });
      expect(s.valoreQuota).toBeGreaterThanOrEqual(VALORE_QUOTA_MIN);
      expect(s.valoreQuota).toBeLessThanOrEqual(VALORE_QUOTA_MAX);
    }
  });

  it("la sanzione è il prodotto quote × valore, come prescrive la norma", () => {
    const s = stimaSanzione231(base);
    expect(s.minimo).toBe(s.quote.min * s.valoreQuota);
    expect(s.massimo).toBe(s.quote.max * s.valoreQuota);
  });

  it("un modello adottato prima del fatto riduce le quote", () => {
    const senza = stimaSanzione231(base);
    const con = stimaSanzione231({ ...base, modelloAdottatoPrimaDelFatto: true });
    expect(con.quote.max).toBeLessThan(senza.quote.max);
    expect(con.massimo).toBeLessThan(senza.massimo);
  });

  it("le riduzioni dell'art. 12 rispettano il tetto di legge", () => {
    const s = stimaSanzione231({
      ...base,
      gravita: "gravissima",
      fatturatoAnnuo: 900_000_000,
      riduzione: "dalMetaAiDueTerzi",
    });
    expect(s.massimo).toBeLessThanOrEqual(TETTO_RIDUZIONE);
  });

  it("avverte sempre delle interdittive, che non sono monetizzabili", () => {
    // Per molte imprese l'interdizione dall'attività o il divieto di contrattare con la PA
    // è più grave della sanzione pecuniaria: tacerlo renderebbe la relazione fuorviante.
    const s = stimaSanzione231(base);
    expect(s.avvertenzaInterdittive).toContain("art. 9");
    expect(s.avvertenzaInterdittive).toContain("interdittive");
  });

  it("dichiara metodo, passi e assunzioni", () => {
    const s = stimaSanzione231(base);
    expect(s.metodo).toContain("artt. 10-12");
    expect(s.passi.length).toBeGreaterThanOrEqual(4);
    expect(s.assunzioni.at(-1)).toMatch(/spetta al giudice/);
  });
});

describe("81/08 — contravvenzioni", () => {
  it("le fattispecie note producono ammende, le altre non producono numeri inventati", () => {
    const e = esposizioneD81(["S01", "S02", "CODICE-SENZA-FATTISPECIE"]);
    expect(e.fattispecie).toHaveLength(2);
    expect(e.ammendeMinimo).toBeGreaterThan(0);
    expect(e.ammendeMassimo).toBeGreaterThan(e.ammendeMinimo);
  });

  it("indica chi risponde personalmente, perché non risponde l'azienda", () => {
    const e = esposizioneD81(["S01"]);
    expect(e.fattispecie[0]?.soggetto).toBe("Datore di lavoro");
    expect(e.fattispecie[0]?.arresto).toBeTruthy();
  });

  it("segnala il ponte con il 231 ex art. 25-septies", () => {
    // È il collegamento cross-dominio più pesante della suite: da una violazione dell'81/08
    // può discendere la responsabilità dell'ENTE.
    const e = esposizioneD81(["S01", "S02", "S06"]);
    expect(e.rilevanti231).toBe(3);
    expect(e.assunzioni.some((x) => x.includes("25-septies"))).toBe(true);
  });

  it("avverte che le sanzioni non sono omogenee agli altri due domini", () => {
    const e = esposizioneD81(["S01"]);
    expect(e.assunzioni[0]).toMatch(/PERSONE FISICHE/);
    expect(e.assunzioni.some((x) => x.includes("rivalutazione"))).toBe(true);
  });

  it("su un insieme vuoto restituisce zero senza errori", () => {
    const e = esposizioneD81([]);
    expect(e.ammendeMinimo).toBe(0);
    expect(e.fattispecie).toHaveLength(0);
  });
});
