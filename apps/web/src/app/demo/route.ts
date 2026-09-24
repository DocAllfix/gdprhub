import { auth } from "@/lib/auth";
import { istanzaDemo, sessioniDemoRecenti } from "@/lib/db/demo";
import { env } from "@/lib/env";

// L'INGRESSO CON UN CLIC NELLA DEMO PUBBLICA _(docs/07 §5)_.
//
// La landing porta qui con «Entra nella demo». Si apre una sessione sull'utente dimostrativo e
// si entra nel cruscotto, senza digitare niente: un pulsante che promette la demo e sbatte
// contro un login senza credenziali è peggio di nessun pulsante.
//
// Esiste solo sulla vetrina in modalità demo. Su un'istanza venduta risponde 404 — non 403,
// che confermerebbe l'esistenza della rotta.

const TETTO_AL_MINUTO = 60;

export async function GET(richiesta: Request) {
  if (!env.DEMO_EMAIL || !env.DEMO_PASSWORD || !(await istanzaDemo())) {
    return new Response("Non trovato", { status: 404 });
  }

  // Ogni ingresso apre una sessione, cioè una riga. Un tetto globale basta a impedire che un
  // programma in ciclo riempia la tabella; le persone vere non arrivano a sessanta al minuto.
  if ((await sessioniDemoRecenti()) >= TETTO_AL_MINUTO) {
    return new Response("Troppi ingressi in questo minuto. Riprovate fra poco.", {
      status: 429,
      headers: { "retry-after": "60", "content-type": "text/plain; charset=utf-8" },
    });
  }

  const risposta = await auth.api.signInEmail({
    body: { email: env.DEMO_EMAIL, password: env.DEMO_PASSWORD },
    // Solo ciò che serve, NON le intestazioni in arrivo: conterrebbero il Referer della landing
    // (legisboard.eu), che non è un'origine fidata del prodotto, e il controllo anti-CSRF di
    // Better Auth rifiuterebbe l'accesso. Qui la richiesta la fa il server a se stesso.
    headers: new Headers({
      "user-agent": richiesta.headers.get("user-agent") ?? "",
      "x-forwarded-for": richiesta.headers.get("x-forwarded-for") ?? "",
    }),
    asResponse: true,
  });
  if (!risposta.ok) {
    return new Response("La demo non è raggiungibile in questo momento.", {
      status: 503,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  // Si inoltrano i cookie di sessione e si entra nel cruscotto con il giro guidato.
  const destinazione = new URL("/cruscotto?giro=1", richiesta.url);
  const uscita = new Response(null, { status: 303, headers: { location: destinazione.toString() } });
  for (const cookie of risposta.headers.getSetCookie()) uscita.headers.append("set-cookie", cookie);
  return uscita;
}
