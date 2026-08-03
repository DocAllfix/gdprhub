// Popola i registri delle aziende dimostrative che ne sono prive.
//
// L'azienda dimostrativa è nata prima che i registri esistessero, e la semina principale è
// idempotente: se l'azienda c'è, non la tocca più. Senza questo comando l'unico modo di
// popolarne i registri sarebbe cancellarla e rifarla, perdendo tutto ciò che qualcuno ci ha
// nel frattempo lavorato sopra.
//
// SALTA CHI HA GIÀ DELLE VOCI. Un registro non è una tabella di configurazione da
// sovrascrivere: è un registro. Aggiungere quindici voci finte accanto a quelle vere di un
// consulente sarebbe il modo più rapido di rendere inutilizzabile la sua giornata.
//
// Uso:  pnpm --filter web db:seed-registri

import { eq } from "drizzle-orm";
import type { Dominio } from "@gdpr/engine";
import { db } from "./index";
import { clientCompany, companyModule, registro } from "./schema";
import { seminaVociRegistro } from "./seed-demo";

async function principale() {
  const aziende = await db.query.clientCompany.findMany({
    where: eq(clientCompany.isDemo, true),
    columns: { id: true, nome: true, organizationId: true },
  });

  if (aziende.length === 0) {
    console.log("Nessuna azienda dimostrativa. Esegui prima `pnpm --filter web db:seed-demo`.");
    return;
  }

  for (const a of aziende) {
    const gia = await db.query.registro.findFirst({
      where: eq(registro.clientCompanyId, a.id),
      columns: { id: true },
    });
    if (gia) {
      console.log(`  ${a.nome}: ha già delle voci, non la tocco`);
      continue;
    }

    const moduli = await db.query.companyModule.findMany({
      where: eq(companyModule.clientCompanyId, a.id),
    });
    const attivi = moduli.filter((m) => m.attivo).map((m) => m.dominio as Dominio);
    if (attivi.length === 0) {
      console.log(`  ${a.nome}: nessun modulo attivo, niente da seminare`);
      continue;
    }

    const quante = await seminaVociRegistro(db, a.organizationId, a.id, attivi);
    console.log(`  ${a.nome}: ${quante} voci sui moduli ${attivi.join(", ")}`);
  }
}

principale()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
