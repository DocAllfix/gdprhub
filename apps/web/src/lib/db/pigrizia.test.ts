// La connessione si apre al primo uso, e il rifiuto non si è perso per strada.
//
// Prima la connessione si creava all'importazione del modulo, e la conseguenza era che
// COMPILARE richiedeva un database: la CI, che non ne ha, è morta con «Failed to collect
// page data», e la stessa cosa sarebbe successa alla `docker build` di un'istanza cliente.
//
// Rendere pigra la creazione risolve quello, ma introduce un rischio nuovo: che il
// controllo sulla `DATABASE_URL` sparisca senza che nessuno se ne accorga, perché ora non
// scatta più all'importazione. Queste due prove tengono ferme entrambe le proprietà.

import { beforeEach, describe, expect, it, vi } from "vitest";

describe("il client del database è pigro", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("si importa senza DATABASE_URL: è ciò che permette a `next build` di girare", async () => {
    vi.doMock("@/lib/env", () => ({ env: { DATABASE_URL: "" }, isVetrinaServerless: false }));
    // Se l'importazione aprisse la connessione, questa riga lancerebbe.
    const modulo = await import("./index");
    expect(modulo.db).toBeDefined();
    // IL TEMPO NON E' L'ASSERZIONE, ed e' per questo che il limite e' largo.
    //
    // Questa prova dice una cosa sola: che importare il modulo NON apre la connessione. Il
    // limite predefinito di cinque secondi non misura quello — misura quanto ci mette Node a
    // caricare a freddo drizzle, il driver Neon, `postgres` e `ws`. Su questa macchina sono
    // due secondi a vuoto e oltre cinque mentre compila qualcos'altro, quindi la prova
    // falliva a caso senza che niente fosse rotto.
    //
    // Un test che diventa rosso per il carico della macchina insegna a non guardare il
    // rosso, ed e' esattamente il difetto che questo progetto si e' gia' annotato una volta:
    // «la CI era rossa da almeno tre spinte e io riferivo verde».
  }, 30_000);

  it("ma la prima query senza DATABASE_URL fallisce, con il messaggio che spiega dove metterla", async () => {
    vi.doMock("@/lib/env", () => ({ env: { DATABASE_URL: "" }, isVetrinaServerless: false }));
    const { db } = await import("./index");
    // Toccare una qualunque proprietà forza la creazione: è il momento in cui il rifiuto
    // deve arrivare, ed è l'unica cosa che rende sicuro l'aver spostato il controllo.
    expect(() => db.query).toThrow(/DATABASE_URL mancante/);
  }, 30_000);
});
