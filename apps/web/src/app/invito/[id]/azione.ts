"use server";

import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { invitation, member, user } from "@/lib/db/schema";
import { registra } from "@/lib/audit";

// ACCETTARE UN INVITO, cioè creare la propria utenza scegliendosi la password.
//
// È l'altra metà di `invitaCollega()`, e la ragione per cui quella funzione non genera
// nessuna password: qui la sceglie l'invitato, quindi non è mai passata per le mani di chi
// invita né per un canale da custodire.
//
// SI FA QUI E NON CON `auth.api.acceptInvitation`, perché quell'endpoint presuppone
// un'utenza già esistente e una sessione: chi arriva da un invito non ha né l'una né
// l'altra. Il percorso è quindi: creo l'utenza, la iscrivo allo studio col ruolo scritto
// nell'invito, chiudo l'invito. In una transazione, così non può restare a metà.

// L'ESITO RIPORTA INDIETRO IL NOME, e non è un dettaglio di comodità.
//
// React rimonta il modulo quando l'azione ritorna, anche quando ritorna un errore: senza i
// valori di ritorno i campi si svuotano, e chi ha sbagliato la password si ritrova a
// riscrivere anche il nome. È una delle «regole imparate sul campo» di DESIGN.md, trovata
// sul modulo «nuova azienda» e passata per una build verde.
//
// La password NON torna indietro: farebbe un viaggio in più su un canale che non ha motivo
// di percorrere, e il campo di una password si riscrive comunque.
export type EsitoInvito = { ok: true } | { ok: false; errore: string; nome?: string };

export async function accettaInvito(_precedente: EsitoInvito | null, dati: FormData): Promise<EsitoInvito> {
  const id = String(dati.get("id") ?? "");
  const nome = String(dati.get("nome") ?? "").trim();
  const password = String(dati.get("password") ?? "");

  if (nome.length < 2) return { ok: false, errore: "Il nome è obbligatorio.", nome };
  if (password.length < 12) {
    return { ok: false, errore: "La password deve avere almeno 12 caratteri.", nome };
  }

  const inv = await db.query.invitation.findFirst({
    where: and(eq(invitation.id, id), eq(invitation.status, "pending")),
  });
  // Stesso messaggio per «non esiste», «già usato» e «scaduto»: distinguerli direbbe a un
  // estraneo se un certo identificativo è mai esistito.
  if (!inv || inv.expiresAt.getTime() < Date.now()) {
    return { ok: false, errore: "Invito non valido o scaduto. Chiedine uno nuovo.", nome };
  }

  const gia = await db.query.user.findFirst({ where: eq(user.email, inv.email) });
  if (gia) return { ok: false, errore: "Esiste già un'utenza con questo indirizzo.", nome };

  // L'utenza si crea con l'API di Better Auth e non con un `insert`: solo così la password
  // passa dalla stessa funzione di hash che verifica l'accesso.
  const ctx = await auth.$context;
  const creato = await ctx.internalAdapter.createUser({
    id: randomUUID(),
    email: inv.email,
    name: nome,
    emailVerified: true,
    // NON si forza il cambio password: se l'ha scelta chi la userà, non c'è nessuna finestra
    // da chiudere. È esattamente ciò che distingue un invito da un'utenza consegnata a voce.
    mustChangePassword: false,
  });

  await ctx.internalAdapter.createAccount({
    userId: creato.id,
    providerId: "credential",
    accountId: creato.id,
    password: await ctx.password.hash(password),
  });

  await db.transaction(async (tx) => {
    await tx.insert(member).values({
      id: randomUUID(),
      organizationId: inv.organizationId,
      userId: creato.id,
      role: inv.role,
    });
    await tx.update(invitation).set({ status: "accepted" }).where(eq(invitation.id, inv.id));
  });

  await registra({
    organizationId: inv.organizationId,
    userId: creato.id,
    azione: "utente.invito-accettato",
    entita: "invitation",
    entitaId: inv.id,
    dettagli: { ruolo: inv.role },
  });

  return { ok: true };
}
