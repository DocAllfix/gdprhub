// GOLDEN — i numeri del motore sui dati reali dei tre prototipi.
//
// Questi valori non si cambiano per far passare un test. Se cambiano, il prodotto non è più
// coerente con i prototipi da cui nasce, e la modifica va prima giustificata per iscritto in
// `docs/politica-scoring.md`.
//
// Due famiglie di numeri, tenute separate apposta:
//   FEDELTÀ      ciò che deve coincidere col prototipo, perché prova che l'abbiamo capito
//   SCOSTAMENTI  ciò che DEVE differire, perché il prototipo sbagliava. Ognuno con la sua
//                ragione scritta accanto e il conto che la spiega.

import { describe, expect, it } from "vitest";
import { CATALOGHI, CLIENTI_DIMOSTRATIVI, PRESIDI_CHIAVE } from "./index";
import { costruisciDemo } from "./core/demo";
import { risolviTutti } from "./core/recurrence";
import {
  conformitaEffettiva,
  conformitaLavoro,
  conformitaPer,
  conteggi,
  criticiAperti,
} from "./core/compliance";
import { esposizione, prontezza } from "./core/exposure";
import { rischioPesato } from "./core/risk";
import { agenda, quadroAzienda } from "./suite/agenda";
import type { Dominio } from "./core/types";

/** Data fissa: i golden non devono dipendere da quando gira la suite. */
const OGGI = "2026-08-14";

const risolti = (d: Dominio) =>
  risolviTutti(costruisciDemo(CATALOGHI[d], CLIENTI_DIMOSTRATIVI[d], OGGI), OGGI);

describe("GDPR — fedeltà al prototipo", () => {
  const g = risolti("gdpr");

  it("42 controlli, 9 completati: conformità del lavoro al 21%", () => {
    // Il numero che il prototipo mostrava come «compliance totale». Coincide: nel dataset
    // non ci sono non applicabili e la formula sull'asse lavoro è la stessa.
    expect(conformitaLavoro(g)).toMatchObject({ percentuale: 21, numeratore: 9, applicabili: 42 });
  });

  it("conformità per ruolo: Titolare 20%, Responsabile 30%, DPO 17%", () => {
    const per = conformitaPer(g, (a) => a.ruolo, conformitaLavoro);
    expect(per.Titolare?.percentuale).toBe(20);
    expect(per.Responsabile?.percentuale).toBe(30);
    expect(per.DPO?.percentuale).toBe(17);
  });

  it("gli stati di lavoro sono quelli del prototipo, meno il ritardo", () => {
    expect(conteggi(g).perLavoro).toEqual({
      "Da fare": 23, // 14 originali + i 9 che il prototipo marcava «In ritardo»
      "In corso": 10,
      Completata: 9,
      "Non applicabile": 0,
    });
  });
});

describe("GDPR — scostamenti voluti, ciascuno con il suo conto", () => {
  const g = risolti("gdpr");

  it("le scadute sono 4, non i 9 «In ritardo» del prototipo", () => {
    // Tre motivi, tutti documentati:
    //  · T14, R04, D04 erano marcati in ritardo con scadenza FUTURA: dato impossibile;
    //  · T01, T04, R01 sono presidi CONTINUI, che non hanno una scadenza da mancare;
    //  · restano T11, D01, D09, più T12 che il prototipo dava per completato ma il cui
    //    atto una tantum risale a oltre la scadenza.
    expect(g.filter((a) => a.statoScadenza === "Scaduta").map((a) => a.codice)).toEqual([
      "T11",
      "T12",
      "D01",
      "D09",
    ]);
    for (const codice of ["T14", "R04", "D04"]) {
      expect(g.find((a) => a.codice === codice)?.statoScadenza, codice).not.toBe("Scaduta");
    }
  });

  it("il rischio pesato è 325,1 contro i 305,9 del prototipo", () => {
    // 305,9 + 12,0 (T12: completato ma scaduto) + 7,2 (T16: completato ma in scadenza).
    // Il prototipo sommava sui soli non completati, e perdeva proprio ciò che va rifatto.
    expect(rischioPesato(g)).toBe(325.1);
  });

  it("i critici da presidiare sono 13, non 12", () => {
    // I 12 critici aperti del prototipo, più T12: completato, ma con la scadenza mancata.
    expect(criticiAperti(g)).toHaveLength(13);
  });

  it("al posto dei 636.515 € inventati c'è un indice che sa spiegarsi", () => {
    // Il prototipo moltiplicava ritardi e criticità per coefficienti senza fonte. Qui
    // l'euro esiste solo in `stimaSanzioneGdpr`, che pretende il fatturato e stampa le
    // assunzioni; l'indice invece è relativo e restituisce sempre le sue componenti.
    const e = esposizione(g);
    expect(e.indice).toBe(72);
    expect(e.giudizio).toBe("Elevata");
    expect(e.componenti).toEqual({ rischioScoperto: 0.9, ritardo: 0.1, criticita: 1 });
  });

  it("la prontezza è 25 e non un valore schiacciato sul pavimento", () => {
    // La formula del prototipo su questi stessi dati dava −8 e veniva tosata a 20: il
    // numero mostrato non aveva più alcun rapporto con la realtà.
    const p = prontezza(g, PRESIDI_CHIAVE.gdpr);
    expect(p.indice).toBe(25);
    expect(p.presidiScoperti).toEqual(["T01", "T03", "T04", "T05", "T08", "T11", "T12", "R01"]);
  });

  it("la conformità effettiva è 17%, più severa del 21% dell'asse lavoro", () => {
    expect(conformitaEffettiva(g).percentuale).toBe(17);
  });
});

