import { describe, expect, it } from "vitest";
import { COLLEGAMENTI, codiciDelegati, collegamentiRotti, lettoDa, letturePer } from "./links";
import { FAMIGLIE_REATO, coperturaReati, famigliePresidiateDa, presidiRotti } from "../d231/reati";
import { CATALOGHI, CLIENTI_DIMOSTRATIVI } from "../index";
import { costruisciDemo } from "../core/demo";
import { risolviTutti } from "../core/recurrence";
import type { AdempimentoRisolto, Dominio } from "../core/types";

const OGGI = "2026-08-14";
const TUTTI: Dominio[] = ["gdpr", "d231", "d81"];

const risolti = (d: Dominio) =>
  risolviTutti(costruisciDemo(CATALOGHI[d], CLIENTI_DIMOSTRATIVI[d], OGGI), OGGI);
const tutti = [...risolti("gdpr"), ...risolti("d231"), ...risolti("d81")];

describe("integrità del grafo", () => {
  it("ogni estremo di ogni collegamento punta a un adempimento esistente", () => {
    // Un collegamento rotto è peggio di un collegamento assente: fa sparire un obbligo.
    expect(collegamentiRotti(CATALOGHI)).toEqual([]);
  });

  it("ogni presidio dichiarato dai reati presupposto esiste", () => {
    expect(presidiRotti(CATALOGHI)).toEqual([]);
  });

  it("nessun collegamento resta dentro un solo dominio", () => {
    for (const c of COLLEGAMENTI) expect(c.da.dominio, `${c.da.codice}→${c.a.codice}`).not.toBe(c.a.dominio);
  });

  it("ogni collegamento dichiara la norma che lo giustifica", () => {
    // Il modulo lettore deve poter mostrare all'utente PERCHÉ vede quel dato.
    for (const c of COLLEGAMENTI) {
      expect(c.riferimento.length, `${c.da.codice}→${c.a.codice}`).toBeGreaterThan(10);
      expect(c.motivo.length, `${c.da.codice}→${c.a.codice}`).toBeGreaterThan(20);
    }
  });
});

describe("adempimento unico, doppia lettura", () => {
  it("il 231 legge il DVR dall'81/08 invece di duplicarlo", () => {
    const letture = letturePer("d231", "M53", tutti, TUTTI);
    expect(letture).toHaveLength(1);
    expect(letture[0]?.origine.codice).toBe("S01");
    expect(letture[0]?.origine.dominio).toBe("d81");
    expect(letture[0]?.collegamento.riferimento).toContain("art. 30");
  });

  it("la lettura porta con sé lo STATO REALE del proprietario, non una copia", () => {
    // Una scadenza sola, una evidenza sola: se il DVR è scaduto nell'81/08, il 231 lo vede
    // scaduto senza che nessuno lo aggiorni due volte.
    const dvr = tutti.find((a) => a.dominio === "d81" && a.codice === "S01")!;
    const letto = letturePer("d231", "M53", tutti, TUTTI)[0]!;
    expect(letto.origine.statoScadenza).toBe(dvr.statoScadenza);
    expect(letto.origine.scadenza).toBe(dvr.scadenza);
  });

  it("un adempimento può essere alimentato da più proprietari", () => {
    // M55 «Nomina RSPP e Medico Competente» corrisponde a due nomine distinte nell'81/08.
    expect(
      letturePer("d231", "M55", tutti, TUTTI)
        .map((v) => v.origine.codice)
        .sort(),
    ).toEqual(["S22", "S24"]);
  });

  it("se il modulo proprietario non è attivo, il lettore non legge nulla e se ne fa carico", () => {
    // Regola di ripiego: disattivare un modulo non deve aprire un buco silenzioso.
    expect(letturePer("d231", "M53", tutti, ["gdpr", "d231"])).toEqual([]);
    expect(codiciDelegati("d231", ["gdpr", "d231"])).not.toContain("M53");
    expect(codiciDelegati("d231", TUTTI)).toContain("M53");
  });

  it("solo i presidi condivisi si delegano: flussi ed evidenze restano al lettore", () => {
    // M21 (flusso infortuni) e M42 (formazione) restano adempimenti propri del 231: il
    // collegamento li informa, non li sostituisce.
    const delegati = codiciDelegati("d231", TUTTI);
    expect(delegati).toContain("M53");
    expect(delegati).not.toContain("M21");
    expect(delegati).not.toContain("M42");
  });

  it("dal lato del proprietario si sa dove il dato viene letto", () => {
    // Serve a mostrare all'RSPP: «questo DVR alimenta anche il modello 231».
    const usi = lettoDa("d81", "S01");
    expect(usi.map((c) => c.a.codice).sort()).toEqual(["M47", "M53"]);
  });

  it("un adempimento senza collegamenti non produce letture", () => {
    expect(letturePer("gdpr", "T01", tutti, TUTTI)).toEqual([]);
    expect(lettoDa("gdpr", "T01")).toEqual([]);
  });
});

