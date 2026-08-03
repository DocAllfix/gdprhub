"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { and, desc, eq } from "drizzle-orm";
import { registroPerTipo } from "@gdpr/engine";
import { db } from "@/lib/db";
import { auditLog, clientCompany, companyModule, registro } from "@/lib/db/schema";
import { assertNotDemo, requireConsulente } from "@/features/auth/guards";
import { invalidaDati } from "@/lib/cache";

// APRIRE, AGGIORNARE, CHIUDERE una voce di registro.
//
// Un'azione sola per undici registri, parametrica sul tipo. I campi propri si validano
// contro la DEFINIZIONE del motore, non contro un elenco scritto qui: se un domani si
// aggiunge un registro, non c'è un secondo posto da aggiornare, e non c'è modo che i due
// elenchi divergano.
//
// IL NUMERO SI ASSEGNA ALLA CHIUSURA DELLA TRANSAZIONE, leggendo l'ultimo dentro la stessa:
// due violazioni aperte nello stesso istante non devono prendere lo stesso protocollo. È lo
// stesso meccanismo delle relazioni, per la stessa ragione — «Violazione n. 3/2026» deve
// identificarne una sola.
//
// CHIUDERE UN TERMINE RICHIEDE DI DIRE COME. Un obbligo dichiarato assolto senza esito non
// prova niente, e in sede di verifica una spunta senza descrizione vale quanto niente.

export type EsitoRegistro =
  | { readonly ok: true; readonly id: string; readonly numero: string }
  | { readonly ok: false; readonly errore: string };

/** Estrae e valida i campi propri del tipo dalla `FormData`. */
function dettagliDa(tipo: string, dati: FormData): { valori: Record<string, unknown>; mancanti: string[] } {
  const def = registroPerTipo(tipo);
  if (!def) return { valori: {}, mancanti: [] };

  const valori: Record<string, unknown> = {};
  const mancanti: string[] = [];

  for (const c of def.campi) {
    const grezzo = dati.get(`d_${c.chiave}`);
    if (c.tipo === "booleano") {
      valori[c.chiave] = grezzo === "on" || grezzo === "true";
      continue;
    }
    const testo = typeof grezzo === "string" ? grezzo.trim() : "";
    if (testo === "") {
      if (c.obbligatorio) mancanti.push(c.etichetta);
      continue;
    }
    if (c.tipo === "numero") {
      const n = Number(testo);
      if (!Number.isFinite(n)) {
        mancanti.push(`${c.etichetta} (non è un numero)`);
        continue;
      }
      valori[c.chiave] = n;
      continue;
    }
    if (c.tipo === "scelta" && c.opzioni && !c.opzioni.includes(testo)) {
      // L'elenco arriva dal client come qualunque altro campo: fidarsi del `<select>`
      // significherebbe accettare qualunque valore da chi salta l'interfaccia.
      mancanti.push(`${c.etichetta} (valore non ammesso)`);
      continue;
    }
    valori[c.chiave] = testo.slice(0, 4000);
  }
  return { valori, mancanti };
}