describe("231 — golden", () => {
  const m = risolti("d231");

  it("65 adempimenti e NESSUNO completato", () => {
    // Il prototipo sembrava averne uno completato, ma quella corrispondenza stava fuori
    // dall'array dei dati (stato iniziale della finestra di inserimento). Il catalogo
    // dimostrativo del 231 è un modello sulla carta e non attuato: 0%.
    expect(conformitaLavoro(m)).toMatchObject({ percentuale: 0, numeratore: 0, applicabili: 65 });
  });

  it("i cinque stati del prototipo si normalizzano su quattro", () => {
    // «Scaduto» e «In ritardo» erano due stati distinti e semanticamente sovrapposti:
    // confluiscono in «Da fare», e il ritardo lo dice la data.
    expect(conteggi(m).perLavoro).toEqual({
      "Da fare": 56,
      "In corso": 9,
      Completata: 0,
      "Non applicabile": 0,
    });
  });

  it("le date assolute sono diventate scostamenti: 20 scadute, 19 in scadenza, 26 regolari", () => {
    expect(conteggi(m).perScadenza).toEqual({
      Regolare: 26,
      "In scadenza": 19,
      Scaduta: 20,
      "Da programmare": 0,
    });
  });

  it("l'esposizione riflette un modello non attuato", () => {
    const e = esposizione(m);
    expect(e.indice).toBe(83);
    expect(e.giudizio).toBe("Critica");
    // Nessun presidio in piedi: la quota di rischio scoperto è totale.
    expect(e.componenti.rischioScoperto).toBe(1);
  });

  it("nessuno dei sei presidi chiave dell'OdV è pronto", () => {
    expect(prontezza(m, PRESIDI_CHIAVE.d231).presidiScoperti).toEqual(PRESIDI_CHIAVE.d231);
  });
});

describe("81/08 — golden", () => {
  const s = risolti("d81");

  it("64 adempimenti, 54 con un'esecuzione alle spalle", () => {
    expect(conformitaLavoro(s)).toMatchObject({ percentuale: 84, numeratore: 54, applicabili: 64 });
  });

  it("il quadro delle scadenze copre tutti e quattro gli stati", () => {
    // Il valore del modello a due assi si vede qui: l'84% dell'asse lavoro diventa 44% di
    // conformità effettiva, perché 12 documenti redatti sono scaduti e 10 non sono mai
    // stati avviati.
    expect(conteggi(s).perScadenza).toEqual({
      Regolare: 28,
      "In scadenza": 14,
      Scaduta: 12,
      "Da programmare": 10,
    });
    expect(conformitaEffettiva(s).percentuale).toBe(44);
  });

  it("non ha adempimenti di priorità Critica: il catalogo si ferma ad Alta", () => {
    // Non è un difetto: il prototipo 81/08 usa solo Alta, Media e Bassa. Il rischio, che
    // il catalogo non esprime, viene dedotto dalla priorità.
    expect(criticiAperti(s)).toHaveLength(0);
    expect(rischioPesato(s)).toBe(252.2);
  });

  it("l'esposizione è moderata, coerente con un presidio parziale", () => {
    expect(esposizione(s).indice).toBe(35);
    expect(esposizione(s).giudizio).toBe("Moderata");
  });
});

describe("suite — i tre domini insieme", () => {
  const tutti = [...risolti("gdpr"), ...risolti("d231"), ...risolti("d81")];

  it("171 adempimenti in un solo quadro", () => {
    expect(tutti).toHaveLength(171);
    expect(quadroAzienda(tutti, ["gdpr", "d231", "d81"]).complessivo.conformita.applicabili).toBe(171);
  });

  it("lo scadenzario unificato attraversa i tre decreti in ordine di urgenza", () => {
    const a = agenda(tutti);
    expect(a).toHaveLength(114);
    for (let i = 1; i < a.length; i++) expect(a[i]!.giorni).toBeGreaterThanOrEqual(a[i - 1]!.giorni);
    expect(new Set(a.map((v) => v.dominio)).size).toBe(3);
  });

  it("il complessivo è la quota reale sull'insieme, non la media dei tre", () => {
    // Sui dati dimostrativi i due numeri coincidono per caso (20). Il test verifica la
    // DEFINIZIONE, non la coincidenza: il denominatore è l'insieme unito.
    const q = quadroAzienda(tutti, ["gdpr", "d231", "d81"]);
    expect(q.complessivo.conformita.applicabili).toBe(171);
    expect(q.complessivo.conformita.numeratore).toBe(
      q.perDominio.reduce((t, d) => t + d.conformita.numeratore, 0),
    );
  });

  it("disattivare un modulo restringe il quadro senza rompere nulla", () => {
    const soloGdpr = quadroAzienda(tutti, ["gdpr"]);
    expect(soloGdpr.perDominio).toHaveLength(1);
    expect(soloGdpr.complessivo.conformita.applicabili).toBe(42);
  });
});
