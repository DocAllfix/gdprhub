"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { account, auditLog, invitation, member, user } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { assertNotDemo, requireAdmin, type Ruolo } from "@/features/auth/guards";
import { accoda, postaConfigurata } from "@/lib/posta";
import { invito as modelloInvito } from "@/lib/posta/modelli";
import { nomeStudio } from "@/lib/posta/studio";
import { registra } from "@/lib/audit";

// Creazione e gestione delle utenze dello studio.
//
// NON ESISTE REGISTRAZIONE PUBBLICA: `disableSignUp` chiude la porta lato server e resta
// chiusa. Le utenze le crea un amministratore da qui, ed è per questo che si passa dal
// contesto interno di Better Auth invece che da `signUpEmail` — che rifiuterebbe la
// chiamata, correttamente, anche venendo dal nostro stesso server.
//
// L'hashing resta quello della libreria. Scriverne uno nostro significherebbe che il primo
// accesso non funziona, e si perderebbe tempo a cercare il motivo altrove.

export type EsitoUtente =
  | { readonly ok: true; readonly email: string; readonly password: string }
  // L'INVITO NON HA UNA PASSWORD, ed e' il suo pregio: se la sceglie l'invitato accettando,
  // quindi non passa mai per le mani di chi invita ne' per un canale da custodire. La
  // variante e' separata proprio per non poter scrivere `password: ""` e far credere a chi
  // legge il codice che ce ne sia una.
  | { readonly ok: true; readonly invitato: string }
  | { readonly ok: false; readonly errore: string; readonly valori?: Readonly<Record<string, string>> };

const RUOLI: readonly Ruolo[] = ["admin", "consulente", "viewer"];

/**
 * Durata di un invito.
 *
 * Coincide con `invitationExpiresIn` di Better Auth ed e' scritta qui perche' e' questo
 * codice a fissare la scadenza sulla riga. Una settimana: abbastanza perche' qualcuno in
 * ferie lo veda, abbastanza poco perche' un indirizzo di posta compromesso mesi dopo non
 * apra ancora una porta.
 */
const GIORNI_INVITO = 7;
const LUNGHEZZA_MINIMA = 12;

/** Password leggibile e dettabile al telefono: niente caratteri che si confondono. */
function generaPassword(): string {
  const alfabeto = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const casuali = new Uint32Array(16);
  crypto.getRandomValues(casuali);
  const corpo = [...casuali].map((n) => alfabeto[n % alfabeto.length]).join("");
  return `${corpo.slice(0, 5)}-${corpo.slice(5, 10)}-${corpo.slice(10, 15)}`;
}

export async function creaUtente(_precedente: EsitoUtente | null, dati: FormData): Promise<EsitoUtente> {
  const ctx = await requireAdmin();
  await assertNotDemo("creazione di un'utenza");

  const email = String(dati.get("email") ?? "")
    .trim()
    .toLowerCase();
  const nome = String(dati.get("nome") ?? "").trim();
  const ruoloGrezzo = String(dati.get("ruolo") ?? "consulente");
  const passwordScelta = String(dati.get("password") ?? "").trim();

  const valori = { email, nome, ruolo: ruoloGrezzo };

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { ok: false, errore: "Indirizzo di posta non valido.", valori };
  }
  if (nome.length < 2) return { ok: false, errore: "Il nome è obbligatorio.", valori };
  if (!RUOLI.includes(ruoloGrezzo as Ruolo)) return { ok: false, errore: "Ruolo sconosciuto.", valori };
  if (passwordScelta !== "" && passwordScelta.length < LUNGHEZZA_MINIMA) {
    return { ok: false, errore: `La password deve avere almeno ${LUNGHEZZA_MINIMA} caratteri.`, valori };
  }

  const gia = await db.query.user.findFirst({ where: eq(user.email, email) });
  if (gia) return { ok: false, errore: "Esiste già un'utenza con questo indirizzo.", valori };

  const password = passwordScelta === "" ? generaPassword() : passwordScelta;
  const contesto = await auth.$context;

  const creato = await contesto.internalAdapter.createUser({
    email,
    name: nome,
    emailVerified: true,
    // Sulle istanze vendute il primo accesso impone il cambio; dove l'istanza non lo chiede
    // il flag si scrive comunque, così riaccendendo l'interruttore la protezione torna.
    mustChangePassword: true,
  });

  await contesto.internalAdapter.createAccount({
    userId: creato.id,
    providerId: "credential",
    accountId: creato.id,
    password: await contesto.password.hash(password),
  });

  await db.insert(member).values({
    id: randomUUID(),
    organizationId: ctx.organizationId,
    userId: creato.id,
    role: ruoloGrezzo as Ruolo,
  });

  await db.insert(auditLog).values({
    organizationId: ctx.organizationId,
    userId: ctx.userId,
    azione: "utente.creato",
    entita: "user",
    entitaId: creato.id,
    // La password NON finisce nel registro: un archivio di accessi in chiaro è esattamente
    // ciò che un prodotto di compliance non può permettersi.
    dettagli: { email, ruolo: ruoloGrezzo, cambioForzato: env.RICHIEDI_CAMBIO_PASSWORD },
  });

  revalidatePath("/impostazioni");
  return { ok: true, email, password };
}

