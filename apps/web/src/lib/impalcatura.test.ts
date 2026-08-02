// Verifica che l'impalcatura del monorepo regga davvero.
//
// Sembra banale ma non lo è: il motore è pubblicato come sorgente TypeScript e risolto
// via `transpilePackages`. Se la risoluzione del workspace si rompe, tutto il resto del
// prodotto smette di compilare, e conviene scoprirlo da un test di due righe invece che
// da un deploy fallito.

import { describe, expect, it } from "vitest";
import {
  CATALOGHI,
  DOMINI,
  STATI_LAVORO,
  STATI_SCADENZA,
  TUTTI_I_TEMPLATES,
  templatesPerCategoria,
} from "@gdpr/engine";

describe("impalcatura del monorepo", () => {
  it("l'applicazione raggiunge il motore e i tre cataloghi", () => {
    expect(TUTTI_I_TEMPLATES).toHaveLength(171);
    expect(CATALOGHI.gdpr).toHaveLength(42);
    expect(CATALOGHI.d231).toHaveLength(65);
    expect(CATALOGHI.d81).toHaveLength(64);
    expect(templatesPerCategoria("gdpr", "Titolare")).toHaveLength(20);
  });

  it("condivide il vocabolario di dominio, non copie divergenti", () => {
    expect(DOMINI).toEqual(["gdpr", "d231", "d81"]);
    // I due assi restano separati: il ritardo non è uno stato di lavoro.
    expect(STATI_LAVORO).not.toContain("In ritardo");
    expect(STATI_LAVORO).not.toContain("Scaduto");
    expect(STATI_SCADENZA).toContain("Scaduta");
  });
});
