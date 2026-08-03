import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { clientCompany, report, user } from "@/lib/db/schema";
import { requireStudio } from "@/features/auth/guards";
import type { Snapshot } from "./snapshot";

export type RigaRelazione = {
  readonly id: string;
  readonly ambito: string;
  readonly stato: "bozza" | "pubblicata";
  readonly numero: number;
  readonly dataRiferimento: string;
  readonly hashSnapshot: string;
  readonly generataIl: Date;
  readonly pubblicataIl: Date | null;
  readonly generataDa: string | null;
  /** Le due cifre che si vogliono vedere nell'elenco senza aprire il PDF. */
  readonly conformita: number | null;
  readonly esposizione: number | null;
  readonly totale: number;
};

/** L'elenco delle relazioni di un'azienda, dalla più recente. */
export async function relazioniDi(aziendaId: string) {
  const ctx = await requireStudio();

  const azienda = await db.query.clientCompany.findFirst({
    where: and(eq(clientCompany.id, aziendaId), eq(clientCompany.organizationId, ctx.organizationId)),
    columns: { id: true, nome: true },
  });
  if (!azienda) return null;

  const righe = await db
    .select({
      id: report.id,
      ambito: report.ambito,
      stato: report.stato,
      numero: report.numero,
      dataRiferimento: report.dataRiferimento,
      hashSnapshot: report.hashSnapshot,
      generataIl: report.generataIl,
      pubblicataIl: report.pubblicataIl,
      generataDa: user.name,
      snapshot: report.snapshot,
    })
    .from(report)
    .leftJoin(user, eq(report.generataDa, user.id))
    .where(and(eq(report.clientCompanyId, aziendaId), eq(report.organizationId, ctx.organizationId)))
    .orderBy(desc(report.numero));

  // Le cifre di riepilogo si leggono DALLO SNAPSHOT, non ricalcolate: devono essere quelle
  // del documento, altrimenti l'elenco dice una cosa e il PDF un'altra.
  const elenco: RigaRelazione[] = righe.map((r) => {
    const s = r.snapshot as Snapshot;
    return {
      id: r.id,
      ambito: r.ambito,
      stato: r.stato,
      numero: r.numero,
      dataRiferimento: r.dataRiferimento,
      hashSnapshot: r.hashSnapshot,
      generataIl: r.generataIl,
      pubblicataIl: r.pubblicataIl,
      generataDa: r.generataDa,
      conformita: s?.complessivo?.conformitaEffettiva?.percentuale ?? null,
      esposizione: s?.complessivo?.esposizione?.indice ?? null,
      totale: s?.complessivo?.totale ?? 0,
    };
  });

  return { ctx, azienda, elenco };
}

/** Una relazione con il suo snapshot, per generarne il PDF. */
export async function relazione(id: string) {
  const ctx = await requireStudio();
  const riga = await db.query.report.findFirst({
    where: and(eq(report.id, id), eq(report.organizationId, ctx.organizationId)),
  });
  if (!riga) return null;
  return { ctx, riga, snapshot: riga.snapshot as Snapshot };
}
