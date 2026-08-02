import { describe, expect, it } from "vitest";
import {
  FASCE_RISCHIO,
  PESO_PRIORITA,
  matriceRischio,
  rischioEffettivo,
  rischioPesato,
  rischioPesatoMassimo,
} from "./risk";
import { risolvi } from "./recurrence";
import { PRIORITA, type Adempimento, type AdempimentoRisolto } from "./types";

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

describe("rischio effettivo", () => {
  it("usa il valore dichiarato quando c'è", () => {
    expect(rischioEffettivo({ rischio: 9, priorita: "Media" })).toBe(9);
  });

  it("lo deduce dalla priorità quando manca", () => {
    // 231 e 81/08 non hanno un campo rischio: trattarlo come zero renderebbe quei domini
    // artificialmente innocui rispetto al GDPR.
    expect(rischioEffettivo({ rischio: null, priorita: "Critica" })).toBe(9);
    expect(rischioEffettivo({ rischio: null, priorita: "Alta" })).toBe(7);
    expect(rischioEffettivo({ rischio: null, priorita: "Media" })).toBe(5);
    expect(rischioEffettivo({ rischio: null, priorita: "Bassa" })).toBe(3);
  });

  it("non produce mai zero, per nessuna priorità", () => {
    for (const p of PRIORITA) expect(rischioEffettivo({ rischio: null, priorita: p })).toBeGreaterThan(0);
  });
});

describe("rischio pesato", () => {
  it("somma solo ciò che va presidiato", () => {
    const insieme = [
      a({ codice: "A", rischio: 10, priorita: "Critica" }), // 10 × 1.5 = 15
      a({
        codice: "B",
        rischio: 10,
        priorita: "Critica",
        stato: "Completata",
        ultimaEsecuzione: "2026-06-01",
      }),
    ];
    expect(rischioPesato(insieme)).toBe(15);
  });

  it("ciò che è completato e scaduto continua a pesare", () => {
    // È il caso che il prototipo perdeva: un documento chiuso ma vecchio è un rischio
    // aperto, non un presidio.
    const scaduto = a({
      codice: "S",
      rischio: 8,
      priorita: "Alta",
      stato: "Completata",
      ultimaEsecuzione: "2020-01-01",
    });
    expect(scaduto.statoScadenza).toBe("Scaduta");
    expect(rischioPesato([scaduto])).toBeCloseTo(8 * PESO_PRIORITA.Alta, 5);
  });

  it("i non applicabili non pesano né al numeratore né al denominatore", () => {
    const insieme = [
      a({ codice: "A", rischio: 10 }),
      a({ codice: "B", rischio: 10, stato: "Non applicabile" }),
    ];
    expect(rischioPesato(insieme)).toBe(10);
    expect(rischioPesatoMassimo(insieme)).toBe(10);
  });

  it("il pesato non supera mai il massimo", () => {
    const insieme = [a({ codice: "A", priorita: "Critica" }), a({ codice: "B", priorita: "Bassa" })];
    expect(rischioPesato(insieme)).toBeLessThanOrEqual(rischioPesatoMassimo(insieme));
  });

  it("su un insieme vuoto vale zero, non NaN", () => {
    expect(rischioPesato([])).toBe(0);
    expect(rischioPesatoMassimo([])).toBe(0);
  });
});

describe("matrice rischio × priorità", () => {
  it("ha 16 celle e assi dichiarati", () => {
    const m = matriceRischio([a({ codice: "A" })]);
    expect(m).toHaveLength(FASCE_RISCHIO.length * PRIORITA.length);
    expect(new Set(m.map((c) => c.fascia)).size).toBe(4);
    expect(new Set(m.map((c) => c.priorita)).size).toBe(4);
  });

  it("ogni cella è raggiungibile dai dati", () => {
    // Nel prototipo la colonna 4 e la riga 0 erano strutturalmente sempre vuote: restava
    // una griglia 3×3 utile su 16 celle.
    const insieme = FASCE_RISCHIO.flatMap((f) =>
      PRIORITA.map((p) => a({ codice: `${f.etichetta}-${p}`, rischio: f.da, priorita: p })),
    );
    const m = matriceRischio(insieme);
    expect(m.every((c) => c.quanti === 1)).toBe(true);
  });

  it("l'intensità viene dai dati, non dalla posizione", () => {
    // Due celle nella stessa posizione relativa devono differire se differiscono i dati.
    const insieme = [
      a({ codice: "A1", rischio: 10, priorita: "Critica" }),
      a({ codice: "A2", rischio: 10, priorita: "Critica" }),
      a({ codice: "A3", rischio: 10, priorita: "Critica" }),
      a({ codice: "B1", rischio: 1, priorita: "Bassa" }),
    ];
    const m = matriceRischio(insieme);
    const carica = m.find((c) => c.fascia === "Critico" && c.priorita === "Critica")!;
    const leggera = m.find((c) => c.fascia === "Basso" && c.priorita === "Bassa")!;
    expect(carica.intensita).toBe(1);
    expect(leggera.intensita).toBeGreaterThan(0);
    expect(leggera.intensita).toBeLessThan(0.2);
  });

  it("su una matrice vuota l'intensità è zero ovunque, non NaN", () => {
    const m = matriceRischio([]);
    expect(m.every((c) => c.intensita === 0 && c.quanti === 0)).toBe(true);
  });

  it("elenca i codici di ogni cella, così la matrice è navigabile", () => {
    const m = matriceRischio([a({ codice: "T11", rischio: 9, priorita: "Critica" })]);
    expect(m.find((c) => c.fascia === "Critico" && c.priorita === "Critica")?.codici).toEqual(["T11"]);
  });

  it("i conteggi delle celle sommano agli adempimenti da presidiare", () => {
    const insieme = [
      a({ codice: "A", rischio: 9, priorita: "Critica" }),
      a({ codice: "B", rischio: 4, priorita: "Media" }),
      a({ codice: "C", stato: "Completata", ultimaEsecuzione: "2026-06-01" }), // presidiato
      a({ codice: "D", stato: "Non applicabile" }),
    ];
    expect(matriceRischio(insieme).reduce((t, c) => t + c.quanti, 0)).toBe(2);
  });
});
