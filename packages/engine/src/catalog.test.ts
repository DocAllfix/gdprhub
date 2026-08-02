// Cancello sui cataloghi: i tre domini sono completi, coerenti e utilizzabili.
// Se questo test fallisce, o un prototipo è cambiato o l'estrattore è rotto: in entrambi i
// casi non si semina nulla finché non è chiaro perché.

import { describe, expect, it } from "vitest";
import {
  CATALOGHI,
  CLIENTI_DIMOSTRATIVI,
  TUTTI_I_TEMPLATES,
  categorieDi,
  costruisciDemo,
  ruoliDi,
  templatePerCodice,
  templatesPerCategoria,
} from "./index";
import { conformitaEffettiva, conteggi } from "./core/compliance";
import { risolviTutti } from "./core/recurrence";
import { DOMINI, PRIORITA, type Dominio } from "./core/types";

const OGGI = "2026-08-14";

/** Numeri verificati eseguendo i tre prototipi originali. */
const ATTESI: Record<Dominio, { totale: number; categorie: number }> = {
  gdpr: { totale: 42, categorie: 3 },
  d231: { totale: 65, categorie: 10 },
  d81: { totale: 64, categorie: 6 },
};

describe("i tre cataloghi", () => {
  it("contengono 171 adempimenti in tutto", () => {
    expect(TUTTI_I_TEMPLATES).toHaveLength(171);
  });

  it.each(DOMINI)("%s ha il numero atteso di adempimenti e categorie", (dominio) => {
    expect(CATALOGHI[dominio]).toHaveLength(ATTESI[dominio].totale);
    expect(categorieDi(dominio)).toHaveLength(ATTESI[dominio].categorie);
  });

  it("il GDPR resta ripartito 20 Titolare, 10 Responsabile, 12 DPO", () => {
    expect(templatesPerCategoria("gdpr", "Titolare")).toHaveLength(20);
    expect(templatesPerCategoria("gdpr", "Responsabile")).toHaveLength(10);
    expect(templatesPerCategoria("gdpr", "DPO")).toHaveLength(12);
  });

  it("nessun codice si ripete dentro il proprio dominio", () => {
    for (const dominio of DOMINI) {
      const codici = CATALOGHI[dominio].map((t) => t.codice);
      expect(new Set(codici).size, dominio).toBe(codici.length);
    }
  });

  it("ogni adempimento è valorizzato e dentro i domini ammessi", () => {
    for (const t of TUTTI_I_TEMPLATES) {
      const dove = `${t.dominio} ${t.codice}`;
      expect(t.titolo.length, dove).toBeGreaterThan(3);
      expect(t.descrizione.length, dove).toBeGreaterThan(3);
      expect(t.riferimento.trim(), dove).not.toBe("");
      expect(t.categoria.trim(), dove).not.toBe("");
      expect(t.ruolo.trim(), dove).not.toBe("");
      expect(PRIORITA, dove).toContain(t.prioritaDefault);
      if (t.rischioDefault !== null) {
        expect(t.rischioDefault, dove).toBeGreaterThanOrEqual(1);
        expect(t.rischioDefault, dove).toBeLessThanOrEqual(10);
      }
    }
  });

  it("ogni periodicità è normalizzata, e le periodiche hanno mesi sensati", () => {
    for (const t of TUTTI_I_TEMPLATES) {
      const dove = `${t.dominio} ${t.codice}`;
      expect(["periodica", "continua", "evento", "una_tantum"], dove).toContain(t.periodicita.tipo);
      if (t.periodicita.tipo === "periodica") {
        expect(t.periodicita.mesi, dove).toBeGreaterThan(0);
        expect(t.periodicita.mesi, dove).toBeLessThanOrEqual(120);
      }
    }
  });

  it("copre gli articoli cardine dei tre decreti", () => {
    const rif = (d: Dominio) => CATALOGHI[d].map((t) => t.riferimento).join(" · ");
    // GDPR: registro, nomine, informative, consenso, diritti, sicurezza, breach, DPIA, DPO, trasferimenti.
    for (const x of ["30.1", "30.2", "28", "13-14", "7", "12-22", "32", "33-34", "35", "37", "44-49"]) {
      expect(rif("gdpr"), `GDPR art. ${x}`).toContain(`Art. ${x} GDPR`);
    }
    // 81/08: DVR, DUVRI, piano emergenza, sorveglianza sanitaria.
    for (const x of ["28", "26", "43"]) {
      expect(rif("d81"), `81/08 art. ${x}`).toContain(x);
    }
  });

  it("trova un adempimento per dominio e codice", () => {
    expect(templatePerCodice("gdpr", "T01")?.titolo).toBe("Registro trattamenti art. 30.1");
    expect(templatePerCodice("d231", "M01")?.titolo).toContain("OdV");
    expect(templatePerCodice("d81", "S01")?.titolo).toContain("DVR");
    // Lo stesso codice in un dominio diverso non deve risolvere.
    expect(templatePerCodice("d81", "T01")).toBeUndefined();
    expect(templatePerCodice("gdpr", "INESISTENTE")).toBeUndefined();
  });

  it("i ruoli riflettono gli attori reali di ciascun decreto", () => {
    expect(ruoliDi("gdpr")).toEqual(["Titolare", "Responsabile", "DPO"]);
    expect(ruoliDi("d231")).toContain("OdV");
    expect(ruoliDi("d231")).toContain("CdA");
    expect(ruoliDi("d81")).toContain("RSPP");
  });
});

