import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import {
  CATALOGHI,
  CLIENTI_DIMOSTRATIVI,
  DOMINI,
  ETICHETTE_DOMINIO,
  costruisciDemo,
  oggiA,
  type Dominio,
} from "@gdpr/engine";
import { db } from "./index";
import {
  assessment,
  catalogVersion,
  clientCompany,
  companyModule,
  instanceConfig,
  obligationInstance,
  obligationTemplate,
} from "./schema";

// L'azienda di esempio, con i tre moduli popolati.
//
// I dati NON sono inventati qui: arrivano da `costruisciDemo` del motore, lo stesso stato
// dimostrativo che alimenta `/design` e i prototipi PDF. Un secondo generatore di dati finti
// produrrebbe numeri diversi dagli stessi input, e il committente li vedrebbe divergere fra
// la vetrina e l'applicazione.
//
// Le date sono RELATIVE a oggi, non assolute: i tre prototipi avevano scadenze cablate al
// 2025-2026 e il loro demo invecchia. Questo si può riseminare fra un anno e continua a
// mostrare scadute, in scadenza e regolari.
//
// Idempotente: se l'azienda di esempio esiste già non tocca nulla.
//
// Uso:  pnpm --filter web db:seed-demo

const NOME = "Fondiaria Meccanica Verdi S.p.A.";

export type EsitoDemo =
  | { readonly stato: "gia_presente"; readonly id: string }
  | { readonly stato: "creata"; readonly id: string; readonly adempimenti: number }
  | { readonly stato: "istanza_non_inizializzata" }
  | { readonly stato: "catalogo_mancante" };

export async function seminaAziendaDimostrativa(): Promise<EsitoDemo> {
  const studio = await db.query.organization.findFirst();
  if (!studio) return { stato: "istanza_non_inizializzata" };

  const gia = await db.query.clientCompany.findFirst({
    where: and(eq(clientCompany.organizationId, studio.id), eq(clientCompany.nome, NOME)),
  });
  if (gia) return { stato: "gia_presente", id: gia.id };

  const versione = await db.query.catalogVersion.findFirst({ where: eq(catalogVersion.attiva, "si") });
  if (!versione) return { stato: "catalogo_mancante" };

  const oggi = oggiA();
  const aziendaId = randomUUID();
  let totale = 0;

  await db.transaction(async (tx) => {
    await tx.insert(clientCompany).values({
      id: aziendaId,
      organizationId: studio.id,
      nome: NOME,
      piva: "02914770376",
      settore: "Metalmeccanico",
      sede: "Via Emilia Ponente 214, 40133 Bologna (BO)",
      ateco: "25.62.00",
      numeroDipendenti: 87,
      fatturatoAnnuo: 12_400_000,
      isDemo: true,
    });

    for (const dominio of DOMINI) {
      await tx.insert(companyModule).values({
        id: randomUUID(),
        organizationId: studio.id,
        clientCompanyId: aziendaId,
        dominio,
        attivo: true,
      });

      const templates = await tx.query.obligationTemplate.findMany({
        where: and(
          eq(obligationTemplate.catalogVersionId, versione.id),
          eq(obligationTemplate.dominio, dominio as Dominio),
        ),
      });
      if (templates.length === 0) continue;

      const assessmentId = randomUUID();
      await tx.insert(assessment).values({
        id: assessmentId,
        organizationId: studio.id,
        clientCompanyId: aziendaId,
        dominio,
        catalogVersionId: versione.id,
        titolo: `Assessment ${ETICHETTE_DOMINIO[dominio].breve}`,
        dataRiferimento: oggi,
        stato: "in_corso",
      });

      // Lo stato dimostrativo del motore, indicizzato per codice.
      const demo = new Map(
        costruisciDemo(CATALOGHI[dominio], CLIENTI_DIMOSTRATIVI[dominio], oggi).map((a) => [a.codice, a]),
      );

      await tx.insert(obligationInstance).values(
        templates.map((t) => {
          const d = demo.get(t.codice);
          return {
            id: randomUUID(),
            organizationId: studio.id,
            assessmentId,
            templateId: t.id,
            dominio,
            codice: t.codice,
            stato: d?.stato ?? ("Da fare" as const),
            ultimaEsecuzione: d?.ultimaEsecuzione ?? null,
            scadenzaEsplicita: d?.scadenzaEsplicita ?? null,
            priorita: d?.priorita ?? t.prioritaDefault,
            rischio: d?.rischio ?? t.rischioDefault,
          };
        }),
      );
      totale += templates.length;
    }

    // Se l'istanza non ha ancora un catalogo agganciato, glielo si aggancia qui: è il
    // momento in cui diventa effettivamente utilizzabile.
    await tx
      .update(instanceConfig)
      .set({ catalogVersionId: versione.id })
      .where(eq(instanceConfig.organizationId, studio.id));
  });

  return { stato: "creata", id: aziendaId, adempimenti: totale };
}
