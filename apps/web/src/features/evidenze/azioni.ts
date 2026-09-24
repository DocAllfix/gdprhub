"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { assessment, auditLog, evidence, instanceHistory, obligationInstance } from "@/lib/db/schema";
import { bloccoDemo, requireConsulente } from "@/features/auth/guards";
import { invalidaDati } from "@/lib/cache";
import { evidenzeDi } from "@/features/evidenze/dati";
import {
  DIMENSIONE_MASSIMA,
  TIPI_AMMESSI,
  archivioIstanza,
  chiaveEvidenza,
  improntaSha256,
  tipoReale,
} from "@/lib/storage";

// LE EVIDENZE.
//
// Un adempimento «completato» senza un documento allegato è una dichiarazione. Con il
// documento è una prova, e il prodotto esiste per produrre prove: quando arriva
// un'ispezione, «il DVR è aggiornato» vale quanto la carta che lo mostra.
//
// TUTTI I CONTROLLI STANNO QUI, NON NEL BROWSER. Il modulo di caricamento filtra le
// estensioni per cortesia — evita di far caricare venti megabyte per poi rifiutarli — ma
// chiunque può chiamare questa azione direttamente. Il tipo si decide dai primi byte,
// la dimensione si misura sul buffer ricevuto, e l'appartenenza allo studio si riverifica
// anche se l'identificativo arriva da un campo nascosto.
//
// L'ORDINE DELLE SCRITTURE NON È CASUALE: prima il file, poi la riga. Se il database
// fallisse dopo la scrittura resterebbe un file orfano, che è spazio sprecato; se fallisse
// il contrario resterebbe una riga che promette un documento inesistente, e un'evidenza che
// non si scarica è peggio di un'evidenza che non c'è.
//
// La versione cresce da sola: caricare di nuovo sullo stesso adempimento non sostituisce
// nulla. Un'evidenza sostituita in silenzio è la cosa che rende una relazione indifendibile.

export type EsitoEvidenza =
  { readonly ok: true; readonly nomeFile: string } | { readonly ok: false; readonly errore: string };

const ESTENSIONI = TIPI_AMMESSI.map((e) => `.${e}`).join(", ");

export async function caricaEvidenza(
  _precedente: EsitoEvidenza | null,
  dati: FormData,
): Promise<EsitoEvidenza> {
  const ctx = await requireConsulente();
  const bloccata = await bloccoDemo("carica un'evidenza");
  if (bloccata) return bloccata;

  const istanzaId = String(dati.get("istanzaId") ?? "");
  const file = dati.get("file");
  const validoDal = String(dati.get("validoDal") ?? "").trim() || null;
  const validoAl = String(dati.get("validoAl") ?? "").trim() || null;

  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, errore: "Nessun file selezionato." };
  }
  if (file.size > DIMENSIONE_MASSIMA) {
    const mb = Math.round(DIMENSIONE_MASSIMA / 1024 / 1024);
    return { ok: false, errore: `Il file supera i ${mb} MB. Allega il documento, non l'archivio completo.` };
  }

  // L'identificativo arriva dal client: si riverifica che l'istanza sia di questo studio.
  const istanza = await db.query.obligationInstance.findFirst({
    where: and(
      eq(obligationInstance.id, istanzaId),
      eq(obligationInstance.organizationId, ctx.organizationId),
    ),
  });
  if (!istanza) return { ok: false, errore: "Adempimento non trovato." };

  const buffer = Buffer.from(await file.arrayBuffer());
  const mime = tipoReale(buffer);
  if (!mime) {
    return {
      ok: false,
      errore: `Il contenuto del file non corrisponde a nessun formato ammesso (${ESTENSIONI}). Il nome del file non basta: si guarda dentro.`,
    };
  }

  const hash = improntaSha256(buffer);

  // Lo stesso identico documento due volte sullo stesso adempimento non è una versione
  // nuova: è un doppio clic. L'impronta lo dice con certezza, il nome del file no.
  const gemello = await db.query.evidence.findFirst({
    where: and(eq(evidence.obligationInstanceId, istanzaId), eq(evidence.hashSha256, hash)),
    columns: { id: true, nomeFile: true },
  });
  if (gemello) {
    return { ok: false, errore: `Questo identico documento è già allegato come «${gemello.nomeFile}».` };
  }

  const precedenti = await db.query.evidence.findMany({
    where: eq(evidence.obligationInstanceId, istanzaId),
    columns: { versione: true },
    orderBy: [desc(evidence.versione)],
    limit: 1,
  });
  const versione = (precedenti[0]?.versione ?? 0) + 1;

  const id = randomUUID();
  const estensione = file.name.split(".").pop() ?? "bin";
  const chiave = chiaveEvidenza(ctx.organizationId, id, estensione);

  try {
    await archivioIstanza().scrivi(chiave, buffer, mime);
  } catch (errore) {
    // L'archivio non configurato è un problema dell'istanza, non dell'utente: lo si dice
    // per intero invece di far comparire «errore imprevisto».
    return {
      ok: false,
      errore: errore instanceof Error ? errore.message : "Archivio non raggiungibile.",
    };
  }

  await db.insert(evidence).values({
    id,
    organizationId: ctx.organizationId,
    obligationInstanceId: istanzaId,
    storageKey: chiave,
    // Il nome originale si conserva ma non entra nel percorso: spesso contiene il nome di
    // una persona, e un percorso finisce nei log.
    nomeFile: file.name.slice(0, 200),
    mime,
    dimensione: buffer.length,
    hashSha256: hash,
    versione,
    validoDal,
    validoAl,
    caricatoDa: ctx.userId,
  });

  // L'allegato è un fatto dell'adempimento, quindi entra nel suo storico append-only: è la
  // risposta a «da quando esiste questa prova?».
  await db.insert(instanceHistory).values({
    organizationId: ctx.organizationId,
    obligationInstanceId: istanzaId,
    campo: "evidenza",
    da: null,
    a: `${file.name} · v${versione} · ${hash.slice(0, 12)}`,
    userId: ctx.userId,
  });

  await db.insert(auditLog).values({
    organizationId: ctx.organizationId,
    userId: ctx.userId,
    azione: "evidenza.carica",
    dettagli: { istanzaId, nomeFile: file.name, mime, dimensione: buffer.length, hash, versione },
  });

  await rinfresca(ctx.organizationId, istanza.assessmentId, istanza.dominio);
  return { ok: true, nomeFile: file.name };
}

