// L'istanza deve riconoscere da sé dove sta girando. Se questa logica si rompe, su Vercel
// il PDF prova ad avviare un Chromium che non esiste e l'errore arriva all'utente finale.

import { describe, expect, it } from "vitest";
import { predefinitiDellAmbiente } from "./env";

describe("riconoscimento dell'ambiente", () => {
  it("su Vercel sceglie i driver serverless", () => {
    const e = predefinitiDellAmbiente({ VERCEL: "1", VERCEL_URL: "gdprhub.vercel.app" });
    expect(e.STORAGE_DRIVER).toBe("blob");
    expect(e.PDF_DRIVER).toBe("serverless");
    expect(e.APP_URL).toBe("https://gdprhub.vercel.app");
  });

  it("fuori da Vercel non tocca nulla: decide il file .env dell'istanza", () => {
    const e = predefinitiDellAmbiente({ STORAGE_DRIVER: "fs" });
    expect(e.STORAGE_DRIVER).toBe("fs");
    expect(e.PDF_DRIVER).toBeUndefined();
  });

  it("un valore esplicito ha sempre la meglio sul riconoscimento", () => {
    const e = predefinitiDellAmbiente({ VERCEL: "1", PDF_DRIVER: "local", STORAGE_DRIVER: "fs" });
    expect(e.PDF_DRIVER).toBe("local");
    expect(e.STORAGE_DRIVER).toBe("fs");
  });
});
