import { and, eq } from "drizzle-orm";
import { db } from "./index";
import { clientCompany } from "./schema";
import { seminaAziendaDimostrativa } from "./seed-demo";

// Riporta l'azienda di esempio allo stato iniziale.
//
// Serve DOPO il cancello visivo. Il cancello clicca ogni elemento azionabile, e fra questi
// ci sono i pulsanti che attivano e disattivano i moduli: è giusto che li clicchi — sono
// bottoni veri e devono funzionare — ma alla fine i dati dimostrativi vanno rimessi a posto,
// altrimenti il committente aprirebbe la vetrina e troverebbe moduli spenti a caso.
//
// Uso:  pnpm --filter web db:demo-reset

const NOME = "Fondiaria Meccanica Verdi S.p.A.";

const studio = await db.query.organization.findFirst();
if (!studio) {
  console.error("Nessuno studio configurato.");
  process.exit(1);
}

// La cancellazione si propaga a moduli, assessment, istanze ed evidenze: sono tutte in
// `on delete cascade` dall'azienda, che è la ragione per cui quel vincolo esiste.
const eliminate = await db
  .delete(clientCompany)
  .where(and(eq(clientCompany.organizationId, studio.id), eq(clientCompany.nome, NOME)))
  .returning({ id: clientCompany.id });

const esito = await seminaAziendaDimostrativa();
if (esito.stato === "creata") {
  console.log(
    `Azienda di esempio ricreata (${eliminate.length} precedente eliminata): ${esito.adempimenti} adempimenti.`,
  );
} else {
  console.error(`Ricreazione non riuscita: ${esito.stato}`);
  process.exit(1);
}
process.exit(0);
