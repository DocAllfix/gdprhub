"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { auditLog, clientCompany, report } from "@/lib/db/schema";
import { assertNotDemo, requireConsulente } from "@/features/auth/guards";
import { costruisciSnapshot, improntaSnapshot, type Snapshot } from "./snapshot";

// GENERARE E PUBBLICARE.
//
// Sono due gesti separati apposta, e la separazione è tutto il valore del meccanismo.
//
// GENERARE produce una BOZZA: il calcolo di oggi congelato in JSON, rifacibile quante volte
// si vuole. È lì che il consulente controlla, si accorge che un'esclusione non ha
// motivazione, chiude un adempimento dimenticato e rigenera.
//
// PUBBLICARE trasforma la bozza in un atto, e da quel momento nessuno la tocca più —
// nemmeno da psql, perché il divieto è un trigger sul database. Se i dati cambiano non si
// corregge: se ne genera una nuova, e le due restano entrambe, con il loro numero e la loro
// data. È così che funziona un protocollo.
//
// IL PDF NON SI SALVA. Si rigenera dallo snapshot ogni volta che serve, ed è identico
// perché lo snapshot è identico. Salvare il binario significherebbe avere due verità da
// tenere allineate — il JSON e il file — e il giorno in cui divergono nessuno sa quale sia
// il documento consegnato.

export type EsitoRelazione =
  | { readonly ok: true; readonly id: string; readonly numero: number }
  | { readonly ok: false; readonly errore: string };

const AMBITI = ["suite", "gdpr", "d231", "d81"] as const;

export async function generaRelazione(
  _precedente: EsitoRelazione | null,
  dati: FormData,
): Promise<EsitoRelazione> {
  const ctx = await requireConsulente();
  await assertNotDemo("genera una relazione");

  const aziendaId = String(dati.get("aziendaId") ?? "");
  const ambitoGrezzo = String(dati.get("ambito") ?? "suite");
  const ambito = (AMBITI as readonly string[]).includes(ambitoGrezzo)
    ? (ambitoGrezzo as Snapshot["ambito"])
    : "suite";

  const azienda = await db.query.clientCompany.findFirst({
    where: and(eq(clientCompany.id, aziendaId), eq(clientCompany.organizationId, ctx.organizationId)),
    columns: { id: true },
  });
  if (!azienda) return { ok: false, errore: "Azienda non trovata." };

  const snapshot = await costruisciSnapshot(ctx.organizationId, aziendaId, ambito);
  if (!snapshot) {
    return {
      ok: false,
      errore:
        "Non ci sono adempimenti da relazionare per questo ambito: il modulo non è attivo oppure il catalogo non è stato ancora censito.",
    };
  }

  // Il progressivo è per azienda, e si legge dentro la stessa transazione della scrittura:
  // due relazioni generate nello stesso istante non devono prendere lo stesso numero. Se
  // succedesse lo direbbe comunque l'indice unico, ma con un errore che nessuno capisce.
  const id = randomUUID();
  const numero = await db.transaction(async (tx) => {
    const ultima = await tx
      .select({ n: report.numero })
      .from(report)
      .where(eq(report.clientCompanyId, aziendaId))
      .orderBy(desc(report.numero))
      .limit(1);
    const n = (ultima[0]?.n ?? 0) + 1;
    await tx.insert(report).values({
      id,
      organizationId: ctx.organizationId,
      clientCompanyId: aziendaId,
      ambito,
      stato: "bozza",
      numero: n,
      dataRiferimento: snapshot.dataRiferimento,
      snapshot,
      hashSnapshot: improntaSnapshot(snapshot),
      generataDa: ctx.userId,
    });
    return n;
  });

  await db.insert(auditLog).values({
    organizationId: ctx.organizationId,
    userId: ctx.userId,
    azione: "relazione.genera",
    dettagli: { id, aziendaId, ambito, numero, totale: snapshot.complessivo.totale },
  });

  revalidatePath(`/azienda/${aziendaId}/relazioni`);
  return { ok: true, id, numero };
}

export async function pubblicaRelazione(
  _precedente: EsitoRelazione | null,
  dati: FormData,
): Promise<EsitoRelazione> {
  const ctx = await requireConsulente();
  await assertNotDemo("pubblica una relazione");

  const id = String(dati.get("relazioneId") ?? "");
  const riga = await db.query.report.findFirst({
    where: and(eq(report.id, id), eq(report.organizationId, ctx.organizationId)),
  });
  if (!riga) return { ok: false, errore: "Relazione non trovata." };
  if (riga.stato === "pubblicata") return { ok: false, errore: "Già pubblicata." };

  // Lo snapshot NON si tocca in questo momento: il trigger lo rifiuterebbe, ed è giusto —
  // firmare cambiando il contenuto significherebbe firmare un documento diverso da quello
  // riletto. Si scrive solo lo stato e la data.
  await db.update(report).set({ stato: "pubblicata", pubblicataIl: new Date() }).where(eq(report.id, id));

  await db.insert(auditLog).values({
    organizationId: ctx.organizationId,
    userId: ctx.userId,
    azione: "relazione.pubblica",
    dettagli: { id, numero: riga.numero, hash: riga.hashSnapshot },
  });

  revalidatePath(`/azienda/${riga.clientCompanyId}/relazioni`);
  return { ok: true, id, numero: riga.numero };
}

export async function eliminaBozza(
  _precedente: EsitoRelazione | null,
  dati: FormData,
): Promise<EsitoRelazione> {
  const ctx = await requireConsulente();
  await assertNotDemo("elimina una bozza");

  const id = String(dati.get("relazioneId") ?? "");
  const riga = await db.query.report.findFirst({
    where: and(eq(report.id, id), eq(report.organizationId, ctx.organizationId)),
  });
  if (!riga) return { ok: false, errore: "Relazione non trovata." };
  if (riga.stato === "pubblicata") {
    // Il trigger la fermerebbe comunque. Il messaggio qui serve perché l'utente capisca
    // il perché invece di vedere un errore del database.
    return {
      ok: false,
      errore:
        "Una relazione pubblicata non si elimina: è un atto consegnato. Se i dati sono cambiati, generane una nuova.",
    };
  }

  await db.delete(report).where(eq(report.id, id));
  await db.insert(auditLog).values({
    organizationId: ctx.organizationId,
    userId: ctx.userId,
    azione: "relazione.elimina-bozza",
    dettagli: { id, numero: riga.numero },
  });

  revalidatePath(`/azienda/${riga.clientCompanyId}/relazioni`);
  return { ok: true, id, numero: riga.numero };
}

/** Quante relazioni ha un'azienda: serve alla scheda per non caricarle tutte. */
export async function quanteRelazioni(aziendaId: string): Promise<number> {
  const ctx = await requireConsulente();
  const r = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(report)
    .where(and(eq(report.clientCompanyId, aziendaId), eq(report.organizationId, ctx.organizationId)));
  return r[0]?.n ?? 0;
}
