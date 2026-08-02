// Verifica che l'impalcatura del monorepo regga davvero.
//
// Sembra banale ma non lo è: il motore è pubblicato come sorgente TypeScript e risolto
// via `transpilePackages`. Se la risoluzione del workspace si rompe, tutto il resto del
// prodotto smette di compilare, e conviene scoprirlo da un test di due righe invece che
// da un deploy fallito.

import { describe, expect, it } from "vitest";
import { CONTROL_TEMPLATES, RUOLI, STATI, templatesPerRuolo } from "@gdpr/engine";

describe("impalcatura del monorepo", () => {
  it("l'applicazione raggiunge il motore e il suo catalogo", () => {
    expect(CONTROL_TEMPLATES).toHaveLength(42);
    expect(templatesPerRuolo("Titolare")).toHaveLength(20);
  });

  it("condivide il vocabolario di dominio, non copie divergenti", () => {
    expect(RUOLI).toEqual(["Titolare", "Responsabile", "DPO"]);
    // "In ritardo" non compare fra gli stati: è un derivato della scadenza.
    expect(STATI).not.toContain("In ritardo");
  });
});
