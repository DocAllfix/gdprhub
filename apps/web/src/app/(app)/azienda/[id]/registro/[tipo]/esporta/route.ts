import { registroPerTipo } from "@gdpr/engine";
import { registroDi } from "@/features/registri/dati";

// L'ESPORTAZIONE DEL REGISTRO.
//
// Il registro dei trattamenti è il primo documento che il Garante chiede, e lo chiede in
// una forma che si possa leggere fuori da questo prodotto: l'art. 30.3 dice «in forma
// scritta, anche in formato elettronico». Un'applicazione che tiene il registro e non sa
// consegnarlo lascia il lavoro a metà.
//
// Vale per tutti e undici i registri, non solo per il RoPA: le colonne si costruiscono
// dalla definizione del motore, quindi un registro nuovo si esporta senza scrivere altro.

// SENZA QUESTA RIGA LA BUILD FALLISCE, e non sulla mia macchina.
//
// Next tratta un `GET` come statico finché non vede il contrario, e per deciderlo carica
// il modulo in fase di compilazione: qui la catena arriva a `@/lib/db`, che valida
// `DATABASE_URL` e `AUTH_SECRET`. In locale quelle variabili ci sono e la build passava;
// sulla CI non ci sono, e la build è morta con «Failed to collect page data». Ogni altra
// rotta del progetto lo dichiara — questa era l'unica che me n'ero dimenticato.
export const dynamic = "force-dynamic";

const CSV_BOM = "﻿"; // Excel in italiano legge l'UTF-8 solo se glielo si dichiara.

/** Una cella CSV. Il punto e virgola è il separatore che Excel italiano si aspetta. */
function cella(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = typeof v === "boolean" ? (v ? "sì" : "no") : String(v);
  return /[";\n\r]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
}

const dataIt = (d: Date | null) =>
  d ? d.toLocaleString("it-IT", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Rome" }) : "";

export async function GET(
  _richiesta: Request,
  { params }: { params: Promise<{ id: string; tipo: string }> },
) {
  const { id, tipo } = await params;
  if (!registroPerTipo(tipo)) return new Response("Registro non riconosciuto.", { status: 404 });

  // `registroDi` applica il guard e filtra per organizzazione: senza sessione o su
  // un'azienda di un altro studio non c'è risposta, e questa rotta non è un'eccezione.
  const dati = await registroDi(id, tipo);
  if (!dati) return new Response("Non trovato.", { status: 404 });

  const { azienda, def, voci } = dati;

  const intestazioni = [
    "N.",
    def.etichettaData,
    "Oggetto",
    "Descrizione",
    ...def.campi.map((c) => c.etichetta),
    "Stato",
    "Assolto il",
    "Esito",
    "Termine",
  ];

  const righe = voci.map((v) => [
    v.numero,
    dataIt(v.conosciutoIl),
    v.titolo,
    v.descrizione,
    ...def.campi.map((c) => v.dettagli[c.chiave]),
    v.stato,
    dataIt(v.assoltoIl),
    v.esito,
    v.termine.descrizione,
  ]);

  const corpo = CSV_BOM + [intestazioni, ...righe].map((r) => r.map(cella).join(";")).join("\r\n") + "\r\n";

  const nome = `${azienda.nome} - ${def.nome} - ${new Date().toISOString().slice(0, 10)}.csv`.replaceAll(
    /[^\p{L}\p{N} .\-]/gu,
    "",
  );

  return new Response(corpo, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${nome}"`,
      // Un registro esportato non si mette in cache: cambia a ogni voce aperta.
      "cache-control": "no-store",
    },
  });
}
