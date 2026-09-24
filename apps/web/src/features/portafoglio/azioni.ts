"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { DOMINI, ETICHETTE_DOMINIO, oggiA, type Dominio } from "@gdpr/engine";
import { db } from "@/lib/db";
import {
  assessment,
  auditLog,
  catalogVersion,
  clientCompany,
  companyModule,
  obligationInstance,
  obligationTemplate,
} from "@/lib/db/schema";
import { bloccoDemo, requireAdmin, requireConsulente } from "@/features/auth/guards";
import { invalidaDati } from "@/lib/cache";

// Le azioni del portafoglio.
//
// Ogni funzione comincia con un guard e finisce con una riga di registro. Nessuna si fida
// dell'interfaccia: un pulsante nascosto non è un controllo di accesso, e un `disabled` si
// toglie dalla console del browser in due secondi.

export type Esito =
  | { readonly ok: true; readonly id?: string }
  | {
      readonly ok: false;
      readonly errore: string;
      /**
       * Quello che l'utente aveva scritto.
       *
       * React azzera un form dopo che la sua azione è tornata, anche quando è tornata con
       * un errore: senza rimandare indietro i valori, chi sbaglia una cifra della partita
       * IVA si ritrova il modulo vuoto e deve riscrivere tutto. Trovato provando il flusso
       * clic per clic, non leggendo il codice.
       */
      readonly valori?: Readonly<Record<string, string>>;
      /** I moduli spuntati, per non farli tornare tutti attivi dopo un errore. */
      readonly moduli?: readonly string[];
    };

/** Rimanda indietro ciò che è stato scritto, così il modulo si ricompone com'era. */
function conservati(dati: FormData): { valori: Record<string, string>; moduli: string[] } {
  const valori: Record<string, string> = {};
  for (const campo of ["nome", "settore", "sede", "piva", "ateco", "numeroDipendenti", "fatturatoAnnuo"]) {
    valori[campo] = String(dati.get(campo) ?? "");
  }
  return { valori, moduli: DOMINI.filter((d) => dati.get(`modulo-${d}`) === "on") };
}

const eDominio = (v: string): v is Dominio => (DOMINI as readonly string[]).includes(v);

function testo(dati: FormData, campo: string): string {
  return String(dati.get(campo) ?? "").trim();
}

function numero(dati: FormData, campo: string): number | null {
  const grezzo = testo(dati, campo).replace(/[^\d]/g, "");
  if (grezzo === "") return null;
  const n = Number(grezzo);
  return Number.isFinite(n) ? n : null;
}

async function registra(
  organizationId: string,
  userId: string,
  azione: string,
  entita: string,
  entitaId: string,
  dettagli?: unknown,
) {
  await db.insert(auditLog).values({
    organizationId,
    userId,
    azione,
    entita,
    entitaId,
    dettagli: dettagli === undefined ? null : (dettagli as object),
  });
}

// ============================================================================================
// Aziende
// ============================================================================================

