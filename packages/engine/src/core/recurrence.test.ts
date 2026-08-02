import { describe, expect, it } from "vitest";
import {
  classificaScadenza,
  descriviPeriodicita,
  prossimaScadenzaSeEseguitoOggi,
  risolvi,
  risolviTutti,
  scadenzaDi,
} from "./recurrence";
import type { Adempimento } from "./types";

const OGGI = "2026-08-14";

const a = (p: Partial<Adempimento> = {}): Adempimento => ({
  codice: "X01",
  dominio: "d81",
  categoria: "Documenti Obbligatori",
  ruolo: "RSPP",
  stato: "Completata",
  priorita: "Media",
  rischio: null,
  periodicita: { tipo: "periodica", mesi: 12 },
  ultimaEsecuzione: null,
  scadenzaEsplicita: null,
  ...p,
});

describe("derivazione della scadenza", () => {
  it("periodica: ultima esecuzione più la periodicità", () => {
    expect(
      scadenzaDi(a({ ultimaEsecuzione: "2025-03-10", periodicita: { tipo: "periodica", mesi: 12 } })),
    ).toBe("2026-03-10");
    expect(
      scadenzaDi(a({ ultimaEsecuzione: "2024-01-31", periodicita: { tipo: "periodica", mesi: 36 } })),
    ).toBe("2027-01-31");
  });

  it("periodica mai eseguita: nessuna scadenza, prima va programmata", () => {
    // Distinzione che conta: un DVR mai redatto non è «scaduto ieri», è «da fare da sempre».
    expect(scadenzaDi(a({ ultimaEsecuzione: null }))).toBeNull();
  });

  it("evento e una tantum: vale la scadenza esplicita", () => {
    expect(scadenzaDi(a({ periodicita: { tipo: "evento" }, scadenzaEsplicita: "2026-09-01" }))).toBe(
      "2026-09-01",
    );
    expect(scadenzaDi(a({ periodicita: { tipo: "una_tantum" }, scadenzaEsplicita: "2026-09-01" }))).toBe(
      "2026-09-01",
    );
    expect(scadenzaDi(a({ periodicita: { tipo: "evento" }, scadenzaEsplicita: null }))).toBeNull();
  });

  it("continua: nessuna scadenza per definizione", () => {
    // Un presidio permanente non «scade»: si sorveglia. Dargli una scadenza inventata
    // riempirebbe lo scadenzario di righe che nessuno può chiudere.
    expect(
      scadenzaDi(
        a({
          periodicita: { tipo: "continua" },
          ultimaEsecuzione: "2020-01-01",
          scadenzaEsplicita: "2026-01-01",
        }),
      ),
    ).toBeNull();
  });

  it("nei periodici la scadenza esplicita non ha voce: comanda l'ultima esecuzione", () => {
    const x = a({
      periodicita: { tipo: "periodica", mesi: 12 },
      ultimaEsecuzione: "2026-01-10",
      scadenzaEsplicita: "2030-12-31",
    });
    expect(scadenzaDi(x)).toBe("2027-01-10");
  });
});

describe("classificazione della scadenza", () => {
  it("distingue i quattro stati", () => {
    expect(classificaScadenza(null, OGGI)).toBe("Da programmare");
    expect(classificaScadenza("2026-08-13", OGGI)).toBe("Scaduta");
    expect(classificaScadenza("2026-08-14", OGGI)).toBe("In scadenza"); // oggi: c'è ancora tempo
    expect(classificaScadenza("2026-09-13", OGGI)).toBe("In scadenza"); // +30, sul bordo
    expect(classificaScadenza("2026-09-14", OGGI)).toBe("Regolare"); // +31
  });

  it("scadere oggi non è essere in ritardo", () => {
    expect(classificaScadenza(OGGI, OGGI)).not.toBe("Scaduta");
  });

  it("la finestra di imminenza è configurabile", () => {
    expect(classificaScadenza("2026-08-20", OGGI, 7)).toBe("In scadenza");
    expect(classificaScadenza("2026-08-22", OGGI, 7)).toBe("Regolare");
  });
});