describe("il cliente dimostrativo", () => {
  it.each(DOMINI)("%s si costruisce senza buchi rispetto al catalogo", (dominio) => {
    const adempimenti = costruisciDemo(CATALOGHI[dominio], CLIENTI_DIMOSTRATIVI[dominio], OGGI);
    expect(adempimenti).toHaveLength(ATTESI[dominio].totale);
  });

  it.each(DOMINI)("%s produce un quadro con più di uno stato di scadenza", (dominio) => {
    // Un cliente dimostrativo tutto verde o tutto rosso non dimostra nulla.
    const risolti = risolviTutti(
      costruisciDemo(CATALOGHI[dominio], CLIENTI_DIMOSTRATIVI[dominio], OGGI),
      OGGI,
    );
    const presenti = Object.entries(conteggi(risolti).perScadenza).filter(([, n]) => n > 0);
    expect(presenti.length, `${dominio}: ${JSON.stringify(conteggi(risolti).perScadenza)}`).toBeGreaterThan(
      1,
    );
  });

  it.each(DOMINI)("%s ha una conformità effettiva compresa fra 0 e 100", (dominio) => {
    const risolti = risolviTutti(
      costruisciDemo(CATALOGHI[dominio], CLIENTI_DIMOSTRATIVI[dominio], OGGI),
      OGGI,
    );
    const q = conformitaEffettiva(risolti);
    expect(q.percentuale).not.toBeNull();
    expect(q.percentuale!).toBeGreaterThanOrEqual(0);
    expect(q.percentuale!).toBeLessThanOrEqual(100);
  });

  it("non congela date assolute: cambiando `oggi`, il quadro trasla con esso", () => {
    // È il difetto del prototipo 231, che aveva scadenze fisse al 2025-2026 e sarebbe
    // diventato tutto rosso da solo col passare del tempo.
    const oggiTardi = "2027-08-14";
    const a = risolviTutti(costruisciDemo(CATALOGHI.d231, CLIENTI_DIMOSTRATIVI.d231, OGGI), OGGI);
    const b = risolviTutti(costruisciDemo(CATALOGHI.d231, CLIENTI_DIMOSTRATIVI.d231, oggiTardi), oggiTardi);
    expect(conteggi(b).perScadenza).toEqual(conteggi(a).perScadenza);
  });

  it("le scadenze derivate sono coerenti con la periodicità dichiarata", () => {
    const risolti = risolviTutti(costruisciDemo(CATALOGHI.d81, CLIENTI_DIMOSTRATIVI.d81, OGGI), OGGI);
    for (const a of risolti) {
      if (a.periodicita.tipo !== "periodica" || !a.ultimaEsecuzione) continue;
      expect(a.scadenza, a.codice).not.toBeNull();
      expect(a.scadenza! > a.ultimaEsecuzione, `${a.codice}: scadenza dopo l'esecuzione`).toBe(true);
    }
  });
});