export async function creaAzienda(_precedente: Esito | null, dati: FormData): Promise<Esito> {
  const ctx = await requireConsulente();
  const bloccata = await bloccoDemo("creazione di un'azienda");
  if (bloccata) return bloccata;

  const nome = testo(dati, "nome");
  if (nome.length < 2) {
    return { ok: false, errore: "La ragione sociale è obbligatoria.", ...conservati(dati) };
  }

  const piva = testo(dati, "piva");
  // La partita IVA italiana è di undici cifre. Non si valida il check digit qui: un dato
  // rifiutato per una regola che il consulente non si aspetta è peggio di un dato imperfetto.
  if (piva !== "" && !/^\d{11}$/.test(piva)) {
    return {
      ok: false,
      errore: "La partita IVA deve essere di undici cifre.",
      ...conservati(dati),
    };
  }

  const id = randomUUID();
  const moduli = DOMINI.filter((d) => dati.get(`modulo-${d}`) === "on");

  await db.transaction(async (tx) => {
    await tx.insert(clientCompany).values({
      id,
      organizationId: ctx.organizationId,
      nome,
      piva: piva || null,
      settore: testo(dati, "settore") || null,
      sede: testo(dati, "sede") || null,
      ateco: testo(dati, "ateco") || null,
      numeroDipendenti: numero(dati, "numeroDipendenti"),
      fatturatoAnnuo: numero(dati, "fatturatoAnnuo"),
    });
    for (const dominio of moduli) {
      await tx.insert(companyModule).values({
        id: randomUUID(),
        organizationId: ctx.organizationId,
        clientCompanyId: id,
        dominio,
        attivo: true,
      });
    }
  });

  await registra(ctx.organizationId, ctx.userId, "azienda.creata", "client_company", id, {
    nome,
    moduli,
  });

  // I moduli scelti in fase di creazione vengono popolati subito: un'azienda con un modulo
  // attivo e zero adempimenti è uno stato che non serve a nessuno.
  for (const dominio of moduli) await apriAssessment(ctx.organizationId, ctx.userId, id, dominio);

  invalidaDati(ctx.organizationId);
  revalidatePath("/portafoglio");
  revalidatePath("/cruscotto");
  revalidatePath("/scadenzario");
  return { ok: true, id };
}

export async function archiviaAzienda(_precedente: Esito | null, dati: FormData): Promise<Esito> {
  const ctx = await requireConsulente();
  const bloccata = await bloccoDemo("archiviazione di un'azienda");
  if (bloccata) return bloccata;

  const id = testo(dati, "id");
  const trovata = await db.query.clientCompany.findFirst({
    where: and(eq(clientCompany.id, id), eq(clientCompany.organizationId, ctx.organizationId)),
  });
  if (!trovata) return { ok: false, errore: "Azienda non trovata." };

  // Non si cancella: un'azienda archiviata resta leggibile, perché le relazioni già
  // consegnate al suo CdA devono restare ricostruibili.
  const nuovoStato = trovata.stato === "active" ? "archived" : "active";
  await db
    .update(clientCompany)
    .set({ stato: nuovoStato, archivedAt: nuovoStato === "archived" ? new Date() : null })
    .where(eq(clientCompany.id, id));

  await registra(ctx.organizationId, ctx.userId, `azienda.${nuovoStato}`, "client_company", id, {
    nome: trovata.nome,
  });
  invalidaDati(ctx.organizationId);
  revalidatePath("/portafoglio");
  revalidatePath("/cruscotto");
  revalidatePath(`/azienda/${id}`);
  return { ok: true, id };
}

// ============================================================================================
// Moduli
// ============================================================================================

/**
 * Apre un assessment per un modulo e vi cala TUTTI gli adempimenti del catalogo attivo.
 *
 * La versione di catalogo si congela qui: un assessment non deve cambiare catalogo sotto i
 * piedi mentre il consulente ci lavora, altrimenti la relazione firmata il mese scorso non
 * sarebbe più ricostruibile.
 */
async function apriAssessment(
  organizationId: string,
  userId: string,
  clientCompanyId: string,
  dominio: Dominio,
): Promise<string | null> {
  const versione = await db.query.catalogVersion.findFirst({ where: eq(catalogVersion.attiva, "si") });
  if (!versione) throw new Error("Nessuna versione di catalogo attiva: eseguire `pnpm db:seed`.");

  const gia = await db.query.assessment.findFirst({
    where: and(eq(assessment.clientCompanyId, clientCompanyId), eq(assessment.dominio, dominio)),
  });
  if (gia) return gia.id;

  const templates = await db.query.obligationTemplate.findMany({
    where: and(eq(obligationTemplate.catalogVersionId, versione.id), eq(obligationTemplate.dominio, dominio)),
  });
  if (templates.length === 0) return null;

  const id = randomUUID();
  await db.transaction(async (tx) => {
    await tx.insert(assessment).values({
      id,
      organizationId,
      clientCompanyId,
      dominio,
      catalogVersionId: versione.id,
      titolo: `Assessment ${ETICHETTE_DOMINIO[dominio].breve}`,
      dataRiferimento: oggiA(),
      stato: "in_corso",
      createdBy: userId,
    });
    await tx.insert(obligationInstance).values(
      templates.map((t) => ({
        id: randomUUID(),
        organizationId,
        assessmentId: id,
        templateId: t.id,
        dominio,
        codice: t.codice,
        stato: "Da fare" as const,
        priorita: t.prioritaDefault,
        rischio: t.rischioDefault,
      })),
    );
  });

  await registra(organizationId, userId, "assessment.aperto", "assessment", id, {
    dominio,
    adempimenti: templates.length,
  });
  return id;
}

