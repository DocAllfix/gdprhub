import { describe, expect, it } from "vitest";
import { PESI, esposizione, prontezza } from "./exposure";
import { risolvi } from "./recurrence";
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

const perfetto = (codice: string, p: Partial<Adempimento> = {}) =>
  a({ codice, stato: "Completata", ultimaEsecuzione: "2026-06-01", ...p });

describe("indice di esposizione", () => {
  it("è zero quando tutto è presidiato e aggiornato", () => {
    const e = esposizione([perfetto("A"), perfetto("B")]);
    expect(e.indice).toBe(0);
    expect(e.giudizio).toBe("Contenuta");
  });

  it("è 100 quando nulla è presidiato ed è tutto scaduto e critico", () => {
    const insieme = [
      a({ codice: "A", priorita: "Critica", ultimaEsecuzione: "2020-01-01" }),
      a({ codice: "B", priorita: "Critica", ultimaEsecuzione: "2020-01-01" }),
    ];
    expect(esposizione(insieme).indice).toBe(100);
  });

  it("resta sempre fra 0 e 100, quali che siano i dati", () => {
    const casi: AdempimentoRisolto[][] = [
      [],
      [a({ codice: "A" })],
      [perfetto("A")],
      [a({ codice: "A", stato: "Non applicabile" })],
      [
        a({ codice: "A", priorita: "Bassa", rischio: 1 }),
        a({ codice: "B", priorita: "Critica", rischio: 10 }),
      ],
    ];
    for (const c of casi) {
      const i = esposizione(c).indice;
      expect(i).toBeGreaterThanOrEqual(0);
      expect(i).toBeLessThanOrEqual(100);
    }
  });

  it("su un insieme vuoto non produce NaN", () => {
    const e = esposizione([]);
    expect(Number.isNaN(e.indice)).toBe(false);
    expect(e.indice).toBe(0);
  });

  it("sa spiegarsi: restituisce sempre componenti e numeri grezzi", () => {
    // È il requisito che distingue questo indice dai 636.515 € del prototipo: un numero
    // che non sa da dove viene non è difendibile davanti a nessuno.
    const e = esposizione([a({ codice: "A", priorita: "Critica", ultimaEsecuzione: "2020-01-01" })]);
    expect(e.componenti.rischioScoperto).toBeGreaterThan(0);
    expect(e.componenti.ritardo).toBeGreaterThan(0);
    expect(e.componenti.criticita).toBeGreaterThan(0);
    expect(e.dettaglio.rischioPesatoTotale).toBeGreaterThan(0);
    expect(e.dettaglio.scadute).toBe(1);
  });

  it("i pesi delle componenti sono espliciti e sommano a uno", () => {
    expect(PESI.rischioScoperto + PESI.ritardo + PESI.criticita).toBeCloseTo(1, 10);
  });

  it("chiudere adempimenti abbassa l'indice, mai il contrario", () => {
    const aperto = [a({ codice: "A", priorita: "Critica" }), a({ codice: "B", priorita: "Alta" })];
    const chiuso = [perfetto("A", { priorita: "Critica" }), a({ codice: "B", priorita: "Alta" })];
    expect(esposizione(chiuso).indice).toBeLessThan(esposizione(aperto).indice);
  });

  it("i giudizi coprono le quattro fasce senza buchi", () => {
    const giudizi = new Set<string>();
    for (let n = 0; n <= 20; n++) {
      const insieme = Array.from({ length: 20 }, (_, i) =>
        i < n
          ? a({ codice: `X${i}`, priorita: "Critica", ultimaEsecuzione: "2020-01-01" })
          : perfetto(`Y${i}`),
      );
      giudizi.add(esposizione(insieme).giudizio);
    }
    expect(giudizi).toEqual(new Set(["Contenuta", "Moderata", "Elevata", "Critica"]));
  });
});

describe("prontezza ispettiva", () => {
  const CHIAVE = ["K1", "K2"];

  it("è 100 quando tutto è a posto, senza bisogno di pavimenti artificiali", () => {
    expect(prontezza([perfetto("K1"), perfetto("K2")], CHIAVE).indice).toBe(100);
  });

  it("è 0 quando non c'è nulla di pronto", () => {
    // Nel prototipo la formula dava −8 sul suo stesso dataset e veniva schiacciata a 20:
    // il numero mostrato non aveva più alcun rapporto con i dati.
    const insieme = [
      a({ codice: "K1", ultimaEsecuzione: "2020-01-01" }),
      a({ codice: "K2", ultimaEsecuzione: "2020-01-01" }),
    ];
    expect(prontezza(insieme, CHIAVE).indice).toBe(0);
  });

  it("resta fra 0 e 100 e non ha bisogno di essere tosata", () => {
    const insieme = [perfetto("K1"), a({ codice: "K2", ultimaEsecuzione: "2020-01-01" }), a({ codice: "Z" })];
    const p = prontezza(insieme, CHIAVE);
    expect(p.indice).toBeGreaterThan(0);
    expect(p.indice).toBeLessThan(100);
  });

  it("elenca i presidi chiave scoperti, così il fascicolo si sa cosa manca", () => {
    const insieme = [perfetto("K1"), a({ codice: "K2" })];
    expect(prontezza(insieme, CHIAVE).presidiScoperti).toEqual(["K2"]);
  });

  it("un presidio chiave completato ma scaduto non conta come pronto", () => {
    const insieme = [
      perfetto("K1"),
      a({ codice: "K2", stato: "Completata", ultimaEsecuzione: "2020-01-01" }),
    ];
    expect(prontezza(insieme, CHIAVE).presidiScoperti).toEqual(["K2"]);
  });

  it("senza presidi chiave dichiarati ricade sulla conformità", () => {
    const insieme = [perfetto("A"), a({ codice: "B" })];
    const p = prontezza(insieme, []);
    expect(p.componenti.presidiChiave).toBe(p.componenti.conformita);
  });

  it("su un insieme vuoto non produce NaN", () => {
    expect(Number.isNaN(prontezza([], CHIAVE).indice)).toBe(false);
  });
});
