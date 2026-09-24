"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { PRIORITA, STATI_LAVORO, scomponi, type Priorita, type StatoLavoro } from "@legisboard/engine";
import { db } from "@/lib/db";
import { assessment, auditLog, instanceHistory, obligationInstance } from "@/lib/db/schema";
import { bloccoDemo, requireConsulente } from "@/features/auth/guards";
import { invalidaDati } from "@/lib/cache";

// Le modifiche a un adempimento.
//
// OGNI CAMBIAMENTO LASCIA UNA TRACCIA. `instance_history` è append-only per trigger sul
// database: non si può correggere il passato nemmeno da qui. È il motivo per cui alla Fase
// 10 il trend sarà vero invece che generato, ed è la risposta alla domanda che un ispettore
// fa sempre: «da quando è così?».
//
// La scadenza NON si scrive mai. Si scrive l'ultima esecuzione e la scadenza si deriva: è la
// semantica dell'81/08, estesa ai tre domini, e impedisce che data e stato si contraddicano.

export type EsitoModifica = { readonly ok: true } | { readonly ok: false; readonly errore: string };

/** Un solo punto di scrittura: legge lo stato attuale, applica, registra la differenza. */
async function modifica(
  istanzaId: string,
  campi: Partial<typeof obligationInstance.$inferInsert>,
  tracce: readonly { campo: string; da: string | null; a: string | null }[],
): Promise<{ organizationId: string; aziendaId: string; dominio: string } | null> {
  const ctx = await requireConsulente();

  // L'identificativo arriva dal client: si riverifica che l'istanza appartenga a questo
  // studio prima di toccarla. Un id indovinato non è un'autorizzazione.
  const istanza = await db.query.obligationInstance.findFirst({
    where: and(
      eq(obligationInstance.id, istanzaId),
      eq(obligationInstance.organizationId, ctx.organizationId),
    ),
  });
  if (!istanza) return null;

  const suo = await db.query.assessment.findFirst({ where: eq(assessment.id, istanza.assessmentId) });
  if (!suo) return null;

  await db.transaction(async (tx) => {
    await tx.update(obligationInstance).set(campi).where(eq(obligationInstance.id, istanzaId));
    const effettive = tracce.filter((t) => t.da !== t.a);
    if (effettive.length > 0) {
      await tx.insert(instanceHistory).values(
        effettive.map((t) => ({
          organizationId: ctx.organizationId,
          obligationInstanceId: istanzaId,
          campo: t.campo,
          da: t.da,
          a: t.a,
          userId: ctx.userId,
        })),
      );
    }
  });

  await db.insert(auditLog).values({
    organizationId: ctx.organizationId,
    userId: ctx.userId,
    azione: "adempimento.modificato",
    entita: "obligation_instance",
    entitaId: istanzaId,
    dettagli: { codice: istanza.codice, dominio: istanza.dominio, campi: tracce.map((t) => t.campo) },
  });

  return {
    organizationId: ctx.organizationId,
    aziendaId: suo.clientCompanyId,
    dominio: istanza.dominio,
  };
}

function rinfresca(organizationId: string, aziendaId: string, dominio: string) {
  // Prima la cache dei calcoli, poi le pagine: invertirle rigenererebbe le pagine leggendo
  // ancora i dati vecchi, e il consulente vedrebbe lo stato di prima.
  invalidaDati(organizationId);
  revalidatePath(`/azienda/${aziendaId}/${dominio}`);
  revalidatePath(`/azienda/${aziendaId}`);
  revalidatePath("/portafoglio");
  revalidatePath("/scadenzario");
  revalidatePath("/cruscotto");
}

// ============================================================================================

