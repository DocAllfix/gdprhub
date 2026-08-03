// I termini dei registri, provati sui casi che si sbagliano davvero.
//
// Non si verifica che l'aritmetica funzioni — quella funziona sempre. Si verificano le
// quattro decisioni che, sbagliate, producono un registro che sembra giusto e non lo è.

import { describe, expect, it } from "vitest";
import { calcolaTermine } from "./termini";
import { REGISTRI, registroPerTipo } from "./tipi";

const ora = (s: string) => new Date(s);

describe("le 72 ore sono ORE, non tre giorni", () => {
  // È la differenza fra un adempimento e una violazione. Una violazione conosciuta venerdì
  // alle 18 scade lunedì alle 18: arrotondare al giorno regalerebbe sei ore che non esistono.
  const conosciuta = ora("2026-08-07T18:00:00Z");

  it("scade esattamente 72 ore dopo la conoscenza", () => {
    const t = calcolaTermine(
      "violazione",
      { conosciutoIl: conosciuta, assoltoIl: null, stato: "aperto" },
      ora("2026-08-08T18:00:00Z"),
    );
    expect(t.scadeIl?.toISOString()).toBe("2026-08-10T18:00:00.000Z");
    expect(Math.round(t.oreResidue ?? 0)).toBe(48);
    expect(t.stato).toBe("in-termine");
  });

  it("alle 18:01 di lunedì è SCADUTA, non ancora in termine", () => {
    const t = calcolaTermine(
      "violazione",
      { conosciutoIl: conosciuta, assoltoIl: null, stato: "aperto" },
      ora("2026-08-10T18:01:00Z"),
    );
    expect(t.stato).toBe("scaduto");
  });

  it("l'avviso arriva nell'ultimo quarto: sulle 72 ore sono le ultime 18", () => {
    const inTermine = calcolaTermine(
      "violazione",
      { conosciutoIl: conosciuta, assoltoIl: null, stato: "aperto" },
      ora("2026-08-09T23:00:00Z"), // ne restano 19
    );
    const agliSgoccioli = calcolaTermine(
      "violazione",
      { conosciutoIl: conosciuta, assoltoIl: null, stato: "aperto" },
      ora("2026-08-10T01:00:00Z"), // ne restano 17
    );
    expect(inTermine.stato).toBe("in-termine");
    expect(agliSgoccioli.stato).toBe("in-scadenza");
  });
});

describe("un termine assolto non scade più", () => {
  // È il difetto che rende un registro inutilizzabile dopo tre mesi d'uso: se una violazione
  // notificata in tempo continua a comparire come «scaduta», nessuno guarda più il registro.
  const conosciuta = ora("2026-01-10T09:00:00Z");

  it("una violazione notificata nei termini resta «assolta» anche un anno dopo", () => {
    const t = calcolaTermine(
      "violazione",
      { conosciutoIl: conosciuta, assoltoIl: ora("2026-01-11T09:00:00Z"), stato: "chiuso" },
      ora("2027-06-01T00:00:00Z"),
    );
    expect(t.stato).toBe("assolto");
    expect(t.descrizione).toMatch(/nei termini/);
  });

  it("una notificata in ritardo resta scritta come tardiva, e non si sbianca", () => {
    // Il ritardo è un fatto: nasconderlo dopo il fatto sarebbe riscrivere il passato.
    const t = calcolaTermine(
      "violazione",
      { conosciutoIl: conosciuta, assoltoIl: ora("2026-01-15T09:00:00Z"), stato: "chiuso" },
      ora("2027-06-01T00:00:00Z"),
    );
    expect(t.stato).toBe("assolto-tardi");
    expect(t.descrizione).toMatch(/ritardo/);
  });
});

