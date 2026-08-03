// Il cancello di F12: una relazione pubblicata non si tocca, e il divieto è del database.
//
// È la proprietà che rende il documento un atto invece di una vista. Provarla leggendo il
// codice non serve a niente — il codice applicativo è proprio ciò da cui non ci si fida —
// quindi qui si scrive DIRETTAMENTE sul database, aggirando ogni azione e ogni guard, e si
// pretende che il database rifiuti.
//
// Se un giorno qualcuno togliesse il trigger «per comodità», questo test diventerebbe rosso
// prima che una relazione falsificabile arrivi in mano a un cliente.

import { afterAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { clientCompany, report } from "@/lib/db/schema";

/**
 * Il messaggio del DATABASE, non quello di Drizzle.
 *
 * Drizzle incarta l'errore in «Failed query: …» e mette l'eccezione di Postgres nella
 * causa. Verificare la stringa esterna significherebbe verificare che una query è fallita —
 * cosa che succede anche per un errore di sintassi — invece di verificare CHE COSA ha
 * detto il trigger. La prima versione di questo test faceva proprio così ed è stata rossa
 * per il motivo sbagliato.
 */
async function messaggioDelDatabase(azione: Promise<unknown>): Promise<string> {
  try {
    await azione;
    return "";
  } catch (errore) {
    const causa = (errore as { cause?: { message?: string } })?.cause;
    return causa?.message ?? (errore as Error).message ?? "";
  }
}

const azienda = await db.query.clientCompany.findFirst({
  where: eq(clientCompany.stato, "active"),
  columns: { id: true, organizationId: true },
});

const idBozza = randomUUID();
const idPubblicata = randomUUID();

/** Numeri alti e improbabili: non devono collidere con quelli veri dell'istanza. */
const NUMERO_BOZZA = 900_001;
const NUMERO_PUBBLICATA = 900_002;

afterAll(async () => {
  // La bozza si può cancellare. La pubblicata NO — ed è il punto del test — quindi la si
  // toglie disattivando il trigger per un istante, che è l'unico modo onesto: fingere che
  // il divieto non esista servirebbe solo a nascondere che c'è.
  await db.delete(report).where(eq(report.id, idBozza));
  await db.execute(sql`ALTER TABLE report DISABLE TRIGGER report_immutabile`);
  await db.delete(report).where(eq(report.id, idPubblicata));
  await db.execute(sql`ALTER TABLE report ENABLE TRIGGER report_immutabile`);
});

describe("la relazione pubblicata è congelata dal database", () => {
  it("serve un'azienda su cui provare", () => {
    expect(azienda, "nessuna azienda attiva: esegui `pnpm db:seed-demo`").toBeDefined();
  });

  it("una bozza si modifica quante volte si vuole: è lì che si controlla prima di firmare", async () => {
    if (!azienda) return;
    await db.insert(report).values({
      id: idBozza,
      organizationId: azienda.organizationId,
      clientCompanyId: azienda.id,
      ambito: "suite",
      stato: "bozza",
      numero: NUMERO_BOZZA,
      dataRiferimento: "2026-08-03",
      snapshot: { prova: 1 },
      hashSnapshot: "a".repeat(64),
    });

    await expect(
      db.update(report).set({ snapshot: { prova: 2 } }).where(eq(report.id, idBozza)),
    ).resolves.toBeDefined();

    const dopo = await db.query.report.findFirst({ where: eq(report.id, idBozza) });
    expect(dopo?.snapshot).toEqual({ prova: 2 });
  });

  it("pubblicata, il contenuto non si cambia più nemmeno scrivendo sul database", async () => {
    if (!azienda) return;
    await db.insert(report).values({
      id: idPubblicata,
      organizationId: azienda.organizationId,
      clientCompanyId: azienda.id,
      ambito: "suite",
      stato: "pubblicata",
      numero: NUMERO_PUBBLICATA,
      dataRiferimento: "2026-08-03",
      snapshot: { conformita: 44 },
      hashSnapshot: "b".repeat(64),
      pubblicataIl: new Date(),
    });

    // Il caso che conta: cambiare il numero dentro un documento già consegnato.
    expect(
      await messaggioDelDatabase(
        db.update(report).set({ snapshot: { conformita: 99 } }).where(eq(report.id, idPubblicata)),
      ),
    ).toMatch(/congelato/i);

    // E anche il modo elegante di riscrivere il passato: toccare un campo qualsiasi
    // lasciando lo stato dov'è.
    expect(
      await messaggioDelDatabase(
        db.update(report).set({ dataRiferimento: "2020-01-01" }).where(eq(report.id, idPubblicata)),
      ),
    ).toMatch(/congelato/i);

    const dopo = await db.query.report.findFirst({ where: eq(report.id, idPubblicata) });
    expect(dopo?.snapshot).toEqual({ conformita: 44 });
    expect(dopo?.dataRiferimento).toBe("2026-08-03");
  });

  it("una relazione pubblicata non si elimina: un atto consegnato non si ritira", async () => {
    if (!azienda) return;
    expect(await messaggioDelDatabase(db.delete(report).where(eq(report.id, idPubblicata)))).toMatch(
      /non si elimina/i,
    );
  });

  it("non si può pubblicare cambiando lo snapshot nello stesso momento", async () => {
    if (!azienda) return;
    // Sarebbe la scorciatoia perfetta: si rilegge una bozza, la si approva, e nell'istante
    // della firma le si cambia il contenuto sotto. La firma sarebbe su un altro documento.
    expect(
      await messaggioDelDatabase(
        db
          .update(report)
          .set({ stato: "pubblicata", hashSnapshot: "c".repeat(64), pubblicataIl: new Date() })
          .where(eq(report.id, idBozza)),
      ),
    ).toMatch(/documento diverso/i);
  });

  it("il progressivo è unico per azienda: due relazioni non possono chiamarsi allo stesso modo", async () => {
    if (!azienda) return;
    // «Relazione n. 3 del 2026» deve identificarne una sola, altrimenti citarla non serve.
    await expect(
      db.insert(report).values({
        id: randomUUID(),
        organizationId: azienda.organizationId,
        clientCompanyId: azienda.id,
        ambito: "gdpr",
        stato: "bozza",
        numero: NUMERO_BOZZA,
        dataRiferimento: "2026-08-03",
        snapshot: {},
        hashSnapshot: "d".repeat(64),
      }),
    ).rejects.toThrow();
  });
});
