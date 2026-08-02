// Cancello della Fase 0: il catalogo estratto dal prototipo è completo e coerente.
// Se questo test fallisce, o il prototipo è cambiato o l'estrattore è rotto: in entrambi
// i casi non si semina nulla finché non è chiaro perché.

import { describe, expect, it } from "vitest";
import {
  CONTROL_TEMPLATES,
  DEMO_ASSESSMENT,
  normalizzaStatoPrototipo,
  templatePerCodice,
  templatesPerRuolo,
} from "./index";
import { FREQUENZE, PRIORITA, RUOLI } from "../types";

describe("catalogo dei controlli", () => {
  it("contiene esattamente 42 controlli", () => {
    expect(CONTROL_TEMPLATES).toHaveLength(42);
  });

  it("li ripartisce 20 Titolare, 10 Responsabile, 12 DPO", () => {
    expect(templatesPerRuolo("Titolare")).toHaveLength(20);
    expect(templatesPerRuolo("Responsabile")).toHaveLength(10);
    expect(templatesPerRuolo("DPO")).toHaveLength(12);
  });

  it("non ha codici duplicati", () => {
    const codici = CONTROL_TEMPLATES.map((t) => t.codice);
    expect(new Set(codici).size).toBe(codici.length);
  });

  it("usa i prefissi di codice attesi per ruolo", () => {
    const prefisso = { Titolare: "T", Responsabile: "R", DPO: "D" } as const;
    for (const t of CONTROL_TEMPLATES) {
      expect(t.codice, `${t.codice} (${t.ruolo})`).toMatch(new RegExp(`^${prefisso[t.ruolo]}\\d{2}$`));
    }
  });

  it("ha ogni campo valorizzato e dentro i domini ammessi", () => {
    for (const t of CONTROL_TEMPLATES) {
      expect(t.titolo.length, t.codice).toBeGreaterThan(3);
      expect(t.descrizione.length, t.codice).toBeGreaterThan(20);
      expect(t.articolo, t.codice).toMatch(/^Art\. [\d.\-a-z]+ GDPR$/);
      expect(RUOLI, t.codice).toContain(t.ruolo);
      expect(FREQUENZE, t.codice).toContain(t.frequenza);
      expect(PRIORITA, t.codice).toContain(t.prioritaDefault);
      expect(t.rischioDefault, t.codice).toBeGreaterThanOrEqual(1);
      expect(t.rischioDefault, t.codice).toBeLessThanOrEqual(10);
    }
  });

  it("copre gli articoli cardine del GDPR", () => {
    const articoli = CONTROL_TEMPLATES.map((t) => t.articolo).join(" ");
    // Registro, nomine, informative, consenso, diritti, sicurezza, breach, DPIA, DPO, trasferimenti.
    for (const rif of ["30.1", "30.2", "28", "13-14", "7", "12-22", "32", "33-34", "35", "37", "44-49"]) {
      expect(articoli, `articolo ${rif} non presidiato`).toContain(`Art. ${rif} GDPR`);
    }
  });

  it("trova un template per codice", () => {
    expect(templatePerCodice("T01")?.titolo).toBe("Registro trattamenti art. 30.1");
    expect(templatePerCodice("INESISTENTE")).toBeUndefined();
  });
});

describe("stato dimostrativo del prototipo", () => {
  it("copre tutti e soli i controlli del catalogo", () => {
    const codiciCatalogo = new Set(CONTROL_TEMPLATES.map((t) => t.codice));
    const codiciDemo = new Set(DEMO_ASSESSMENT.controlli.map((c) => c.codice));
    expect(codiciDemo).toEqual(codiciCatalogo);
  });

  it("conserva la ripartizione degli stati del prototipo", () => {
    const conteggio: Record<string, number> = {};
    for (const c of DEMO_ASSESSMENT.controlli) conteggio[c.stato] = (conteggio[c.stato] ?? 0) + 1;
    expect(conteggio).toEqual({ "Da fare": 14, "In corso": 10, Completata: 9, "In ritardo": 9 });
  });

  it("normalizza gli stati del prototipo su quelli del modello", () => {
    expect(normalizzaStatoPrototipo("Completata")).toBe("Completata");
    expect(normalizzaStatoPrototipo("In corso")).toBe("In corso");
    expect(normalizzaStatoPrototipo("Da fare")).toBe("Da fare");
    // "In ritardo" non è uno stato: diventa lavoro non concluso, il ritardo lo dice la data.
    expect(normalizzaStatoPrototipo("In ritardo")).toBe("Da fare");
    expect(() => normalizzaStatoPrototipo("Sospesa")).toThrow(/non riconosciuto/);
  });

  it("documenta i tre record incoerenti del prototipo (difetto F5)", () => {
    // T14, R04 e D04 risultavano "In ritardo" con scadenza FUTURA. È la ragione per cui
    // il ritardo diventa un derivato della data e non uno stato persistito.
    const incoerenti = DEMO_ASSESSMENT.controlli
      .filter((c) => c.stato === "In ritardo" && c.scadenzaOffsetGiorni >= 0)
      .map((c) => c.codice);
    expect(incoerenti).toEqual(["T14", "R04", "D04"]);
  });
});