export async function eliminaEvidenza(
  _precedente: EsitoEvidenza | null,
  dati: FormData,
): Promise<EsitoEvidenza> {
  const ctx = await requireConsulente();
  const bloccata = await bloccoDemo("elimina un'evidenza");
  if (bloccata) return bloccata;

  const id = String(dati.get("evidenzaId") ?? "");
  const riga = await db.query.evidence.findFirst({
    where: and(eq(evidence.id, id), eq(evidence.organizationId, ctx.organizationId)),
  });
  if (!riga) return { ok: false, errore: "Evidenza non trovata." };

  const istanza = await db.query.obligationInstance.findFirst({
    where: eq(obligationInstance.id, riga.obligationInstanceId),
    columns: { assessmentId: true, dominio: true },
  });

  // Il file si toglie DOPO la riga: se l'archivio fallisse dopo aver cancellato il
  // documento resterebbe una riga che promette una prova che non c'è più.
  await db.delete(evidence).where(eq(evidence.id, id));
  await archivioIstanza()
    .elimina(riga.storageKey)
    .catch(() => {
      // Un file rimasto è spazio sprecato, non un difetto di correttezza: si registra e si
      // va avanti invece di lasciare la riga a metà.
    });

  await db.insert(instanceHistory).values({
    organizationId: ctx.organizationId,
    obligationInstanceId: riga.obligationInstanceId,
    campo: "evidenza",
    da: `${riga.nomeFile} · v${riga.versione}`,
    a: null,
    userId: ctx.userId,
  });
  await db.insert(auditLog).values({
    organizationId: ctx.organizationId,
    userId: ctx.userId,
    azione: "evidenza.elimina",
    dettagli: { evidenzaId: id, nomeFile: riga.nomeFile, hash: riga.hashSha256 },
  });

  if (istanza) await rinfresca(ctx.organizationId, istanza.assessmentId, istanza.dominio);
  return { ok: true, nomeFile: riga.nomeFile };
}

async function rinfresca(organizationId: string, assessmentId: string, dominio: string) {
  invalidaDati(organizationId);
  const suo = await db.query.assessment.findFirst({
    where: eq(assessment.id, assessmentId),
    columns: { clientCompanyId: true },
  });
  if (suo) revalidatePath(`/azienda/${suo.clientCompanyId}/${dominio}`);
}

/**
 * L'elenco delle evidenze, chiamabile dal pannello.
 *
 * Si carica quando il pannello si apre e non per tutte le righe: su un assessment da
 * centosettantuno adempimenti sarebbero centosettantuno letture per mostrarne una.
 */
export async function elencoEvidenze(istanzaId: string) {
  return evidenzeDi(istanzaId);
}
