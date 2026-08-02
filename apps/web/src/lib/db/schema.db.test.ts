// Test sul database reale. Si auto-escludono senza `DATABASE_URL` (vedi vitest.config.ts),
// così la suite resta verde su una macchina appena clonata e in CI senza segreti.
//
// Verificano le cose che il codice applicativo NON può garantire da solo: i vincoli e i
// trigger che valgono anche per chi entra con psql.

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { db } from "./index";
import { auditLog, catalogVersion, obligationLink, obligationTemplate } from "./schema";

const id = () => randomUUID();
let versioneId: string;

beforeAll(async () => {
  versioneId = id();
  await db.insert(catalogVersion).values({
    id: versioneId,
    etichetta: `prova-${versioneId.slice(0, 8)}`,
    versioneApp: "test",
  });
});

afterAll(async () => {
  // I registri append-only non si possono ripulire con DELETE: si disattiva il trigger per
  // la durata della transazione di pulizia. È l'unico posto in cui è lecito, ed è un test.
  await db.execute(sql`ALTER TABLE audit_log DISABLE TRIGGER audit_log_append_only`);
  await db.execute(sql`DELETE FROM audit_log WHERE azione LIKE 'prova.%'`);
  await db.execute(sql`ALTER TABLE audit_log ENABLE TRIGGER audit_log_append_only`);
  await db.execute(sql`DELETE FROM catalog_version WHERE versione_app = 'test'`);
});

describe("registri append-only", () => {
  it("una riga di audit si scrive", async () => {
    const [riga] = await db.insert(auditLog).values({ azione: "prova.scrittura" }).returning();
    expect(riga?.id).toBeDefined();
  });

  it("una riga di audit NON si può modificare, nemmeno dal proprietario dello schema", async () => {
    // È il motivo per cui si usa un trigger e non una revoca di privilegi: l'applicazione
    // si collega spesso come owner, e un GRANT non la fermerebbe.
    const [riga] = await db.insert(auditLog).values({ azione: "prova.immutabile" }).returning();
    await expect(
      db.execute(sql`UPDATE audit_log SET azione = 'manomessa' WHERE id = ${riga!.id}`),
    ).rejects.toThrow(/append-only/);
  });

  it("una riga di audit NON si può cancellare", async () => {
    const [riga] = await db.insert(auditLog).values({ azione: "prova.indelebile" }).returning();
    await expect(db.execute(sql`DELETE FROM audit_log WHERE id = ${riga!.id}`)).rejects.toThrow(
      /append-only/,
    );
  });

  it("dopo un tentativo fallito la riga è ancora lì, intatta", async () => {
    const [riga] = await db.insert(auditLog).values({ azione: "prova.intatta" }).returning();
    await db.execute(sql`UPDATE audit_log SET azione = 'x' WHERE id = ${riga!.id}`).catch(() => {});
    const dopo = await db.execute(sql`SELECT azione FROM audit_log WHERE id = ${riga!.id}`);
    expect((dopo as unknown as { azione: string }[])[0]?.azione).toBe("prova.intatta");
  });
});

describe("coerenza della periodicità", () => {
  const base = {
    catalogVersionId: "",
    dominio: "gdpr" as const,
    titolo: "Prova",
    descrizione: "Prova di vincolo",
    riferimento: "Art. 1 GDPR",
    categoria: "Titolare",
    ruolo: "Titolare",
    prioritaDefault: "Media" as const,
  };

  it("un adempimento periodico senza mesi viene respinto", async () => {
    // Senza cadenza la scadenza non si deriva più, e l'obbligo sparisce silenziosamente
    // dallo scadenzario: è il difetto peggiore possibile per questo prodotto.
    await expect(
      db.insert(obligationTemplate).values({
        ...base,
        id: id(),
        catalogVersionId: versioneId,
        codice: "X01",
        periodicitaTipo: "periodica",
        periodicitaMesi: null,
      }),
    ).rejects.toThrow(/periodicita_coerente/);
  });

  it("un presidio continuo con dei mesi viene respinto", async () => {
    await expect(
      db.insert(obligationTemplate).values({
        ...base,
        id: id(),
        catalogVersionId: versioneId,
        codice: "X02",
        periodicitaTipo: "continua",
        periodicitaMesi: 12,
      }),
    ).rejects.toThrow(/periodicita_coerente/);
  });

  it("le combinazioni valide passano", async () => {
    await db.insert(obligationTemplate).values([
      {
        ...base,
        id: id(),
        catalogVersionId: versioneId,
        codice: "X03",
        periodicitaTipo: "periodica",
        periodicitaMesi: 36,
      },
      { ...base, id: id(), catalogVersionId: versioneId, codice: "X04", periodicitaTipo: "continua" },
      { ...base, id: id(), catalogVersionId: versioneId, codice: "X05", periodicitaTipo: "evento" },
    ]);
    const quanti = await db.execute(
      sql`SELECT count(*)::int AS n FROM obligation_template WHERE catalog_version_id = ${versioneId}`,
    );
    expect((quanti as unknown as { n: number }[])[0]?.n).toBe(3);
  });
});

describe("i collegamenti devono attraversare due domini", () => {
  it("un arco interno a un solo dominio viene respinto dal database", async () => {
    // Non è un ponte, è una duplicazione mascherata.
    const a = id();
    const b = id();
    const comune = {
      catalogVersionId: versioneId,
      dominio: "d231" as const,
      titolo: "Prova",
      descrizione: "Prova di collegamento",
      riferimento: "D.Lgs 231/01",
      categoria: "X",
      ruolo: "OdV",
      periodicitaTipo: "continua" as const,
      prioritaDefault: "Media" as const,
    };
    await db.insert(obligationTemplate).values([
      { ...comune, id: a, codice: "Y01" },
      { ...comune, id: b, codice: "Y02" },
    ]);

    await expect(
      db.insert(obligationLink).values({
        id: id(),
        catalogVersionId: versioneId,
        daTemplateId: a,
        aTemplateId: b,
        tipo: "presidio_condiviso",
        riferimento: "prova",
        motivo: "prova",
      }),
    ).rejects.toThrow(/Collegamento interno al dominio/);
  });
});
