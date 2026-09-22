import { describe, expect, it } from "vitest";
import { normalizzaPercorso, spogliaErrore, spogliaTesto } from "@/lib/telemetria";

// COSA NON DEVE USCIRE DALL'ISTANZA.
//
// Queste prove valgono per un confine: ciò che passa di qui arriva a una macchina che
// raccoglie da titolari diversi. Un campo dimenticato è un trasferimento di dati personali
// non censito, non un difetto di forma.

describe("il percorso perde gli identificativi", () => {
  it("sostituisce un UUID", () => {
    expect(normalizzaPercorso("/azienda/7f3a1b2c-4d5e-6f70-8a9b-0c1d2e3f4a5b/registro/violazione")).toBe(
      "/azienda/:id/registro/violazione",
    );
  });

  it("sostituisce gli identificativi numerici", () => {
    expect(normalizzaPercorso("/api/relazioni/42")).toBe("/api/relazioni/:n");
  });

  it("lascia intatto un percorso senza identificativi", () => {
    expect(normalizzaPercorso("/cruscotto")).toBe("/cruscotto");
    expect(normalizzaPercorso("/azienda/:id/reati")).toBe("/azienda/:id/reati");
  });
});

describe("il testo perde ciò che identifica una persona", () => {
  it("toglie gli indirizzi di posta", () => {
    expect(spogliaTesto("violato il vincolo su mario.rossi@studio.it")).toBe("violato il vincolo su [posta]");
  });

  it("toglie il codice fiscale", () => {
    expect(spogliaTesto("duplicato: RSSMRA85T10A562S")).toBe("duplicato: [cf]");
  });

  it("toglie la partita IVA", () => {
    expect(spogliaTesto("azienda 12345678901 già presente")).toBe("azienda [piva] già presente");
  });

  it("tronca i messaggi lunghi", () => {
    expect(spogliaTesto("x".repeat(900))).toHaveLength(500);
  });
});

describe("l'errore si riduce ai campi che possono uscire", () => {
  it("tiene nome, messaggio e traccia, e scarta il resto", () => {
    const errore = new Error("fallito per mario@studio.it");
    // È il caso che conta: chi appende dati a un errore «per comodità» li farebbe uscire.
    (errore as unknown as Record<string, unknown>).corpoRichiesta = { nome: "Mario Rossi" };

    const spoglio = spogliaErrore(errore);

    expect(spoglio.tipo).toBe("Error");
    expect(spoglio.messaggio).toBe("fallito per [posta]");
    expect(Object.keys(spoglio).sort()).toEqual(["messaggio", "tipo", "traccia"]);
    expect(JSON.stringify(spoglio)).not.toContain("Mario Rossi");
  });

  it("regge un valore che non è un errore", () => {
    expect(spogliaErrore("guasto su tizio@x.it")).toEqual({
      tipo: "NonErrore",
      messaggio: "guasto su [posta]",
    });
  });

  it("la traccia si ferma alle prime righe", () => {
    const spoglio = spogliaErrore(new Error("x"));
    expect((spoglio.traccia ?? "").split("\n").length).toBeLessThanOrEqual(12);
  });
});