export async function cambiaStato(
  istanzaId: string,
  nuovo: StatoLavoro,
  motivazione?: string,
): Promise<EsitoModifica> {
  // IN DEMO SI PUÒ CAMBIARE LO STATO: è ciò che un visitatore viene a provare (confermato dal
  // committente il 2026-09-24), e ogni notte i dati tornano come prima. Tranne un passaggio:
  // «Non applicabile» porta una motivazione in TESTO LIBERO, che il visitatore successivo
  // leggerebbe. Su un'istanza aperta a chiunque è un canale di spam, o di peggio.
  if (nuovo === "Non applicabile") {
    const bloccata = await bloccoDemo("dichiarare un adempimento non applicabile");
    if (bloccata) return bloccata;
  }
  if (!(STATI_LAVORO as readonly string[]).includes(nuovo)) {
    return { ok: false, errore: "Stato sconosciuto." };
  }

  const ctx = await requireConsulente();
  const istanza = await db.query.obligationInstance.findFirst({
    where: and(
      eq(obligationInstance.id, istanzaId),
      eq(obligationInstance.organizationId, ctx.organizationId),
    ),
  });
  if (!istanza) return { ok: false, errore: "Adempimento non trovato." };

  // «Non applicabile» senza una ragione scritta è un buco nella relazione, non una scelta.
  // Il vincolo esiste anche sul database: qui si dà il messaggio, lì si impedisce il dato.
  const testo = (motivazione ?? "").trim();
  if (nuovo === "Non applicabile" && testo.length < 3) {
    return { ok: false, errore: "Per dichiarare un adempimento non applicabile serve una motivazione." };
  }

  const motivazioneFinale = nuovo === "Non applicabile" ? testo : null;

  const esito = await modifica(istanzaId, { stato: nuovo, motivazioneNonApplicabile: motivazioneFinale }, [
    { campo: "stato", da: istanza.stato, a: nuovo },
    {
      campo: "motivazioneNonApplicabile",
      da: istanza.motivazioneNonApplicabile,
      a: motivazioneFinale,
    },
  ]);
  if (!esito) return { ok: false, errore: "Adempimento non trovato." };

  rinfresca(esito.organizationId, esito.aziendaId, esito.dominio);
  return { ok: true };
}

export async function impostaUltimaEsecuzione(
  istanzaId: string,
  data: string | null,
): Promise<EsitoModifica> {
  // Permesso in demo: è una data, non un testo, e muove la scadenza — cioè la tesi del prodotto.

  const pulita = (data ?? "").trim();
  if (pulita !== "") {
    // `scomponi` rifiuta il 30 febbraio: una data di calendario impossibile non entra.
    const parti = scomponi(pulita);
    if (!parti) return { ok: false, errore: "Data non valida. Formato atteso: AAAA-MM-GG." };
  }
  const valore = pulita === "" ? null : pulita;

  const ctx = await requireConsulente();
  const istanza = await db.query.obligationInstance.findFirst({
    where: and(
      eq(obligationInstance.id, istanzaId),
      eq(obligationInstance.organizationId, ctx.organizationId),
    ),
  });
  if (!istanza) return { ok: false, errore: "Adempimento non trovato." };

  const esito = await modifica(istanzaId, { ultimaEsecuzione: valore }, [
    { campo: "ultimaEsecuzione", da: istanza.ultimaEsecuzione, a: valore },
  ]);
  if (!esito) return { ok: false, errore: "Adempimento non trovato." };

  rinfresca(esito.organizationId, esito.aziendaId, esito.dominio);
  return { ok: true };
}

export async function cambiaPriorita(istanzaId: string, nuova: Priorita): Promise<EsitoModifica> {
  // Permesso in demo: un valore da un elenco chiuso.
  if (!(PRIORITA as readonly string[]).includes(nuova)) return { ok: false, errore: "Priorità sconosciuta." };

  const ctx = await requireConsulente();
  const istanza = await db.query.obligationInstance.findFirst({
    where: and(
      eq(obligationInstance.id, istanzaId),
      eq(obligationInstance.organizationId, ctx.organizationId),
    ),
  });
  if (!istanza) return { ok: false, errore: "Adempimento non trovato." };

  const esito = await modifica(istanzaId, { priorita: nuova }, [
    { campo: "priorita", da: istanza.priorita, a: nuova },
  ]);
  if (!esito) return { ok: false, errore: "Adempimento non trovato." };

  rinfresca(esito.organizationId, esito.aziendaId, esito.dominio);
  return { ok: true };
}

export async function salvaNote(istanzaId: string, note: string): Promise<EsitoModifica> {
  // Bloccata in demo: testo libero, che il visitatore successivo leggerebbe.
  const bloccata = await bloccoDemo("scrivere una nota");
  if (bloccata) return bloccata;

  const ctx = await requireConsulente();
  const istanza = await db.query.obligationInstance.findFirst({
    where: and(
      eq(obligationInstance.id, istanzaId),
      eq(obligationInstance.organizationId, ctx.organizationId),
    ),
  });
  if (!istanza) return { ok: false, errore: "Adempimento non trovato." };

  const valore = note.trim() === "" ? null : note.trim();
  const esito = await modifica(istanzaId, { note: valore }, [{ campo: "note", da: istanza.note, a: valore }]);
  if (!esito) return { ok: false, errore: "Adempimento non trovato." };

  rinfresca(esito.organizationId, esito.aziendaId, esito.dominio);
  return { ok: true };
}

/**
 * Lo storico, esposto come azione perché il pannello di dettaglio lo carica su richiesta.
 *
 * Caricarlo con la pagina significherebbe una query per ognuna delle 171 righe per mostrare
 * qualcosa che si guarda una volta ogni tanto.
 */
export async function storico(istanzaId: string) {
  const { storicoDi } = await import("./dati");
  return storicoDi(istanzaId);
}
