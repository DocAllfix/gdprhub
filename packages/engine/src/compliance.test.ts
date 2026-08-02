import { describe, expect, it } from "vitest";
import {
  aperti,
  conformita,
  conformitaPerRuolo,
  conformitaPerTuttiIRuoli,
  conteggioPerStato,
  criticiAperti,
  esclusioniDaMotivare,
} from "./compliance";
import type { Controllo } from "./types";

const c = (p: Partial<Controllo> & { codice: string }): Controllo => ({
  ruolo: "Titolare",
  stato: "Da fare",
  priorita: "Media",
  rischio: 5,
  scadenza: "2026-12-31",
  ...p,
});

describe("grado di conformità", () => {
  it("è la quota di completati sugli applicabili", () => {
    const r = conformita([
      c({ codice: "A", stato: "Completata" }),
      c({ codice: "B", stato: "Completata" }),
      c({ codice: "C", stato: "In corso" }),
      c({ codice: "D", stato: "Da fare" }),
    ]);
    expect(r).toEqual({ percentuale: 50, completati: 2, applicabili: 4, nonApplicabili: 0 });
  });

  it("esclude i non applicabili dal denominatore", () => {
    // Senza questa esclusione l'azienda che non fa videosorveglianza risulterebbe
    // inadempiente su un obbligo che non la riguarda.
    const r = conformita([
      c({ codice: "A", stato: "Completata" }),
      c({ codice: "B", stato: "Da fare" }),
      c({ codice: "C", stato: "Non applicabile" }),
      c({ codice: "D", stato: "Non applicabile" }),
    ]);
    expect(r.applicabili).toBe(2);
    expect(r.nonApplicabili).toBe(2);
    expect(r.percentuale).toBe(50);
  });

  it("senza nulla di applicabile restituisce null, non un 100% inventato", () => {
    expect(conformita([]).percentuale).toBeNull();
    expect(conformita([c({ codice: "A", stato: "Non applicabile" })]).percentuale).toBeNull();
  });

  it("arrotonda all'intero più vicino", () => {
    // 1/3 = 33,33 → 33
    expect(
      conformita([c({ codice: "A", stato: "Completata" }), c({ codice: "B" }), c({ codice: "C" })])
        .percentuale,
    ).toBe(33);
    // 2/3 = 66,67 → 67
    expect(
      conformita([
        c({ codice: "A", stato: "Completata" }),
        c({ codice: "B", stato: "Completata" }),
        c({ codice: "C" }),
      ]).percentuale,
    ).toBe(67);
  });

  it("un controllo in corso non conta come completato", () => {
    // Sembra ovvio, ma è la differenza fra una relazione onesta e una compiacente.
    expect(conformita([c({ codice: "A", stato: "In corso" })]).percentuale).toBe(0);
  });
});

describe("conformità per ruolo", () => {
  const controlli = [
    c({ codice: "T1", ruolo: "Titolare", stato: "Completata" }),
    c({ codice: "T2", ruolo: "Titolare" }),
    c({ codice: "R1", ruolo: "Responsabile", stato: "Completata" }),
    c({ codice: "D1", ruolo: "DPO", stato: "Non applicabile" }),
  ];

  it("misura ogni ruolo sul proprio insieme", () => {
    expect(conformitaPerRuolo(controlli, "Titolare").percentuale).toBe(50);
    expect(conformitaPerRuolo(controlli, "Responsabile").percentuale).toBe(100);
  });

  it("un ruolo con soli non applicabili non vale zero: vale null", () => {
    expect(conformitaPerRuolo(controlli, "DPO").percentuale).toBeNull();
  });

  it("copre tutti e tre i ruoli anche quando uno non ha controlli", () => {
    const tutti = conformitaPerTuttiIRuoli([c({ codice: "T1", ruolo: "Titolare" })]);
    expect(Object.keys(tutti)).toEqual(["Titolare", "Responsabile", "DPO"]);
    expect(tutti.Responsabile.percentuale).toBeNull();
  });
});

describe("conteggio per stato", () => {
  it("gli stati si escludono a vicenda e sommano al totale", () => {
    // Nel prototipo un controllo scaduto finiva sia fra i "Da fare" sia fra i ritardi.
    const controlli = [
      c({ codice: "A", stato: "Da fare", scadenza: "2020-01-01" }),
      c({ codice: "B", stato: "In corso" }),
      c({ codice: "C", stato: "Completata" }),
      c({ codice: "D", stato: "Non applicabile" }),
    ];
    const conteggio = conteggioPerStato(controlli);
    expect(conteggio).toEqual({ "Da fare": 1, "In corso": 1, Completata: 1, "Non applicabile": 1 });
    expect(Object.values(conteggio).reduce((a, b) => a + b, 0)).toBe(controlli.length);
  });
});

describe("controlli aperti", () => {
  const controlli = [
    c({ codice: "A", stato: "Da fare", priorita: "Critica" }),
    c({ codice: "B", stato: "In corso", priorita: "Critica" }),
    c({ codice: "C", stato: "Completata", priorita: "Critica" }),
    c({ codice: "D", stato: "Non applicabile", priorita: "Critica" }),
    c({ codice: "E", stato: "Da fare", priorita: "Alta" }),
  ];

  it("aperto significa che c'è ancora lavoro: né completato né escluso", () => {
    expect(aperti(controlli).map((x) => x.codice)).toEqual(["A", "B", "E"]);
  });

  it("i critici aperti escludono i critici già chiusi e quelli non applicabili", () => {
    expect(criticiAperti(controlli).map((x) => x.codice)).toEqual(["A", "B"]);
  });
});

describe("esclusioni da motivare", () => {
  it("segnala i non applicabili privi di motivazione", () => {
    const controlli = [
      c({ codice: "A", stato: "Non applicabile" }),
      c({ codice: "B", stato: "Non applicabile" }),
      c({ codice: "C", stato: "Non applicabile" }),
      c({ codice: "D", stato: "Da fare" }),
    ];
    const mancanti = esclusioniDaMotivare(controlli, {
      A: "L'azienda non svolge videosorveglianza",
      B: "   ",
      // C non ha proprio la chiave
    });
    expect(mancanti).toEqual(["B", "C"]);
  });

  it("non segnala nulla quando ogni esclusione è spiegata", () => {
    expect(esclusioniDaMotivare([c({ codice: "A", stato: "Non applicabile" })], { A: "motivo" })).toEqual([]);
  });
});
