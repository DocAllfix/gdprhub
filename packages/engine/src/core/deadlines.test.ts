import { describe, expect, it } from "vitest";
import { dataDiCalendario, formattaIt, giorniTra, piuGiorni, piuMesi, scomponi } from "./deadlines";

describe("date di calendario", () => {
  it("converte un istante nella data percepita a Roma", () => {
    // Le 23:30 UTC del 14 agosto a Roma sono già l'1:30 del 15.
    expect(dataDiCalendario(new Date("2026-08-14T23:30:00Z"))).toBe("2026-08-15");
    // Le 21:30 UTC sono ancora il 14.
    expect(dataDiCalendario(new Date("2026-08-14T21:30:00Z"))).toBe("2026-08-14");
  });

  it("rifiuta le date malformate e quelle inesistenti", () => {
    expect(() => scomponi("14/08/2026")).toThrow(/Atteso YYYY-MM-DD/);
    expect(() => scomponi("2026-02-30")).toThrow(/inesistente/);
    expect(() => scomponi("2026-13-01")).toThrow(/inesistente/);
  });

  it("formatta all'italiana", () => {
    expect(formattaIt("2026-08-05")).toBe("05/08/2026");
  });
});

describe("aritmetica dei giorni attraverso il cambio d'ora", () => {
  // È il punto in cui i prototipi sbagliavano: dividendo i millisecondi per 86.400.000, la
  // notte in cui l'ora legale entra o esce produce 0,96 o 1,04 giorni invece di 1 esatto.

  it("l'ultima domenica di marzo dura comunque un giorno", () => {
    // In Italia l'ora legale 2026 entra il 29 marzo: quella notte ha 23 ore.
    expect(giorniTra("2026-03-28", "2026-03-29")).toBe(1);
    expect(giorniTra("2026-03-28", "2026-03-30")).toBe(2);
  });

  it("l'ultima domenica di ottobre dura comunque un giorno", () => {
    // Il 25 ottobre 2026 si torna all'ora solare: quella notte ha 25 ore.
    expect(giorniTra("2026-10-24", "2026-10-25")).toBe(1);
    expect(giorniTra("2026-10-24", "2026-10-26")).toBe(2);
  });

  it("attraversa un anno bisestile senza scarti", () => {
    expect(giorniTra("2024-01-01", "2025-01-01")).toBe(366);
    expect(giorniTra("2025-01-01", "2026-01-01")).toBe(365);
  });

  it("è negativo all'indietro e nullo su sé stessa", () => {
    expect(giorniTra("2026-08-14", "2026-08-01")).toBe(-13);
    expect(giorniTra("2026-08-14", "2026-08-14")).toBe(0);
  });

  it("somma giorni restando sul calendario", () => {
    expect(piuGiorni("2026-02-27", 2)).toBe("2026-03-01"); // 2026 non è bisestile
    expect(piuGiorni("2024-02-27", 2)).toBe("2024-02-29"); // 2024 sì
    expect(piuGiorni("2026-03-28", 1)).toBe("2026-03-29"); // notte di 23 ore
    expect(piuGiorni("2026-01-01", -1)).toBe("2025-12-31");
  });
});

describe("somma di mesi", () => {
  it("somma il caso semplice", () => {
    expect(piuMesi("2026-01-15", 1)).toBe("2026-02-15");
    expect(piuMesi("2026-01-15", 12)).toBe("2027-01-15");
    expect(piuMesi("2026-01-15", 36)).toBe("2029-01-15");
  });

  it("arretra al giorno valido quando il mese di arrivo è più corto", () => {
    // Il punto del modulo: una scadenza non deve mai SPOSTARSI IN AVANTI per un artefatto
    // di calcolo. Il 31 gennaio più un mese è il 28 febbraio, non il 3 marzo.
    expect(piuMesi("2026-01-31", 1)).toBe("2026-02-28");
    expect(piuMesi("2024-01-31", 1)).toBe("2024-02-29"); // bisestile
    expect(piuMesi("2026-03-31", 1)).toBe("2026-04-30");
    expect(piuMesi("2026-08-31", 6)).toBe("2027-02-28");
  });

  it("attraversa il capodanno in avanti e all'indietro", () => {
    expect(piuMesi("2026-11-15", 3)).toBe("2027-02-15");
    expect(piuMesi("2026-02-15", -3)).toBe("2025-11-15");
    expect(piuMesi("2026-01-10", -1)).toBe("2025-12-10");
  });

  it("con zero mesi non cambia nulla", () => {
    expect(piuMesi("2024-02-29", 0)).toBe("2024-02-29");
  });

  it("regge le periodicità reali dei tre cataloghi", () => {
    // 1, 3, 6, 12, 24, 36, 48, 60 mesi sono tutte presenti nei cataloghi estratti.
    for (const mesi of [1, 3, 6, 12, 24, 36, 48, 60]) {
      const arrivo = piuMesi("2026-01-15", mesi);
      expect(arrivo, `+${mesi} mesi`).toMatch(/^\d{4}-\d{2}-15$/);
      expect(giorniTra("2026-01-15", arrivo), `+${mesi} mesi`).toBeGreaterThan(0);
    }
  });

  it("è reversibile quando il giorno esiste in entrambi i mesi", () => {
    expect(piuMesi(piuMesi("2026-05-15", 7), -7)).toBe("2026-05-15");
  });

  it("sentinella: il 2026 non è bisestile", () => {
    // Protegge dai refusi negli altri test di questo file.
    expect(() => scomponi("2026-02-29")).toThrow(/inesistente/);
  });
});