export async function cambiaRuolo(_precedente: EsitoUtente | null, dati: FormData): Promise<EsitoUtente> {
  const ctx = await requireAdmin();
  await assertNotDemo("modifica di un'utenza");

  const userId = String(dati.get("userId") ?? "");
  const ruolo = String(dati.get("ruolo") ?? "");
  if (!RUOLI.includes(ruolo as Ruolo)) return { ok: false, errore: "Ruolo sconosciuto." };

  // Un'istanza senza amministratori è un'istanza che nessuno può più configurare, e la si
  // riapre solo dal database. Il controllo sta qui, non nell'interfaccia.
  if (userId === ctx.userId && ruolo !== "admin") {
    const admin = await db.query.member.findMany({
      where: and(eq(member.organizationId, ctx.organizationId), eq(member.role, "admin")),
    });
    if (admin.length <= 1) {
      return { ok: false, errore: "Sei l'unico amministratore: nomina un altro admin prima di declassarti." };
    }
  }

  const appartenenza = await db.query.member.findFirst({
    where: and(eq(member.organizationId, ctx.organizationId), eq(member.userId, userId)),
  });
  if (!appartenenza) return { ok: false, errore: "Utente non trovato in questo studio." };

  await db
    .update(member)
    .set({ role: ruolo as Ruolo })
    .where(eq(member.id, appartenenza.id));
  await db.insert(auditLog).values({
    organizationId: ctx.organizationId,
    userId: ctx.userId,
    azione: "utente.ruolo",
    entita: "user",
    entitaId: userId,
    dettagli: { da: appartenenza.role, a: ruolo },
  });

  revalidatePath("/impostazioni");
  return { ok: true, email: "", password: "" };
}

export async function reimpostaPassword(
  _precedente: EsitoUtente | null,
  dati: FormData,
): Promise<EsitoUtente> {
  const ctx = await requireAdmin();
  await assertNotDemo("reimpostazione di una password");

  const userId = String(dati.get("userId") ?? "");
  const appartenenza = await db.query.member.findFirst({
    where: and(eq(member.organizationId, ctx.organizationId), eq(member.userId, userId)),
  });
  if (!appartenenza) return { ok: false, errore: "Utente non trovato in questo studio." };

  const destinatario = await db.query.user.findFirst({ where: eq(user.id, userId) });
  if (!destinatario) return { ok: false, errore: "Utente non trovato." };

  const password = generaPassword();
  const contesto = await auth.$context;
  await db
    .update(account)
    .set({ password: await contesto.password.hash(password) })
    .where(and(eq(account.userId, userId), eq(account.providerId, "credential")));
  await db.update(user).set({ mustChangePassword: true }).where(eq(user.id, userId));

  await db.insert(auditLog).values({
    organizationId: ctx.organizationId,
    userId: ctx.userId,
    azione: "utente.password-reimpostata",
    entita: "user",
    entitaId: userId,
    dettagli: { email: destinatario.email },
  });

  revalidatePath("/impostazioni");
  return { ok: true, email: destinatario.email, password };
}