describe("i tre ponti normativi", () => {
  it("81/08 → 231: il DVR regge l'esimente dell'art. 30", () => {
    const c = COLLEGAMENTI.find((x) => x.da.codice === "S01" && x.a.codice === "M53")!;
    expect(c.tipo).toBe("presidio_condiviso");
    expect(c.riferimento).toContain("25-septies");
  });

  it("GDPR → 231: il data breach è un flusso informativo verso l'OdV", () => {
    // È la nota «Coordinamento DPO-OdV 72h» che il prototipo 231 aveva scritto a mano.
    const c = COLLEGAMENTI.find((x) => x.da.codice === "T04" && x.a.codice === "M31")!;
    expect(c.tipo).toBe("flusso_informativo");
    expect(c.riferimento).toContain("Art. 33 GDPR");
  });

  it("GDPR → 231: le misure dell'art. 32 presidiano i reati informatici 24-bis", () => {
    const c = COLLEGAMENTI.find((x) => x.da.codice === "T08" && x.a.codice === "M50")!;
    expect(c.riferimento).toContain("24-bis");
  });
});

describe("reati presupposto", () => {
  it("ogni famiglia dichiara articolo, titolo e presidi", () => {
    for (const f of FAMIGLIE_REATO) {
      expect(f.articolo).toMatch(/^Art\. 2[45]/);
      expect(f.titolo.length).toBeGreaterThan(10);
      expect(f.presidi.length).toBeGreaterThan(0);
    }
  });

  it("l'art. 25-septies è presidiato da adempimenti di due domini", () => {
    // È il punto in cui il catalogo dei reati dimostra di servire: il rischio 231 più
    // pesante si presidia soprattutto nell'81/08.
    const f = FAMIGLIE_REATO.find((x) => x.articolo === "Art. 25-septies")!;
    expect(new Set(f.presidi.map((p) => p.dominio))).toEqual(new Set(["d81", "d231"]));
    expect(f.interdittive).toBe(true);
  });

  it("si sa quali famiglie un adempimento contribuisce a presidiare", () => {
    expect(famigliePresidiateDa("d81", "S01").map((f) => f.articolo)).toEqual(["Art. 25-septies"]);
    expect(famigliePresidiateDa("gdpr", "T08").map((f) => f.articolo)).toEqual(["Art. 24-bis"]);
    expect(famigliePresidiateDa("gdpr", "T01")).toEqual([]);
  });

  it("la copertura si misura sui domini attivi e dice cosa manca", () => {
    const c = coperturaReati(tutti, TUTTI);
    const septies = c.find((x) => x.famiglia.articolo === "Art. 25-septies")!;
    expect(septies.presidiTotali).toBe(6);
    expect(septies.copertura).not.toBeNull();
    // Sul cliente dimostrativo la copertura è parziale: l'elenco degli scoperti serve
    // all'OdV più del numero.
    expect(septies.scoperti.length).toBeGreaterThan(0);
    expect(septies.scoperti.every((s) => s.includes(":"))).toBe(true);
  });

  it("disattivando l'81/08 la copertura del 25-septies si restringe ai soli presidi 231", () => {
    const c = coperturaReati(tutti, ["gdpr", "d231"]);
    const septies = c.find((x) => x.famiglia.articolo === "Art. 25-septies")!;
    expect(septies.presidiTotali).toBe(2); // M47 e M21
  });

  it("una famiglia senza presidi attivi vale null, non zero", () => {
    // Zero direbbe «scoperto»; null dice «non misurabile con i moduli attivi». Sono due
    // affermazioni diverse e in una relazione non vanno confuse.
    const c = coperturaReati(tutti, ["gdpr"]);
    const tributari = c.find((x) => x.famiglia.articolo === "Art. 25-quinquiesdecies")!;
    expect(tributari.copertura).toBeNull();
  });
});
