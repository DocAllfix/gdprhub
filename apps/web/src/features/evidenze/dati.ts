import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { evidence, user } from "@/lib/db/schema";
import { requireStudio } from "@/features/auth/guards";
import type { Evidenza } from "./tipi";


/**
 * Le evidenze di un adempimento, dalla più recente.
 *
 * La clausola porta sempre l'organizzazione, anche se l'identificativo dell'istanza è già
 * stato verificato a monte: il costo è nullo e toglie di mezzo la classe di errori in cui
 * un giorno qualcuno chiama questa funzione da un posto nuovo dimenticandosi il controllo.
 */
export async function evidenzeDi(istanzaId: string): Promise<readonly Evidenza[]> {
  const ctx = await requireStudio();
  const righe = await db
    .select({
      id: evidence.id,
      nomeFile: evidence.nomeFile,
      mime: evidence.mime,
      dimensione: evidence.dimensione,
      hashSha256: evidence.hashSha256,
      versione: evidence.versione,
      validoDal: evidence.validoDal,
      validoAl: evidence.validoAl,
      caricatoIl: evidence.caricatoIl,
      caricatoDa: user.name,
    })
    .from(evidence)
    .leftJoin(user, eq(evidence.caricatoDa, user.id))
    .where(
      and(eq(evidence.obligationInstanceId, istanzaId), eq(evidence.organizationId, ctx.organizationId)),
    )
    .orderBy(desc(evidence.versione));
  return righe;
}

export type { Evidenza } from "./tipi";
export { pesoLeggibile } from "./tipi";
