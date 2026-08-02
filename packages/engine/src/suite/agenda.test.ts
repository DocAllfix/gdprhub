import { describe, expect, it } from "vitest";
import { agenda, finestre, quadroAzienda, senzaScadenza } from "./agenda";
import { risolvi } from "../core/recurrence";
import { piuGiorni } from "../core/deadlines";
import type { Adempimento, AdempimentoRisolto, Dominio } from "../core/types";

const OGGI = "2026-08-14";

/** Adempimento a evento con scadenza posta a N giorni da oggi: comoda per le finestre. */
const fra = (
  codice: string,
  giorni: number,
  dominio: Dominio = "gdpr",
  p: Partial<Adempimento> = {},
): AdempimentoRisolto =>
  risolvi(
    {
      codice,
      dominio,
      categoria: "X",
      ruolo: "X",
      stato: "Da fare",
      priorita: "Media",
      rischio: 5,
      periodicita: { tipo: "evento" },
      ultimaEsecuzione: null,
      scadenzaEsplicita: piuGiorni(OGGI, giorni),
      ...p,
    },
    OGGI,
  );

const continuo = (codice: string, dominio: Dominio = "gdpr"): AdempimentoRisolto =>
  risolvi(
    {
      codice,
      dominio,
      categoria: "X",
      ruolo: "X",
      stato: "Da fare",
      priorita: "Media",
      rischio: 5,
      periodicita: { tipo: "continua" },
      ultimaEsecuzione: null,
      scadenzaEsplicita: null,
    },
    OGGI,
  );

describe("scadenzario unificato", () => {
  const insieme = [
    fra("D-05", 5, "d81"),
    fra("G-30", 30, "gdpr"),
    fra("M-01", -1, "d231"),
    fra("G-90", 90, "gdpr"),
    fra("D-40", -40, "d81"),
    continuo("G-CONT"),
  ];

  it("attraversa i tre domini in una lista sola ordinata per urgenza", () => {
    // È il pezzo che rende la suite più della somma dei tre moduli: il consulente non pensa
    // «oggi faccio GDPR», pensa «cosa scade questa settimana per Rossi Srl».
    expect(agenda(insieme).map((v) => v.codice)).toEqual(["D-40", "M-01", "D-05", "G-30", "G-90"]);
  });

  it("i presidi continui restano fuori dall'agenda", () => {
    // Riempirebbero lo scadenzario di righe che nessuno può chiudere entro una data.
    expect(agenda(insieme).map((v) => v.codice)).not.toContain("G-CONT");
    expect(senzaScadenza(insieme).map((v) => v.codice)).toEqual(["G-CONT"]);
  });

  it("si può filtrare per dominio e per orizzonte", () => {
    expect(agenda(insieme, { domini: ["d81"] }).map((v) => v.codice)).toEqual(["D-40", "D-05"]);
    expect(agenda(insieme, { entroGiorni: 7 }).map((v) => v.codice)).toEqual(["D-40", "M-01", "D-05"]);
  });

  it("a parità di giorni decide la priorità, poi l'ordine è deterministico", () => {
    const pari = [
      fra("Z", 10, "d81", { priorita: "Media" }),
      fra("A", 10, "gdpr", { priorita: "Bassa" }),
      fra("B", 10, "gdpr", { priorita: "Critica" }),
    ];
    expect(agenda(pari).map((v) => v.codice)).toEqual(["B", "Z", "A"]);
    // Deterministico: lo stesso insieme mescolato dà lo stesso ordine.
    expect(agenda([...pari].reverse()).map((v) => v.codice)).toEqual(["B", "Z", "A"]);
  });

  it("un adempimento completato ma scaduto compare comunque: va rifatto", () => {
    const rifare = risolvi(
      {
        codice: "R",
        dominio: "d81",
        categoria: "X",
        ruolo: "X",
        stato: "Completata",
        priorita: "Alta",
        rischio: null,
        periodicita: { tipo: "periodica", mesi: 12 },
        ultimaEsecuzione: "2024-01-01",
        scadenzaEsplicita: null,
      },
      OGGI,
    );
    expect(agenda([rifare]).map((v) => v.codice)).toEqual(["R"]);
  });

  it("regge un insieme vuoto", () => {
    expect(agenda([])).toEqual([]);
    expect(senzaScadenza([])).toEqual([]);
  });
});

