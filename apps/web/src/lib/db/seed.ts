import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import {
  CATALOGHI,
  COLLEGAMENTI,
  DOMINI,
  FAMIGLIE_REATO,
  TUTTI_I_TEMPLATES,
  type Dominio,
} from "@gdpr/engine";
import { db } from "./index";
import {
  catalogVersion,
  obligationLink,
  obligationTemplate,
  reatoPresidio,
  reatoPresupposto,
} from "./schema";

// Semina il catalogo di piattaforma: i 171 adempimenti, i 16 collegamenti fra domini e le
// 8 famiglie di reati presupposto.
//
// Il contenuto arriva SEMPRE da `@gdpr/engine`, che a sua volta lo estrae dai prototipi con
// `scripts/extract-seed.mjs`. Non esiste un secondo elenco: se il catalogo cambia, cambia in
// un posto solo e `pnpm seed:check` in CI se ne accorge.
//
// Idempotente per versione: una versione già seminata non si ri-semina, si crea la
// successiva. Gli assessment restano agganciati alla versione con cui sono stati fatti.
//
// Uso:  pnpm --filter web db:seed

/** Cambiare questa etichetta a ogni modifica del contenuto del catalogo. */
const ETICHETTA = "Suite Compliance 2026.1";
const VERSIONE_APP = "0.1.0";

async function main() {
  const esistente = await db.query.catalogVersion.findFirst({
    where: eq(catalogVersion.etichetta, ETICHETTA),
  });

  if (esistente) {
    console.log(`Versione «${ETICHETTA}» già presente: nulla da fare.`);
    console.log("Per seminare un catalogo aggiornato, cambia ETICHETTA in src/lib/db/seed.ts.");
    return;
  }

  await db.transaction(async (tx) => {
    const versioneId = randomUUID();
    await tx.insert(catalogVersion).values({
      id: versioneId,
      etichetta: ETICHETTA,
      versioneApp: VERSIONE_APP,
      attiva: "si",
    });
    // Una sola versione attiva alla volta.
    await tx.update(catalogVersion).set({ attiva: "no" }).where(eq(catalogVersion.attiva, "si"));
    await tx.update(catalogVersion).set({ attiva: "si" }).where(eq(catalogVersion.id, versioneId));

    // --- I 171 adempimenti ---------------------------------------------------------------
    const idPerCodice = new Map<string, string>();
    await tx.insert(obligationTemplate).values(
      TUTTI_I_TEMPLATES.map((t) => {
        const id = randomUUID();
        idPerCodice.set(`${t.dominio}:${t.codice}`, id);
        return {
          id,
          catalogVersionId: versioneId,
          dominio: t.dominio,
          codice: t.codice,
          titolo: t.titolo,
          descrizione: t.descrizione,
          nota: t.nota,
          riferimento: t.riferimento,
          categoria: t.categoria,
          ruolo: t.ruolo,
          periodicitaTipo: t.periodicita.tipo,
          periodicitaMesi: t.periodicita.tipo === "periodica" ? t.periodicita.mesi : null,
          prioritaDefault: t.prioritaDefault,
          rischioDefault: t.rischioDefault,
        };
      }),
    );

    const risolvi = (dominio: Dominio, codice: string): string => {
      const id = idPerCodice.get(`${dominio}:${codice}`);
      // Il motore ha già un test di integrità, ma qui si fallisce comunque forte: un
      // riferimento rotto farebbe sparire un obbligo senza che nessuno se ne accorga.
      if (!id) throw new Error(`Riferimento a un adempimento inesistente: ${dominio}:${codice}`);
      return id;
    };

    // --- I collegamenti fra domini --------------------------------------------------------
    await tx.insert(obligationLink).values(
      COLLEGAMENTI.map((c) => ({
        id: randomUUID(),
        catalogVersionId: versioneId,
        daTemplateId: risolvi(c.da.dominio, c.da.codice),
        aTemplateId: risolvi(c.a.dominio, c.a.codice),
        tipo: c.tipo,
        riferimento: c.riferimento,
        motivo: c.motivo,
      })),
    );

    // --- Le famiglie di reati presupposto e i loro presidi --------------------------------
    for (const f of FAMIGLIE_REATO) {
      const reatoId = randomUUID();
      await tx.insert(reatoPresupposto).values({
        id: reatoId,
        catalogVersionId: versioneId,
        articolo: f.articolo,
        titolo: f.titolo,
        interdittive: f.interdittive ? "si" : "no",
        nota: f.nota ?? null,
      });
      await tx.insert(reatoPresidio).values(
        f.presidi.map((p) => ({
          id: randomUUID(),
          reatoId,
          templateId: risolvi(p.dominio, p.codice),
        })),
      );
    }

    console.log(`Catalogo «${ETICHETTA}» seminato.`);
    for (const d of DOMINI) console.log(`  ${d.padEnd(6)} ${CATALOGHI[d].length} adempimenti`);
    console.log(
      `  totale ${TUTTI_I_TEMPLATES.length} · ${COLLEGAMENTI.length} collegamenti · ${FAMIGLIE_REATO.length} famiglie di reato`,
    );
  });
}

await main();
process.exit(0);