export async function commutaModulo(_precedente: Esito | null, dati: FormData): Promise<Esito> {
  const ctx = await requireConsulente();
  const bloccata = await bloccoDemo("attivazione di un modulo");
  if (bloccata) return bloccata;

  const aziendaId = testo(dati, "aziendaId");
  const dominioGrezzo = testo(dati, "dominio");
  if (!eDominio(dominioGrezzo)) return { ok: false, errore: "Modulo sconosciuto." };
  const dominio = dominioGrezzo;

  const trovata = await db.query.clientCompany.findFirst({
    where: and(eq(clientCompany.id, aziendaId), eq(clientCompany.organizationId, ctx.organizationId)),
  });
  if (!trovata) return { ok: false, errore: "Azienda non trovata." };

  const esistente = await db.query.companyModule.findFirst({
    where: and(eq(companyModule.clientCompanyId, aziendaId), eq(companyModule.dominio, dominio)),
  });

  const attivo = !(esistente?.attivo ?? false);

  if (esistente) {
    await db.update(companyModule).set({ attivo }).where(eq(companyModule.id, esistente.id));
  } else {
    await db.insert(companyModule).values({
      id: randomUUID(),
      organizationId: ctx.organizationId,
      clientCompanyId: aziendaId,
      dominio,
      attivo,
    });
  }

  // Disattivare NON cancella nulla: l'assessment e le sue evidenze restano, e riattivando
  // il modulo il lavoro fatto ricompare. Una disattivazione distruttiva sarebbe un modo
  // eccellente di perdere due anni di documentazione con un clic.
  if (attivo) await apriAssessment(ctx.organizationId, ctx.userId, aziendaId, dominio);

  await registra(
    ctx.organizationId,
    ctx.userId,
    attivo ? "modulo.attivato" : "modulo.disattivato",
    "company_module",
    aziendaId,
    { dominio, azienda: trovata.nome },
  );

  invalidaDati(ctx.organizationId);
  revalidatePath("/portafoglio");
  revalidatePath("/cruscotto");
  revalidatePath("/scadenzario");
  revalidatePath(`/azienda/${aziendaId}`);
  return { ok: true, id: aziendaId };
}

// ============================================================================================
// Marchio dello studio
// ============================================================================================

export async function aggiornaMarchio(_precedente: Esito | null, dati: FormData): Promise<Esito> {
  const ctx = await requireAdmin();
  const bloccata = await bloccoDemo("modifica del marchio");
  if (bloccata) return bloccata;

  const nome = testo(dati, "brandNome");
  if (nome.length < 2) return { ok: false, errore: "Il nome dello studio è obbligatorio." };

  const { instanceConfig } = await import("@/lib/db/schema");
  await db
    .update(instanceConfig)
    .set({ brandNome: nome })
    .where(eq(instanceConfig.organizationId, ctx.organizationId));

  await registra(
    ctx.organizationId,
    ctx.userId,
    "marchio.aggiornato",
    "instance_config",
    ctx.organizationId,
    {
      nome,
    },
  );
  revalidatePath("/", "layout");
  return { ok: true };
}
