import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { evidence } from "@/lib/db/schema";
import { NonAutenticato, NonAutorizzato, requireStudio } from "@/features/auth/guards";
import { archivioIstanza, improntaSha256 } from "@/lib/storage";

// Lo scaricamento di un'evidenza.
//
// IL FILE NON HA UN URL PUBBLICO. Si passa da qui, e qui si riverifica che il documento
// appartenga allo studio di chi lo chiede: è il punto in cui il confine fra due clienti
// diventa vero. Su un archivio a oggetti il file avrebbe un indirizzo indovinabile, e senza
// questo passaggio conoscerlo basterebbe.
//
// A ogni lettura si RICALCOLA L'IMPRONTA e la si confronta con quella registrata al
// caricamento. Se il documento in archivio è cambiato — corruzione, sostituzione, un
// ripristino andato male — il file non esce e lo si dice. Un'evidenza che si scarica
// diversa da come è stata depositata è peggio di un'evidenza mancante, perché nessuno se ne
// accorge finché non serve.

export const dynamic = "force-dynamic";

export async function GET(_richiesta: Request, contesto: { params: Promise<{ id: string }> }) {
  const { id } = await contesto.params;

  let ctx;
  try {
    ctx = await requireStudio();
  } catch (errore) {
    if (errore instanceof NonAutenticato) return new Response("Non autenticato", { status: 401 });
    if (errore instanceof NonAutorizzato) return new Response("Non autorizzato", { status: 403 });
    throw errore;
  }

  const riga = await db.query.evidence.findFirst({
    where: and(eq(evidence.id, id), eq(evidence.organizationId, ctx.organizationId)),
  });
  // 404 e non 403: a chi non ha diritto di vederlo non si dice nemmeno che esiste.
  if (!riga) return new Response("Non trovata", { status: 404 });

  let dati: Buffer;
  try {
    dati = await archivioIstanza().leggi(riga.storageKey);
  } catch {
    return new Response("Il documento non è più nell'archivio dell'istanza.", { status: 502 });
  }

  if (improntaSha256(dati) !== riga.hashSha256) {
    return new Response(
      "L'impronta del documento non corrisponde a quella registrata al caricamento: " +
        "il file in archivio è stato alterato e non viene consegnato.",
      { status: 409 },
    );
  }

  return new Response(new Uint8Array(dati), {
    headers: {
      "Content-Type": riga.mime,
      "Content-Length": String(dati.length),
      // `attachment` e non `inline`: un PDF aperto dentro la pagina eredita l'origine, e
      // un documento caricato da un cliente non è contenuto di cui ci si fida.
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(riga.nomeFile)}`,
      // Mai in cache condivisa: è un documento di un solo studio.
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