describe("la proroga cambia la durata, non la decorrenza", () => {
  // L'art. 12.3 permette novanta giorni invece di trenta, ma il conteggio parte comunque
  // dalla richiesta: farlo ripartire dalla proroga regalerebbe trenta giorni inesistenti.
  const ricevuta = ora("2026-03-01T10:00:00Z");

  it("senza proroga scade a trenta giorni", () => {
    const t = calcolaTermine(
      "diritto",
      { conosciutoIl: ricevuta, assoltoIl: null, stato: "aperto" },
      ora("2026-03-02T10:00:00Z"),
    );
    expect(t.scadeIl?.toISOString().slice(0, 10)).toBe("2026-03-31");
  });

  it("con proroga scade a novanta giorni DALLA RICHIESTA, non dalla proroga", () => {
    const t = calcolaTermine(
      "diritto",
      { conosciutoIl: ricevuta, assoltoIl: null, stato: "aperto", prorogato: true },
      ora("2026-03-02T10:00:00Z"),
    );
    expect(t.scadeIl?.toISOString().slice(0, 10)).toBe("2026-05-30");
  });
});

describe("i registri a validità", () => {
  it("una validità non indicata NON è «in regola»: è un dato mancante, e lo dice", () => {
    // Trattare l'assenza come conformità è il modo in cui un registro diventa una bugia
    // silenziosa: un corso senza scadenza registrata non è un corso che non scade.
    const t = calcolaTermine(
      "formazione",
      { conosciutoIl: ora("2024-01-01T00:00:00Z"), assoltoIl: null, stato: "chiuso" },
      ora("2026-08-03T00:00:00Z"),
    );
    expect(t.stato).toBe("senza-termine");
    expect(t.descrizione).toMatch(/non indicata/);
  });

  it("un corso scaduto risulta scaduto, e da quanto", () => {
    const t = calcolaTermine(
      "formazione",
      {
        conosciutoIl: ora("2021-01-01T00:00:00Z"),
        assoltoIl: null,
        stato: "chiuso",
        validoFinoA: ora("2026-01-01T00:00:00Z"),
      },
      ora("2026-08-03T00:00:00Z"),
    );
    expect(t.stato).toBe("scaduto");
    expect(t.descrizione).toMatch(/scaduto da 2\d\d giorni/);
  });
});

describe("le definizioni sono coerenti", () => {
  it("ogni registro dichiara norma, scopo e un obbligo non vuoto", () => {
    for (const r of REGISTRI) {
      expect(r.norma.length, `${r.tipo}: norma vuota`).toBeGreaterThan(5);
      // Lo scopo deve spiegare PERCHÉ il registro esiste, non ripeterne il nome.
      expect(r.scopo.length, `${r.tipo}: scopo troppo corto per spiegare qualcosa`).toBeGreaterThan(60);
      expect(r.termine.obbligo.length, `${r.tipo}: obbligo vuoto`).toBeGreaterThan(5);
    }
  });

  it("nessun tipo è ripetuto e ogni campo ha una chiave unica", () => {
    const tipi = REGISTRI.map((r) => r.tipo);
    expect(new Set(tipi).size).toBe(tipi.length);
    for (const r of REGISTRI) {
      const chiavi = r.campi.map((c) => c.chiave);
      expect(new Set(chiavi).size, `${r.tipo}: due campi con la stessa chiave`).toBe(chiavi.length);
    }
  });

  it("ogni campo a scelta dichiara le proprie opzioni", () => {
    for (const r of REGISTRI) {
      for (const c of r.campi) {
        if (c.tipo === "scelta") {
          expect(c.opzioni?.length ?? 0, `${r.tipo}.${c.chiave}: scelta senza opzioni`).toBeGreaterThan(1);
        }
      }
    }
  });

  it("`registroPerTipo` trova tutto ciò che è dichiarato", () => {
    for (const r of REGISTRI) expect(registroPerTipo(r.tipo)?.nome).toBe(r.nome);
    expect(registroPerTipo("inesistente")).toBeUndefined();
  });
});
