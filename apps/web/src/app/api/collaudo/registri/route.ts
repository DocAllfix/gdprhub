import { and, eq, like } from "drizzle-orm";
import { db } from "@/lib/db";
import { auditLog, registro } from "@/lib/db/schema";
import { requireConsulente } from "@/features/auth/guards";
import { invalidaDati } from "@/lib/cache";
import { soloFuoriProduzione } from "@/lib/solo-sviluppo";

export const dynamic = "force-dynamic";

// LA PROVA SI PORTA VIA IL PROPRIO DISORDINE.
//
// Questa istanza è la vetrina: è la prima cosa che il committente apre. Una prova che
// lascia dodici «Prova automatica 1754…» nel registro delle violazioni gli mostra un
// registro pieno di spazzatura e gli chiede di immaginarsi il prodotto — e si può fare una
// volta sola, perché al secondo giro il registro è illeggibile.
//
// PERCHÉ UNA ROTTA E NON UNA QUERY DIRETTA. Lo script di prova gira contro l'istanza
// online, dove non ha (e non deve avere) le credenziali del database. Passare dall'HTTP
// significa che la cancellazione attraversa gli stessi controlli di tutto il resto:
// sessione, organizzazione, ruolo.
//
// COSA CANCELLA, ESATTAMENTE. Solo le voci il cui titolo comincia con «Prova automatica »,
// e solo nell'organizzazione di chi chiama. Il prefisso è la firma che lo script scrive
// apposta: nessun consulente scrive un titolo così, e se qualcuno lo facesse perderebbe
// una voce che ha chiamato come una prova automatica.
//
// Il registro NON è append-only per vincolo di database, a differenza delle relazioni
// pubblicate: una voce aperta per sbaglio dev'essere ritrattabile, e il registro degli
// eventi conserva comunque la traccia di ogni cancellazione.

const PREFISSO = "Prova automatica ";

export async function POST(richiesta: Request) {
  // Il guard c'e' ed e' corretto. Questo e' un'altra cosa: una rotta che CANCELLA
  // righe, scritta per la prova automatica, non ha ragione di esistere su una
  // macchina venduta — nemmeno protetta.
  soloFuoriProduzione();

  const ctx = await requireConsulente();

  const corpo = await richiesta.json().catch(() => null);
  const aziendaId = typeof corpo?.azienda === "string" ? corpo.azienda : "";
  if (!aziendaId) return Response.json({ errore: "Azienda mancante." }, { status: 400 });

  const cancellate = await db
    .delete(registro)
    .where(
      and(
        eq(registro.organizationId, ctx.organizationId),
        eq(registro.clientCompanyId, aziendaId),
        like(registro.titolo, `${PREFISSO}%`),
      ),
    )
    .returning({ id: registro.id });

  if (cancellate.length > 0) {
    await db.insert(auditLog).values({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      azione: "registro.collaudo.pulizia",
      dettagli: { aziendaId, cancellate: cancellate.length },
    });
    invalidaDati(ctx.organizationId);
  }

  return Response.json({ cancellate: cancellate.length });
}
