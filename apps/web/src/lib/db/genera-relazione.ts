import { mkdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { clientCompany } from "@/lib/db/schema";
import { costruisciSnapshot, improntaSnapshot } from "@/features/relazioni/snapshot";
import { htmlRelazione } from "@/lib/documenti/relazione";
import { rendiPdf } from "@/lib/pdf";

const cartella = join(homedir(), "Desktop", "relazioni-suite-compliance");
mkdirSync(cartella, { recursive: true });

const cfg = await db.query.instanceConfig.findFirst();
const azienda = await db.query.clientCompany.findFirst({ where: eq(clientCompany.stato, "active") });
if (!azienda || !cfg) { console.error("nessuna azienda o configurazione"); process.exit(1); }

for (const ambito of ["suite", "d81"] as const) {
  const s = await costruisciSnapshot(cfg.organizationId, azienda.id, ambito);
  if (!s) { console.log(`${ambito}: nessun dato`); continue; }
  const impronta = improntaSnapshot(s);
  const html = htmlRelazione(s, { studio: cfg.brandNome ?? "Studio", numero: 1, impronta });
  const pdf = await rendiPdf(html);
  const nome = `relazione-${ambito}-${s.azienda.nome.replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase()}.pdf`;
  writeFileSync(join(cartella, nome), pdf);
  writeFileSync(join(cartella, nome.replace(".pdf", ".html")), html);
  console.log(`${nome} · ${(pdf.length / 1024).toFixed(0)} KB · ${s.complessivo.totale} adempimenti`);
}
console.log(`\ncartella: ${cartella}`);
process.exit(0);