/**
 * INVITA UN COLLEGA, invece di creargli un'utenza con una password da consegnare a voce.
 *
 * Chiude la lacuna per cui uno studio con quattro persone doveva chiamarci a ogni assunzione:
 * i ruoli erano verificati lato server e `invitationExpiresIn` era configurato, ma senza
 * posta non c'era modo di consegnare l'invito.
 *
 * La differenza da `creaUtente()` non è di comodità: qui **la password non esiste mai**. Non
 * viene generata, non viene mostrata, non viene consegnata su un canale che nessuno controlla
 * — se la sceglie l'invitato accettando. Una password che non è mai passata per le mani di
 * qualcun altro è una password che non va cambiata al primo accesso.
 *
 * La mail si ACCODA (vedi `lib/posta`): un relay lento non deve far fallire l'invito lasciando
 * l'amministratore senza sapere se è partito.
 */
export async function invitaCollega(_precedente: EsitoUtente | null, dati: FormData): Promise<EsitoUtente> {
  const ctx = await requireAdmin();
  await assertNotDemo("invito di un collega");

  const email = String(dati.get("email") ?? "")
    .trim()
    .toLowerCase();
  const ruoloGrezzo = String(dati.get("ruolo") ?? "consulente");
  const valori = { email, nome: "", ruolo: ruoloGrezzo };

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { ok: false, errore: "Indirizzo di posta non valido.", valori };
  }
  if (!RUOLI.includes(ruoloGrezzo as Ruolo)) {
    return { ok: false, errore: "Ruolo sconosciuto.", valori };
  }

  const gia = await db.query.user.findFirst({ where: eq(user.email, email) });
  if (gia) return { ok: false, errore: "Esiste già un'utenza con questo indirizzo.", valori };

  // SENZA POSTA L'INVITO NON SI MANDA, e va detto subito invece di accodare un messaggio che
  // resterebbe in coda per sempre. Su un'istanza senza relay si crea l'utenza a mano.
  if (!postaConfigurata()) {
    return {
      ok: false,
      errore:
        "Questa istanza non ha un relay di posta configurato: l'invito non potrebbe essere " +
        "consegnato. Crea l'utenza con una password iniziale.",
      valori,
    };
  }

  // L'INVITO SI SCRIVE QUI, e non con `auth.api.createInvitation`.
  //
  // Quell'endpoint conosce i ruoli SUOI — `owner`, `admin`, `member` — e non quelli di
  // questo prodotto, che sono `admin`, `consulente`, `viewer` e vivono in `guards.ts` con la
  // propria gerarchia. Chiamarlo con `consulente` risponde `ROLE_NOT_FOUND`, e l'invito
  // fallirebbe sempre per due ruoli su tre.
  //
  // Il primo tentativo mascherava il disallineamento con un cast a `"admin" | "member"`: il
  // compilatore taceva e la prova lo ha trovato al primo invio. Un cast che mette a tacere
  // un tipo sta quasi sempre nascondendo una differenza vera.
  //
  // Scrivere la riga qui tiene UN SOLO modello di ruoli — quello dell'applicazione — e non
  // toglie niente, perche' anche l'accettazione e' gia' nostra (`/invito/[id]`): di Better
  // Auth serviva solo la tabella, che e' la stessa.
  const idInvito = randomUUID();
  const scadenza = new Date(Date.now() + GIORNI_INVITO * 24 * 60 * 60 * 1000);

  await db.insert(invitation).values({
    id: idInvito,
    organizationId: ctx.organizationId,
    email,
    role: ruoloGrezzo as Ruolo,
    status: "pending",
    expiresAt: scadenza,
    inviterId: ctx.userId,
  });

  const { oggetto, testo } = modelloInvito(
    `${env.APP_URL}/invito/${idInvito}`,
    await nomeStudio(),
    ruoloGrezzo,
    GIORNI_INVITO,
  );
  await accoda({ a: email, oggetto, testo, organizationId: ctx.organizationId });

  await registra({
    organizationId: ctx.organizationId,
    userId: ctx.userId,
    azione: "utente.invitato",
    entita: "invitation",
    dettagli: { email, ruolo: ruoloGrezzo },
  });

  revalidatePath("/impostazioni");
  return { ok: true, invitato: email };
}