export async function apriVoce(_precedente: EsitoRegistro | null, dati: FormData): Promise<EsitoRegistro> {
  const ctx = await requireConsulente();
  await assertNotDemo("apri una voce di registro");

  const aziendaId = String(dati.get("aziendaId") ?? "");
  const tipo = String(dati.get("tipo") ?? "");
  const def = registroPerTipo(tipo);
  if (!def) return { ok: false, errore: "Registro non riconosciuto." };

  const azienda = await db.query.clientCompany.findFirst({
    where: and(eq(clientCompany.id, aziendaId), eq(clientCompany.organizationId, ctx.organizationId)),
    columns: { id: true },
  });
  if (!azienda) return { ok: false, errore: "Azienda non trovata." };

  // Il controllo sul modulo va rifatto QUI e non solo in lettura. Una pagina che non si
  // apre non impedisce a nessuno di invocare l'azione: il divieto vale dove si scrive.
  const modulo = await db.query.companyModule.findFirst({
    where: and(eq(companyModule.clientCompanyId, aziendaId), eq(companyModule.dominio, def.dominio)),
    columns: { attivo: true },
  });
  if (!modulo?.attivo) {
    return { ok: false, errore: `Il modulo ${def.dominio.toUpperCase()} non è attivo su questa azienda.` };
  }

  const titolo = String(dati.get("titolo") ?? "").trim();
  if (titolo.length < 3) return { ok: false, errore: "Il titolo è obbligatorio." };

  const conosciuto = String(dati.get("conosciutoIl") ?? "").trim();
  const conosciutoIl = conosciuto ? new Date(conosciuto) : new Date();
  if (Number.isNaN(conosciutoIl.getTime())) {
    return { ok: false, errore: `«${def.etichettaData}» non è una data valida.` };
  }
  // Una data futura sul fatto che fa decorrere un termine sposta la scadenza in avanti: è
  // il modo più semplice di darsi tempo che non si ha.
  if (conosciutoIl.getTime() > Date.now() + 60_000) {
    return { ok: false, errore: `«${def.etichettaData}» non può essere nel futuro.` };
  }

  const { valori, mancanti } = dettagliDa(tipo, dati);
  if (mancanti.length > 0) {
    return { ok: false, errore: `Campi obbligatori mancanti: ${mancanti.join(", ")}.` };
  }

  const avvenuto = String(dati.get("avvenutoIl") ?? "").trim();
  const id = randomUUID();

  const numero = await db.transaction(async (tx) => {
    const ultima = await tx
      .select({ n: registro.numero })
      .from(registro)
      .where(and(eq(registro.clientCompanyId, aziendaId), eq(registro.tipo, tipo)))
      .orderBy(desc(registro.creatoIl))
      .limit(1);
    const anno = conosciutoIl.getFullYear();
    const precedente = Number((ultima[0]?.n ?? "").split("/")[0]) || 0;
    const n = `${precedente + 1}/${anno}`;
    await tx.insert(registro).values({
      id,
      organizationId: ctx.organizationId,
      clientCompanyId: aziendaId,
      tipo,
      numero: n,
      titolo: titolo.slice(0, 300),
      descrizione:
        String(dati.get("descrizione") ?? "")
          .trim()
          .slice(0, 4000) || null,
      conosciutoIl,
      avvenutoIl: avvenuto ? new Date(avvenuto) : null,
      dettagli: valori,
      apertoDa: ctx.userId,
    });
    return n;
  });

  await db.insert(auditLog).values({
    organizationId: ctx.organizationId,
    userId: ctx.userId,
    azione: "registro.apri",
    dettagli: { id, tipo, aziendaId, numero, titolo },
  });

  invalidaDati(ctx.organizationId);
  revalidatePath(`/azienda/${aziendaId}/registro/${tipo}`);
  return { ok: true, id, numero };
}

export async function assolviVoce(_precedente: EsitoRegistro | null, dati: FormData): Promise<EsitoRegistro> {
  const ctx = await requireConsulente();
  await assertNotDemo("chiudi una voce di registro");

  const id = String(dati.get("voceId") ?? "");
  const esito = String(dati.get("esito") ?? "").trim();

  const riga = await db.query.registro.findFirst({
    where: and(eq(registro.id, id), eq(registro.organizationId, ctx.organizationId)),
  });
  if (!riga) return { ok: false, errore: "Voce non trovata." };

  // UN OBBLIGO ASSOLTO SENZA DIRE COME NON PROVA NIENTE. In sede di verifica una spunta
  // senza descrizione vale quanto una casella vuota, e costa la stessa fatica scriverla.
  if (esito.length < 5) {
    const def = registroPerTipo(riga.tipo);
    return {
      ok: false,
      errore: `Descrivi come è stato assolto l'obbligo: «${def?.termine.obbligo ?? "adempimento"}». Una spunta senza esito non è dimostrabile.`,
    };
  }

  await db
    .update(registro)
    .set({ assoltoIl: new Date(), esito: esito.slice(0, 4000), stato: "chiuso", aggiornatoIl: new Date() })
    .where(eq(registro.id, id));

  await db.insert(auditLog).values({
    organizationId: ctx.organizationId,
    userId: ctx.userId,
    azione: "registro.assolvi",
    dettagli: { id, tipo: riga.tipo, numero: riga.numero, esito },
  });

  invalidaDati(ctx.organizationId);
  revalidatePath(`/azienda/${riga.clientCompanyId}/registro/${riga.tipo}`);
  return { ok: true, id, numero: riga.numero };
}

export async function cambiaStatoVoce(
  _precedente: EsitoRegistro | null,
  dati: FormData,
): Promise<EsitoRegistro> {
  const ctx = await requireConsulente();
  await assertNotDemo("cambia lo stato di una voce");

  const id = String(dati.get("voceId") ?? "");
  const stato = String(dati.get("stato") ?? "");
  if (!["aperto", "in-istruttoria", "chiuso", "archiviato"].includes(stato)) {
    return { ok: false, errore: "Stato non ammesso." };
  }

  const riga = await db.query.registro.findFirst({
    where: and(eq(registro.id, id), eq(registro.organizationId, ctx.organizationId)),
  });
  if (!riga) return { ok: false, errore: "Voce non trovata." };

  await db.update(registro).set({ stato, aggiornatoIl: new Date() }).where(eq(registro.id, id));
  await db.insert(auditLog).values({
    organizationId: ctx.organizationId,
    userId: ctx.userId,
    azione: "registro.stato",
    dettagli: { id, tipo: riga.tipo, numero: riga.numero, da: riga.stato, a: stato },
  });

  invalidaDati(ctx.organizationId);
  revalidatePath(`/azienda/${riga.clientCompanyId}/registro/${riga.tipo}`);
  return { ok: true, id, numero: riga.numero };
}
