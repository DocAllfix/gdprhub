"use server";

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";
import { requireStudio } from "@/features/auth/guards";
import { tourPerChiave } from "@/lib/tour/passi";

// Chi ha visto cosa.
//
// SUL DATABASE E NON IN `localStorage`. Chi apre il prodotto in ufficio e poi da casa non
// deve rivedere l'introduzione, e su un'istanza consegnata è l'unico modo di sapere se il
// cliente ha guardato la guida — che è una domanda che si fa davvero, quando qualcuno dice
// che non riesce a usare qualcosa.
//
// Si registra la VERSIONE vista, non un booleano: se il testo di un tour cambia perché la
// schermata è cambiata, chi l'aveva già visto lo rivede una volta sola. Un booleano
// costringerebbe a scegliere fra non mostrare mai più la novità e rimostrare tutto a tutti.

export async function segnaTourVisto(chiave: string): Promise<void> {
  const ctx = await requireStudio();
  // In demo l'utente è condiviso: il primo visitatore consumerebbe il giro per tutti gli altri.
  if (ctx.mode === "demo") return;
  const tour = tourPerChiave(chiave);
  if (!tour) return;

  const u = await db.query.user.findFirst({
    where: eq(user.id, ctx.userId),
    columns: { tourVisti: true },
  });
  const visti = { ...(u?.tourVisti ?? {}), [chiave]: tour.versione };
  await db.update(user).set({ tourVisti: visti }).where(eq(user.id, ctx.userId));
}

/** I tour già visti dall'utente corrente, con la versione. */
export async function tourVisti(): Promise<Record<string, number>> {
  const ctx = await requireStudio();
  if (ctx.mode === "demo") return {};
  const u = await db.query.user.findFirst({
    where: eq(user.id, ctx.userId),
    columns: { tourVisti: true },
  });
  return u?.tourVisti ?? {};
}
