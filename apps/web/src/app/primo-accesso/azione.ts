"use server";

import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { auditLog, user } from "@/lib/db/schema";
import { bloccoDemo, requireSessione } from "@/features/auth/guards";

// Cambio della password al primo accesso.
//
// Le credenziali iniziali dell'amministratore stanno nel file d'ambiente dell'istanza:
// finché non vengono cambiate, la password è scritta in chiaro su disco su una macchina che
// non controlliamo. Il flag `mustChangePassword` esiste per chiudere quella finestra, e va
// abbassato SOLO dal server dopo che il cambio è riuscito.

export type EsitoCambio = { readonly ok: true } | { readonly ok: false; readonly errore: string };

const LUNGHEZZA_MINIMA = 12;

export async function cambiaPassword(_precedente: EsitoCambio | null, dati: FormData): Promise<EsitoCambio> {
  // L'utente della demo è condiviso da tutti i visitatori: chi gli cambiasse la password
  // chiuderebbe fuori tutti gli altri, per sempre.
  const bloccata = await bloccoDemo("cambiare la password");
  if (bloccata) return bloccata;
  const sessione = await requireSessione();

  const attuale = String(dati.get("attuale") ?? "");
  const nuova = String(dati.get("nuova") ?? "");
  const conferma = String(dati.get("conferma") ?? "");

  if (nuova.length < LUNGHEZZA_MINIMA) {
    return { ok: false, errore: `La nuova password deve avere almeno ${LUNGHEZZA_MINIMA} caratteri.` };
  }
  if (nuova !== conferma) return { ok: false, errore: "Le due password non coincidono." };
  if (nuova === attuale)
    return { ok: false, errore: "La nuova password deve essere diversa da quella attuale." };

  try {
    // È la libreria a verificare la password attuale: qui non si tocca nessun hash.
    await auth.api.changePassword({
      headers: await headers(),
      body: { currentPassword: attuale, newPassword: nuova, revokeOtherSessions: true },
    });
  } catch {
    return { ok: false, errore: "La password attuale non è corretta." };
  }

  await db.update(user).set({ mustChangePassword: false }).where(eq(user.id, sessione.user.id));
  await db.insert(auditLog).values({
    userId: sessione.user.id,
    azione: "password.cambiata",
    entita: "user",
    entitaId: sessione.user.id,
  });

  return { ok: true };
}
