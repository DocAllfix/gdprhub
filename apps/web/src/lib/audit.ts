import { db } from "@/lib/db";
import { auditLog } from "@/lib/db/schema";

// Registro delle azioni. Append-only imposto dal database: qui si può solo aggiungere.
//
// Regola operativa: ogni mutazione di dominio scrive una riga. Non è burocrazia, è ciò che
// rende la conformità dimostrabile — e in un'ispezione la domanda «chi ha chiuso questo
// adempimento e quando» arriva sempre.

export type VoceAudit = {
  readonly organizationId: string | null;
  readonly userId: string | null;
  /** Verbo puntuale: `azienda.crea`, `adempimento.completa`, `relazione.pubblica`. */
  readonly azione: string;
  readonly entita?: string;
  readonly entitaId?: string;
  readonly dettagli?: Record<string, unknown>;
};

export async function registra(v: VoceAudit): Promise<void> {
  await db.insert(auditLog).values({
    organizationId: v.organizationId,
    userId: v.userId,
    azione: v.azione,
    entita: v.entita ?? null,
    entitaId: v.entitaId ?? null,
    dettagli: v.dettagli ?? null,
  });
}
