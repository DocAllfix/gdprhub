import nodemailer from "nodemailer";
import { z } from "zod";
import { RICHIESTE_ATTIVE } from "@/lib/sito";

// L'unica rotta dinamica della landing: riceve il modulo e lo inoltra per email.
//
// Usa la STESSA convenzione `SMTP_*` del prodotto: un relay solo per inviti e richieste.
// Senza relay, o con il modulo spento, risponde 503 e lo dice. Non si finge mai un invio.

const Richiesta = z.object({
  motivo: z.enum(["presentazione", "appuntamento", "acquisto"]),
  nome: z.string().trim().min(2).max(120),
  email: z.email().max(200),
  studio: z.string().trim().min(2).max(200),
  ruolo: z.string().trim().min(2).max(60),
  messaggio: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .refine((m) => !m || !/https?:\/\/|www\./i.test(m), "Il messaggio non può contenere collegamenti."),
  sito: z.string().max(0).optional(), // la trappola: deve restare vuota
  trascorsi: z.number().min(3000), // sotto tre secondi non scrive una persona
});

const rifiuto = (errore: string, stato: number) => Response.json({ errore }, { status: stato });

export async function POST(richiesta: Request) {
  if (!RICHIESTE_ATTIVE) return rifiuto("Il modulo non è attivo.", 503);

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_MITTENTE, RICHIESTE_DESTINATARIO } = process.env;
  if (!SMTP_HOST || !SMTP_MITTENTE || !RICHIESTE_DESTINATARIO) {
    return rifiuto("La posta non è configurata: la richiesta non può partire.", 503);
  }

  const esito = Richiesta.safeParse(await richiesta.json().catch(() => null));
  if (!esito.success) {
    // A una trappola scattata si risponde come a un successo: chi la fa scattare è un
    // programma, e dirgli che è stato scoperto gli insegna a non farla scattare.
    const trappola = esito.error.issues.some((i) => i.path[0] === "sito" || i.path[0] === "trascorsi");
    if (trappola) return new Response(null, { status: 204 });
    return rifiuto(esito.error.issues[0]?.message ?? "Controllate i campi.", 400);
  }
  const d = esito.data;

  const trasporto = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT ?? 587),
    auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASSWORD } : undefined,
  });

  try {
    await trasporto.sendMail({
      from: SMTP_MITTENTE,
      to: RICHIESTE_DESTINATARIO,
      replyTo: d.email,
      subject: `Legisboard · ${d.motivo} · ${d.studio}`,
      text: [
        `Motivo: ${d.motivo}`,
        `Nome: ${d.nome}`,
        `Email: ${d.email}`,
        `Studio: ${d.studio}`,
        `Ruolo: ${d.ruolo}`,
        "",
        d.messaggio || "(nessun messaggio)",
      ].join("\n"),
    });
  } catch {
    // Il messaggio d'errore del relay può contenere indirizzi e nomi di host: non si restituisce.
    return rifiuto("Il servizio di posta non ha accettato la richiesta. Riprovate fra qualche minuto.", 502);
  }
  return new Response(null, { status: 204 });
}
