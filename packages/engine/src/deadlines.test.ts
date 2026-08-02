import { describe, expect, it } from "vitest";
import {
  dataDiCalendario,
  giorniAllaScadenza,
  giorniTra,
  perUrgenza,
  piuGiorni,
  quadroScadenze,
  èImminente,
  èInRitardo,
} from "./deadlines";
import type { Controllo } from "./types";

const c = (p: Partial<Controllo> & { scadenza: string }): Controllo => ({
  codice: "X01",
  ruolo: "Titolare",
  stato: "Da fare",
  priorita: "Media",
  rischio: 5,
  ...p,
});

describe("date di calendario", () => {
  it("converte un istante nella data percepita a Roma", () => {
    // Le 23:30 UTC del 14 agosto a Roma sono già l'1:30 del 15.
    expect(dataDiCalendario(new Date("2026-08-14T23:30:00Z"))).toBe("2026-08-15");
    // Le 22:30 UTC sono ancora il 14.
    expect(dataDiCalendario(new Date("2026-08-14T21:30:00Z"))).toBe("2026-08-14");
  });

  it("rifiuta le date malformate e quelle inesistenti", () => {
    expect(() => giorniTra("14/08/2026", "2026-08-15")).toThrow(/Atteso YYYY-MM-DD/);
    expect(() => giorniTra("2026-02-30", "2026-03-01")).toThrow(/inesistente/);
  });
});

describe("aritmetica dei giorni attraverso il cambio d'ora", () => {
  // È il punto in cui il prototipo sbagliava: dividendo i millisecondi per 86.400.000, la
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

  it("attraversa un intero anno bisestile senza scarti", () => {
    expect(giorniTra("2024-01-01", "2025-01-01")).toBe(366);
    expect(giorniTra("2025-01-01", "2026-01-01")).toBe(365);
  });

  it("somma giorni restando sul calendario", () => {
    expect(piuGiorni("2026-02-27", 2)).toBe("2026-03-01"); // 2026 non è bisestile
    expect(piuGiorni("2024-02-27", 2)).toBe("2024-02-29"); // 2024 sì
    expect(piuGiorni("2026-03-28", 1)).toBe("2026-03-29"); // notte di 23 ore
    expect(piuGiorni("2026-01-01", -1)).toBe("2025-12-31");
  });
});

describe("ritardo e imminenza", () => {
  const oggi = "2026-08-14";

  it("scadere oggi non è essere in ritardo: si ha tempo fino a stasera", () => {
    const controllo = c({ scadenza: oggi });
    expect(giorniAllaScadenza(controllo, oggi)).toBe(0);
    expect(èInRitardo(controllo, oggi)).toBe(false);
    expect(èImminente(controllo, oggi)).toBe(true);
  });

  it("un giorno oltre la scadenza è ritardo", () => {
    expect(èInRitardo(c({ scadenza: "2026-08-13" }), oggi)).toBe(true);
  });

  it("un controllo completato non è mai in ritardo, per quanto vecchia sia la scadenza", () => {
    expect(èInRitardo(c({ scadenza: "2020-01-01", stato: "Completata" }), oggi)).toBe(false);
  });

  it("un controllo non applicabile esce da ogni conteggio di scadenza", () => {
    const na = c({ scadenza: "2020-01-01", stato: "Non applicabile" });
    expect(èInRitardo(na, oggi)).toBe(false);
    expect(èImminente(na, oggi)).toBe(false);
  });

  it("l'imminenza si ferma al bordo della finestra", () => {
    expect(èImminente(c({ scadenza: "2026-08-21" }), oggi)).toBe(true); // +7
    expect(èImminente(c({ scadenza: "2026-08-22" }), oggi)).toBe(false); // +8
    expect(èImminente(c({ scadenza: "2026-08-22" }), oggi, 8)).toBe(true);
  });

  it("chi è in ritardo non è anche imminente: sono insiemi disgiunti", () => {
    // Nel prototipo un controllo poteva essere contato due volte fra gli stati.
    const scaduto = c({ scadenza: "2026-08-01" });
    expect(èInRitardo(scaduto, oggi)).toBe(true);
    expect(èImminente(scaduto, oggi)).toBe(false);
  });
});

describe("quadro delle scadenze", () => {
  const oggi = "2026-08-14";
  const controlli = [
    c({ codice: "A", scadenza: "2026-07-15" }), // 30 giorni di ritardo
    c({ codice: "B", scadenza: "2026-08-09" }), // 5 giorni di ritardo
    c({ codice: "C", scadenza: "2026-08-14" }), // scade oggi
    c({ codice: "D", scadenza: "2026-08-20" }), // fra 6 giorni
    c({ codice: "E", scadenza: "2026-09-30" }), // lontano
    c({ codice: "F", scadenza: "2020-01-01", stato: "Completata" }),
    c({ codice: "G", scadenza: "2020-01-01", stato: "Non applicabile" }),
  ];

  it("conta ritardi e imminenti senza sovrapporli", () => {
    const q = quadroScadenze(controlli, oggi);
    expect(q.inRitardo).toBe(2);
    expect(q.imminenti).toBe(2);
  });

  it("misura anche la gravità del ritardo, non solo quanti sono", () => {
    // Dieci ritardi di un giorno non sono come uno di dieci mesi: la relazione deve poterlo dire.
    const q = quadroScadenze(controlli, oggi);
    expect(q.ritardoMassimoGiorni).toBe(30);
    expect(q.ritardoTotaleGiorni).toBe(35);
  });

  it("su un insieme senza ritardi restituisce zeri, non valori inventati", () => {
    const q = quadroScadenze([c({ scadenza: "2027-01-01" })], oggi);
    expect(q).toEqual({
      inRitardo: 0,
      imminenti: 0,
      ritardoMassimoGiorni: 0,
      ritardoTotaleGiorni: 0,
    });
  });

  it("regge un insieme vuoto", () => {
    expect(quadroScadenze([], oggi).inRitardo).toBe(0);
  });
});

describe("ordinamento per urgenza", () => {
  it("mette davanti i più arretrati e scarta chiusi e non applicabili", () => {
    const ordinati = perUrgenza([
      c({ codice: "TARDI", scadenza: "2026-09-01" }),
      c({ codice: "SUBITO", scadenza: "2026-07-01" }),
      c({ codice: "FATTO", scadenza: "2026-01-01", stato: "Completata" }),
      c({ codice: "NA", scadenza: "2026-01-01", stato: "Non applicabile" }),
    ]);
    expect(ordinati.map((x) => x.codice)).toEqual(["SUBITO", "TARDI"]);
  });

  it("non modifica l'array ricevuto", () => {
    const originale = [
      c({ codice: "B", scadenza: "2026-09-01" }),
      c({ codice: "A", scadenza: "2026-07-01" }),
    ];
    perUrgenza(originale);
    expect(originale.map((x) => x.codice)).toEqual(["B", "A"]);
  });
});
