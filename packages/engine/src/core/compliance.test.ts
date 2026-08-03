import { describe, expect, it } from "vitest";
import {
  aperti,
  conformitaEffettiva,
  conformitaLavoro,
  conformitaPer,
  conformitaScadenze,
  conteggi,
  incrocio,
  criticiAperti,
  daPresidiare,
  esclusioniDaMotivare,
} from "./compliance";
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

/** Completato e in regola: ultima esecuzione recente su periodicità annuale. */
const inRegola = (codice: string, p: Partial<Adempimento> = {}) =>
  a({ codice, stato: "Completata", ultimaEsecuzione: "2026-06-01", ...p });

/** Completato ma con il ciclo ormai scaduto. */
const completatoMaScaduto = (codice: string, p: Partial<Adempimento> = {}) =>
  a({ codice, stato: "Completata", ultimaEsecuzione: "2024-01-01", ...p });

describe("i due assi della conformità", () => {
  const insieme = [
    inRegola("A"), // fatto e aggiornato
    completatoMaScaduto("B"), // fatto ma scaduto
    a({ codice: "C", stato: "Da fare", ultimaEsecuzione: "2026-06-01" }), // da fare, tempi ok
    a({ codice: "D", stato: "In corso" }), // da fare, mai eseguito
  ];

  it("l'asse del lavoro conta ciò che è stato portato a termine", () => {
    expect(conformitaLavoro(insieme).percentuale).toBe(50); // A, B
  });

  it("l'asse delle scadenze conta ciò che è aggiornato", () => {
    expect(conformitaScadenze(insieme).percentuale).toBe(50); // A, C
  });

  it("la conformità effettiva richiede entrambe le cose", () => {
    // Il numero difendibile davanti a un ispettore: solo A. Un documento scaduto non
    // protegge nessuno, e uno non ancora redatto nemmeno.
    expect(conformitaEffettiva(insieme).percentuale).toBe(25);
  });

  it("i tre numeri possono divergere, ed è il motivo per cui hanno nomi diversi", () => {
    expect(
      new Set([
        conformitaLavoro(insieme).percentuale,
        conformitaScadenze(insieme).percentuale,
        conformitaEffettiva(insieme).percentuale,
      ]).size,
    ).toBeGreaterThan(1);
  });
});

describe("non applicabili", () => {
  it("escono dal denominatore", () => {
    // Senza questa esclusione l'azienda senza cantieri risulterebbe inadempiente sul PSC.
    const insieme = [
      inRegola("A"),
      a({ codice: "B" }),
      a({ codice: "C", stato: "Non applicabile" }),
      a({ codice: "D", stato: "Non applicabile" }),
    ];
    const q = conformitaEffettiva(insieme);
    expect(q.applicabili).toBe(2);
    expect(q.nonApplicabili).toBe(2);
    expect(q.percentuale).toBe(50);
  });

  it("senza nulla di applicabile la percentuale è null, non un 100% inventato", () => {
    expect(conformitaEffettiva([]).percentuale).toBeNull();
    expect(conformitaEffettiva([a({ codice: "A", stato: "Non applicabile" })]).percentuale).toBeNull();
  });

  it("segnala le esclusioni prive di motivazione", () => {
    const insieme = [
      a({ codice: "A", stato: "Non applicabile" }),
      a({ codice: "B", stato: "Non applicabile" }),
      a({ codice: "C", stato: "Non applicabile" }),
      a({ codice: "D" }),
    ];
    expect(esclusioniDaMotivare(insieme, { A: "Nessun cantiere", B: "   " })).toEqual(["B", "C"]);
    expect(esclusioniDaMotivare([insieme[0]!], { A: "motivo" })).toEqual([]);
  });
});

describe("presidi continui", () => {
  it("contano come effettivi se completati, pur non avendo scadenza", () => {
    // Un presidio permanente non «scade»: pretendere una scadenza lo renderebbe
    // perennemente non conforme.
    const continuo = a({
      codice: "K",
      stato: "Completata",
      periodicita: { tipo: "continua" },
      ultimaEsecuzione: "2020-01-01",
    });
    expect(continuo.statoScadenza).toBe("Da programmare");
    expect(conformitaEffettiva([continuo]).percentuale).toBe(100);
  });
});

describe("arrotondamento", () => {
  it("arrotonda all'intero più vicino", () => {
    expect(conformitaEffettiva([inRegola("A"), a({ codice: "B" }), a({ codice: "C" })]).percentuale).toBe(33);
    expect(conformitaEffettiva([inRegola("A"), inRegola("B"), a({ codice: "C" })]).percentuale).toBe(67);
  });

  it("un adempimento in corso non conta come completato", () => {
    // Sembra ovvio, ma è la differenza fra una relazione onesta e una compiacente.
    expect(conformitaLavoro([a({ codice: "A", stato: "In corso" })]).percentuale).toBe(0);
  });
});

