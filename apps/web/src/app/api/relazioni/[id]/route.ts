import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { instanceConfig } from "@/lib/db/schema";
import { NonAutenticato, NonAutorizzato, requireStudio } from "@/features/auth/guards";
import { registra } from "@/lib/audit";
import { relazione } from "@/features/relazioni/dati";
import { improntaSnapshot } from "@/features/relazioni/snapshot";
import { htmlRelazione } from "@/lib/documenti/relazione";
import { rendiPdf } from "@/lib/pdf";

// Il PDF di una relazione.
//
// IL BINARIO NON SI SALVA, si rigenera dallo snapshot ogni volta. È identico perché lo
// snapshot è identico, e salvarlo significherebbe avere due verità da tenere allineate — il
// JSON e il file — con il rischio che un giorno divergano e nessuno sappia quale sia il
// documento davvero consegnato.
//
// PRIMA DI STAMPARE SI RICONTROLLA L'IMPRONTA. Se lo snapshot sul database non corrisponde
// più all'hash registrato alla generazione, il PDF non esce: significa che qualcuno ha
// scritto sulla riga aggirando il trigger, e stampare un documento manomesso è peggio che
// non stamparne nessuno.

export const dynamic = "force-dynamic";
/** Chromium impiega qualche secondo a freddo. Il valore predefinito lo taglierebbe. */
export const maxDuration = 60;

export async function GET(_richiesta: Request, contesto: { params: Promise<{ id: string }> }) {
  const { id } = await contesto.params;

  let dati;
  try {
    dati = await relazione(id);
  } catch (errore) {
    if (errore instanceof NonAutenticato) return new Response("Non autenticato", { status: 401 });
    if (errore instanceof NonAutorizzato) return new Response("Non autorizzato", { status: 403 });
    throw errore;
  }
  // 404 e non 403: a chi non ha diritto di vederla non si dice nemmeno che esiste.
  if (!dati) return new Response("Non trovata", { status: 404 });

  const { riga, snapshot } = dati;

  if (improntaSnapshot(snapshot) !== riga.hashSnapshot) {
    return new Response(
      "Il contenuto della relazione non corrisponde all'impronta registrata alla generazione: " +
        "la riga è stata alterata e il documento non viene prodotto.",
      { status: 409 },
    );
  }

  const cfg = await db.query.instanceConfig.findFirst({
    where: eq(instanceConfig.organizationId, riga.organizationId),
    columns: { brandNome: true },
  });

  const html = htmlRelazione(snapshot, {
    studio: cfg?.brandNome ?? "Studio",
    numero: riga.numero,
    impronta: riga.hashSnapshot,
  });
  const pdf = await rendiPdf(html);

  const nome = `relazione-${riga.numero}-${snapshot.azienda.nome
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .toLowerCase()
    .replace(/^-|-$/g, "")}.pdf`;

  // OGNI USCITA DI DATI LASCIA UNA RIGA (vedi `api/evidenze`): il registro copriva le
  // mutazioni e nessuna lettura, quindi un'esfiltrazione non lasciava traccia.
  const ctx = await requireStudio();
  await registra({
    organizationId: ctx.organizationId,
    userId: ctx.userId,
    azione: "relazione.scarica",
    entita: "report",
    entitaId: id,
    dettagli: { numero: riga.numero, stato: riga.stato },
  });

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(pdf.length),
      // Una bozza si guarda nel browser, un atto pubblicato si scarica e si archivia.
      "Content-Disposition": `${riga.stato === "pubblicata" ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(nome)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