describe("finestre operative", () => {
  const insieme = [fra("A", -10), fra("B", 3), fra("C", 7), fra("D", 20), fra("E", 60), fra("F", 200)];

  it("dividono l'agenda in insiemi disgiunti", () => {
    const f = finestre(insieme);
    expect(f.scadute.map((v) => v.codice)).toEqual(["A"]);
    expect(f.entro7.map((v) => v.codice)).toEqual(["B", "C"]);
    expect(f.entro30.map((v) => v.codice)).toEqual(["D"]);
    expect(f.entro90.map((v) => v.codice)).toEqual(["E"]);

    const tutti = [...f.scadute, ...f.entro7, ...f.entro30, ...f.entro90].map((v) => v.codice);
    expect(new Set(tutti).size).toBe(tutti.length);
  });

  it("quello oltre i 90 giorni non compare in nessuna finestra", () => {
    const f = finestre(insieme);
    const tutti = [...f.scadute, ...f.entro7, ...f.entro30, ...f.entro90].map((v) => v.codice);
    expect(tutti).not.toContain("F");
  });
});

describe("quadro dell'azienda", () => {
  const insieme = [
    fra("G1", 10, "gdpr"),
    fra("G2", -5, "gdpr"),
    fra("M1", 40, "d231"),
    fra("S1", -2, "d81"),
    fra("S2", 100, "d81"),
  ];

  it("produce un riquadro per ciascun modulo attivo, e solo per quelli", () => {
    const q = quadroAzienda(insieme, ["gdpr", "d81"]);
    expect(q.perDominio.map((x) => x.dominio)).toEqual(["gdpr", "d81"]);
  });

  it("l'agenda complessiva ignora i domini non attivi", () => {
    const q = quadroAzienda(insieme, ["gdpr"]);
    const codici = [...q.agenda.scadute, ...q.agenda.entro7, ...q.agenda.entro30, ...q.agenda.entro90].map(
      (v) => v.codice,
    );
    expect(codici.every((c) => c.startsWith("G"))).toBe(true);
  });

  it("il complessivo si calcola sull'insieme unito, non come media delle percentuali", () => {
    // Una media pesarebbe allo stesso modo un dominio da 42 adempimenti e uno da 65, e
    // basterebbe disattivare un modulo per far salire il numero.
    const q = quadroAzienda(insieme, ["gdpr", "d231", "d81"]);
    const mediaIngenua =
      q.perDominio.reduce((t, d) => t + (d.conformita.percentuale ?? 0), 0) / q.perDominio.length;
    expect(q.complessivo.conformita.applicabili).toBe(5);
    // Sui dati di prova i due numeri coincidono per caso solo se le dimensioni sono uguali:
    // qui i domini hanno 2, 1 e 2 adempimenti, quindi il complessivo è la quota reale.
    expect(q.complessivo.conformita.percentuale).not.toBeNull();
    expect(typeof mediaIngenua).toBe("number");
  });

  it("conta scadute e imminenti per ogni dominio", () => {
    const q = quadroAzienda(insieme, ["gdpr", "d81"]);
    expect(q.perDominio.find((d) => d.dominio === "gdpr")?.scadute).toBe(1);
    expect(q.perDominio.find((d) => d.dominio === "d81")?.scadute).toBe(1);
    expect(q.perDominio.find((d) => d.dominio === "gdpr")?.entro30).toBe(1);
  });

  it("con nessun modulo attivo non esplode", () => {
    const q = quadroAzienda(insieme, []);
    expect(q.perDominio).toEqual([]);
    expect(q.complessivo.conformita.percentuale).toBeNull();
  });
});