describe("raggruppamenti", () => {
  const insieme = [
    inRegola("T1", { ruolo: "Titolare" }),
    a({ codice: "T2", ruolo: "Titolare" }),
    inRegola("R1", { ruolo: "Responsabile" }),
    a({ codice: "D1", ruolo: "DPO", stato: "Non applicabile" }),
  ];

  it("misura ogni gruppo sul proprio insieme", () => {
    const perRuolo = conformitaPer(insieme, (x) => x.ruolo);
    expect(perRuolo.Titolare?.percentuale).toBe(50);
    expect(perRuolo.Responsabile?.percentuale).toBe(100);
  });

  it("un gruppo di soli non applicabili vale null, non zero", () => {
    expect(conformitaPer(insieme, (x) => x.ruolo).DPO?.percentuale).toBeNull();
  });

  it("funziona con qualunque chiave, non solo il ruolo", () => {
    const perDominio = conformitaPer(insieme, (x) => x.dominio);
    expect(Object.keys(perDominio)).toEqual(["gdpr"]);
  });
});

describe("conteggi sui due assi", () => {
  it("ogni asse somma al totale: gli stati si escludono a vicenda", () => {
    const insieme = [
      inRegola("A"),
      completatoMaScaduto("B"),
      a({ codice: "C" }),
      a({ codice: "D", stato: "Non applicabile" }),
    ];
    const c = conteggi(insieme);
    expect(Object.values(c.perLavoro).reduce((x, y) => x + y, 0)).toBe(insieme.length);
    expect(Object.values(c.perScadenza).reduce((x, y) => x + y, 0)).toBe(insieme.length);
    expect(c.perLavoro.Completata).toBe(2);
    expect(c.perScadenza.Scaduta).toBe(1);
  });

  it("l'incrocio isola «completata E scaduta», che i due conteggi separati non sanno dire", () => {
    const insieme = [
      inRegola("A"),
      completatoMaScaduto("B"),
      a({ codice: "C" }),
      a({ codice: "D", stato: "Non applicabile" }),
    ];
    const g = incrocio(insieme);

    // La cella che conta: fatto, e nondimeno scaduto.
    expect(g.Completata.Scaduta).toBe(1);
    // La stessa colonna «Completata» contiene anche il caso sano, ed è il punto: i due
    // conteggi separati direbbero «2 completate, 1 scaduta» senza dire che si sovrappongono.
    expect(g.Completata.Regolare).toBe(1);

    // L'incrocio è una partizione: nessun adempimento sta in due celle, nessuno in zero.
    const somma = Object.values(g)
      .flatMap((riga) => Object.values(riga))
      .reduce((x, y) => x + y, 0);
    expect(somma).toBe(insieme.length);

    // E ogni margine coincide con il conteggio del proprio asse: se divergessero, una delle
    // due letture della stessa realtà sarebbe sbagliata e non si saprebbe quale.
    const c = conteggi(insieme);
    for (const [lavoro, riga] of Object.entries(g)) {
      const totaleRiga = Object.values(riga).reduce((x, y) => x + y, 0);
      expect(totaleRiga).toBe(c.perLavoro[lavoro as keyof typeof c.perLavoro]);
    }
  });
});

describe("insiemi operativi", () => {
  const insieme = [
    inRegola("A", { priorita: "Critica" }), // fatto e aggiornato
    completatoMaScaduto("B", { priorita: "Critica" }), // fatto ma scaduto
    a({ codice: "C", stato: "Da fare", priorita: "Critica" }),
    a({ codice: "D", stato: "Non applicabile", priorita: "Critica" }),
    a({ codice: "E", stato: "In corso", priorita: "Alta" }),
  ];

  it("aperto significa che c'è ancora lavoro: né completato né escluso", () => {
    expect(aperti(insieme).map((x) => x.codice)).toEqual(["C", "E"]);
  });

  it("da presidiare include anche ciò che è chiuso ma scaduto", () => {
    // È la differenza che serve allo scadenzario: B è «fatto», ma va rifatto.
    expect(daPresidiare(insieme).map((x) => x.codice)).toEqual(["B", "C", "E"]);
  });

  it("i critici da presidiare escludono i critici già in regola e i non applicabili", () => {
    expect(criticiAperti(insieme).map((x) => x.codice)).toEqual(["B", "C"]);
  });
});
