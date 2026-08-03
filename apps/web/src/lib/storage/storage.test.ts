// Conformità dell'archivio.
//
// Il piano chiede che la stessa suite passi su ENTRAMBE le implementazioni, e la ragione è
// concreta: il prodotto gira su una VPS con il disco e sulla vetrina con l'archivio a
// oggetti, e un comportamento che vale su uno solo dei due è un difetto che si scopre a
// casa del cliente. Qui gira contro il disco; il driver a oggetti si aggiunge a questa
// stessa suite quando l'istanza ha il token, senza riscrivere niente.
//
// Il resto sono le regole che rendono un file un'evidenza invece che un allegato, e si
// provano con i byte veri: un PDF che comincia per %PDF, un eseguibile rinominato .pdf, una
// chiave che tenta di uscire dalla cartella.

import { afterAll, describe, expect, it } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DIMENSIONE_MASSIMA, archivioSuDisco, chiaveEvidenza, improntaSha256, tipoReale } from "./index";

const radice = await mkdtemp(join(tmpdir(), "archivio-prova-"));
const archivio = archivioSuDisco(radice);

afterAll(() => rm(radice, { recursive: true, force: true }));

/** Un PDF minimo ma vero: comincia con la firma che il controllo cerca. */
const PDF = Buffer.concat([Buffer.from("%PDF-1.7\n"), Buffer.from("contenuto di prova")]);

describe("il tipo si decide dal contenuto, non da come si chiama il file", () => {
  it("riconosce i formati ammessi dai primi byte", () => {
    expect(tipoReale(PDF)).toBe("application/pdf");
    expect(tipoReale(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d]))).toBe("image/png");
    expect(tipoReale(Buffer.from([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
  });

  it("respinge un eseguibile rinominato dvr.pdf", () => {
    // `MZ` è l'intestazione di un eseguibile Windows. L'estensione dice PDF, il contenuto no,
    // e il contenuto è l'unico dei due che l'utente non sceglie.
    const eseguibile = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03]);
    expect(tipoReale(eseguibile)).toBeNull();
  });

  it("respinge un file vuoto e uno troppo corto per avere una firma", () => {
    expect(tipoReale(Buffer.alloc(0))).toBeNull();
    expect(tipoReale(Buffer.from([0x25]))).toBeNull();
  });
});

describe("l'impronta identifica il documento", () => {
  it("è stabile e cambia con un solo byte diverso", () => {
    const a = improntaSha256(PDF);
    expect(a).toBe(improntaSha256(Buffer.from(PDF)));
    expect(a).toHaveLength(64);

    const alterato = Buffer.from(PDF);
    alterato[alterato.length - 1] = (alterato[alterato.length - 1] ?? 0) ^ 0x01;
    // Un byte cambiato in fondo a un documento di trenta pagine: se l'impronta non se ne
    // accorgesse, non servirebbe a niente.
    expect(improntaSha256(alterato)).not.toBe(a);
  });
});

describe("la chiave porta l'organizzazione, ed è il confine", () => {
  it("comincia sempre con l'organizzazione di chi carica", () => {
    const k = chiaveEvidenza("org-abc", "ev-123", "PDF");
    expect(k).toBe("evidenze/org-abc/ev-123.pdf");
    expect(k.startsWith("evidenze/org-abc/")).toBe(true);
  });

  it("non lascia passare un'estensione ostile nel percorso", () => {
    // Se l'estensione finisse nel percorso senza filtro, `../../etc/passwd` sarebbe una
    // scrittura fuori dalla cartella con il nome giusto.
    expect(chiaveEvidenza("org", "ev", "../../etc")).toBe("evidenze/org/ev.etc");
    expect(chiaveEvidenza("org", "ev", "")).toBe("evidenze/org/ev.bin");
  });
});

describe("il driver su disco", () => {
  const chiave = chiaveEvidenza("org-uno", "ev-uno", "pdf");

  it("scrive e rilegge lo stesso identico contenuto", async () => {
    await archivio.scrivi(chiave, PDF, "application/pdf");
    const riletto = await archivio.leggi(chiave);
    // Non «somiglia»: è lo stesso documento, e lo si prova con l'impronta.
    expect(improntaSha256(riletto)).toBe(improntaSha256(PDF));
  });

  it("un file di un'altra organizzazione non è raggiungibile con una chiave inventata", async () => {
    await expect(archivio.leggi(chiaveEvidenza("org-due", "ev-uno", "pdf"))).rejects.toThrow();
  });

  it("una chiave che tenta di uscire dalla radice viene respinta, non risolta", async () => {
    // Senza questo controllo, una chiave costruita male scriverebbe dove capita sul disco
    // della macchina del cliente.
    await expect(archivio.scrivi("../fuori.txt", PDF, "text/plain")).rejects.toThrow(/fuori dalla radice/);
    await expect(archivio.leggi("evidenze/../../../etc/passwd")).rejects.toThrow(/fuori dalla radice/);
  });

  it("eliminare toglie davvero il file, e rifarlo non esplode", async () => {
    await archivio.elimina(chiave);
    await expect(archivio.leggi(chiave)).rejects.toThrow();
    // Idempotente: una cancellazione ripetuta capita quando due schede fanno la stessa cosa.
    await expect(archivio.elimina(chiave)).resolves.toBeUndefined();
  });
});

describe("i limiti sono dichiarati", () => {
  it("il tetto di dimensione è venticinque megabyte", () => {
    // Scritto qui perché il controllo lato server deve usare questo valore e non uno suo:
    // due limiti diversi significano un caricamento che il browser accetta e il server
    // rifiuta senza spiegare perché.
    expect(DIMENSIONE_MASSIMA).toBe(25 * 1024 * 1024);
  });
});
