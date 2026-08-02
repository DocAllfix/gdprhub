import { describe, expect, it } from "vitest";
import { simulaChiusura, suggerisciPriorita } from "./simulate";
import { risolvi } from "./recurrence";
import { conformitaEffettiva } from "./compliance";
import type { Adempimento, AdempimentoRisolto } from "./types";

const OGGI = "2026-08-14";

const a = (p: Partial<Adempimento> & { codice: string }): AdempimentoRisolto =>
  risolvi(
    {
      dominio: "gdpr",
      categoria: "Titolare",
      ruolo: "Titolare",
      stato: "Da fare",
      priorita: "Media",
      rischio: 5,
      periodicita: { tipo: "periodica", mesi: 12 },
      ultimaEsecuzione: null,
      scadenzaEsplicita: null,
      ...p,
    },
    OGGI,
  );

describe("simulatore what-if", () => {
  const insieme = [
    a({ codice: "A", priorita: "Critica", rischio: 9 }),
    a({ codice: "B", priorita: "Alta", rischio: 7 }),
    a({ codice: "C", priorita: "Bassa", rischio: 2 }),
  ];

  it("non scrive nulla: l'insieme di partenza resta intatto", () => {
    // Vincolo assoluto: il simulatore serve a mostrare, non a modificare.
    const primaJson = JSON.stringify(insieme);
    simulaChiusura(insieme, ["A", "B"], OGGI);
    expect(JSON.stringify(insieme)).toBe(primaJson);
  });

  it("chiudere adempimenti alza la conformità e abbassa l'esposizione", () => {
    const e = simulaChiusura(insieme, ["A"], OGGI);
    expect(e.delta.conformita).toBeGreaterThan(0);
    expect(e.delta.esposizione).toBeGreaterThan(0);
    expect(e.dopo.conformita!).toBeGreaterThan(e.prima.conformita!);
  });

  it("chiudere tutto porta alla conformità piena e all'esposizione nulla", () => {
    const e = simulaChiusura(insieme, ["A", "B", "C"], OGGI);
    expect(e.dopo.conformita).toBe(100);
    expect(e.dopo.esposizione.indice).toBe(0);
  });

  it("chiudere significa anche spostare la scadenza in avanti", () => {
    const e = simulaChiusura([a({ codice: "A", ultimaEsecuzione: "2020-01-01" })], ["A"], OGGI);
    // Prima era scaduto, dopo è in regola: la periodicità riparte da oggi.
    expect(e.prima.esposizione.dettaglio.scadute).toBe(1);
    expect(e.dopo.esposizione.dettaglio.scadute).toBe(0);
  });

  it("i codici inesistenti si segnalano, non si ignorano in silenzio", () => {
    const e = simulaChiusura(insieme, ["A", "NON-ESISTE"], OGGI);
    expect(e.chiusi).toEqual(["A"]);
    expect(e.ignorati).toEqual(["NON-ESISTE"]);
  });

  it("chiudere nulla non cambia nulla", () => {
    const e = simulaChiusura(insieme, [], OGGI);
    expect(e.delta.conformita).toBe(0);
    expect(e.delta.esposizione).toBe(0);
  });

  it("il risultato coincide col motore vero, non è una stima a parte", () => {
    const e = simulaChiusura(insieme, ["A"], OGGI);
    const manuale = conformitaEffettiva(
      insieme.map((x) =>
        x.codice === "A" ? risolvi({ ...x, stato: "Completata", ultimaEsecuzione: OGGI }, OGGI) : x,
      ),
    );
    expect(e.dopo.conformita).toBe(manuale.percentuale);
  });
});

describe("suggerimenti di priorità", () => {
  const insieme = [
    a({ codice: "LIEVE", priorita: "Bassa", rischio: 2 }),
    a({ codice: "GRAVE", priorita: "Critica", rischio: 10 }),
    a({ codice: "MEDIO", priorita: "Media", rischio: 5 }),
    a({
      codice: "FATTO",
      stato: "Completata",
      ultimaEsecuzione: "2026-06-01",
      priorita: "Critica",
      rischio: 10,
    }),
  ];

  it("mette davanti ciò che pesa di più", () => {
    expect(suggerisciPriorita(insieme, OGGI).map((s) => s.codice)).toEqual(["GRAVE", "MEDIO", "LIEVE"]);
  });

  it("non suggerisce ciò che è già presidiato", () => {
    expect(suggerisciPriorita(insieme, OGGI).map((s) => s.codice)).not.toContain("FATTO");
  });

  it("misura il guadagno simulandolo davvero, non stimandolo", () => {
    const s = suggerisciPriorita(insieme, OGGI);
    for (const x of s) {
      expect(x.guadagno).toBe(simulaChiusura(insieme, [x.codice], OGGI).delta.esposizione);
    }
  });

  it("rispetta il numero richiesto", () => {
    expect(suggerisciPriorita(insieme, OGGI, 2)).toHaveLength(2);
  });

  it("su un insieme tutto presidiato non suggerisce nulla", () => {
    expect(
      suggerisciPriorita([a({ codice: "X", stato: "Completata", ultimaEsecuzione: "2026-06-01" })], OGGI),
    ).toEqual([]);
  });
});