describe("risoluzione: i due assi restano ortogonali", () => {
  it("un adempimento completato può essere scaduto, ed è corretto", () => {
    // Il caso che nessuno dei tre prototipi sapeva esprimere: il lavoro fu fatto,
    // ma il ciclo è scaduto. Sono due informazioni diverse e servono entrambe.
    const r = risolvi(
      a({
        stato: "Completata",
        ultimaEsecuzione: "2022-01-10",
        periodicita: { tipo: "periodica", mesi: 36 },
      }),
      OGGI,
    );
    expect(r.stato).toBe("Completata");
    expect(r.statoScadenza).toBe("Scaduta");
    expect(r.scadenza).toBe("2025-01-10");
    expect(r.giorniAllaScadenza).toBeLessThan(0);
  });

  it("un adempimento da fare può essere perfettamente in regola sui tempi", () => {
    const r = risolvi(
      a({ stato: "Da fare", ultimaEsecuzione: "2026-06-01", periodicita: { tipo: "periodica", mesi: 12 } }),
      OGGI,
    );
    expect(r.stato).toBe("Da fare");
    expect(r.statoScadenza).toBe("Regolare");
  });

  it("il non applicabile esce da ogni conteggio di scadenza", () => {
    const r = risolvi(a({ stato: "Non applicabile", ultimaEsecuzione: "2000-01-01" }), OGGI);
    expect(r.scadenza).toBeNull();
    expect(r.statoScadenza).toBe("Da programmare");
    expect(r.giorniAllaScadenza).toBeNull();
  });

  it("risolve un insieme senza modificarlo", () => {
    const insieme = [a({ codice: "A", ultimaEsecuzione: "2026-01-01" }), a({ codice: "B" })];
    const risolti = risolviTutti(insieme, OGGI);
    expect(risolti).toHaveLength(2);
    expect(risolti[0]?.scadenza).toBe("2027-01-01");
    expect(risolti[1]?.statoScadenza).toBe("Da programmare");
    expect(insieme[0]).not.toHaveProperty("scadenza");
  });
});

describe("anteprima e descrizione", () => {
  it("dice quando ricadrà la scadenza se eseguito oggi", () => {
    expect(prossimaScadenzaSeEseguitoOggi({ tipo: "periodica", mesi: 36 }, OGGI)).toBe("2029-08-14");
    expect(prossimaScadenzaSeEseguitoOggi({ tipo: "continua" }, OGGI)).toBeNull();
    expect(prossimaScadenzaSeEseguitoOggi({ tipo: "evento" }, OGGI)).toBeNull();
  });

  it("descrive la periodicità nel vocabolario del professionista", () => {
    expect(descriviPeriodicita({ tipo: "periodica", mesi: 1 })).toBe("Mensile");
    expect(descriviPeriodicita({ tipo: "periodica", mesi: 3 })).toBe("Trimestrale");
    expect(descriviPeriodicita({ tipo: "periodica", mesi: 6 })).toBe("Semestrale");
    expect(descriviPeriodicita({ tipo: "periodica", mesi: 12 })).toBe("Annuale");
    expect(descriviPeriodicita({ tipo: "periodica", mesi: 24 })).toBe("Biennale");
    expect(descriviPeriodicita({ tipo: "periodica", mesi: 60 })).toBe("Ogni 5 anni");
    expect(descriviPeriodicita({ tipo: "periodica", mesi: 48 })).toBe("Ogni 4 anni");
    expect(descriviPeriodicita({ tipo: "periodica", mesi: 5 })).toBe("Ogni 5 mesi");
    expect(descriviPeriodicita({ tipo: "continua" })).toBe("Continuo");
    expect(descriviPeriodicita({ tipo: "evento" })).toBe("Al verificarsi");
    expect(descriviPeriodicita({ tipo: "una_tantum" })).toBe("Una tantum");
  });
});
