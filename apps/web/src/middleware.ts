import { NextResponse, type NextRequest } from "next/server";

// LE INTESTAZIONI DI SICUREZZA, DOVE VALGONO PER TUTTI E DUE GLI AMBIENTI.
//
// Il `Caddyfile` le impostava già, e bene — ma Caddy esiste solo sulle istanze vendute.
// Sulla VETRINA, che gira su Vercel e che è la prima cosa che un cliente apre, non c'era
// niente: né HSTS, né `X-Frame-Options`, né `nosniff`. Il modulo di accesso era inquadrabile
// in un iframe da chiunque.
//
// Metterle qui significa che valgono in entrambi gli ambienti e che non possono divergere:
// un solo posto da cambiare, e la vetrina non resta indietro rispetto alla produzione.
// Caddy continua a impostare le sue — la sua direttiva `header` sostituisce invece di
// accodare, quindi non si duplicano — e resta come difesa di riserva per le risposte che
// non arrivano dall'applicazione, come una sua pagina d'errore.
//
// LA CSP NON C'ERA DA NESSUNA PARTE, ed è l'unica intestazione che questo file aggiunge
// davvero invece di replicarla. Il progetto di riferimento ce l'ha e qui mancava, mentre il
// controllo `intestazioni-sicurezza.sh` non la cercava nemmeno: una lacuna che nessuno dei
// due strumenti poteva segnalare.
//
// PERCHÉ IL NONCE E NON `'unsafe-inline'`.
//
// Una CSP con `'unsafe-inline'` negli script è una CSP che non protegge dall'XSS, cioè da
// ciò per cui esiste: dichiararla darebbe una riga verde nel controllo e nessuna difesa in
// più. Il nonce costa un valore casuale per richiesta e protegge davvero.
//
// È praticabile qui per un motivo preciso e verificato: in produzione l'applicazione ha UN
// SOLO script inline, quello del tema in `layout.tsx`. Gli altri sei `dangerouslySetInnerHTML`
// del progetto stanno sotto `/varianti`, che da questa fase non esiste più in produzione.
// Next aggiunge da sé il nonce ai propri script di idratazione quando lo trova nella CSP,
// quindi non c'è altro da annotare a mano.
//
// `strict-dynamic` lascia che uno script già fidato ne carichi altri: senza, i pezzi che
// Next carica dopo il primo render verrebbero bloccati.
//
// Il costo è che la risposta non è più memorizzabile in una cache condivisa. Qui non cambia
// niente: il `Caddyfile` impone già `private, no-store` su tutto il dinamico, perché una
// pagina di assessment in una cache condivisa sarebbe il dato di un cliente servito a un
// altro.

function nonce(): string {
  const byte = new Uint8Array(16);
  crypto.getRandomValues(byte);
  return btoa(String.fromCharCode(...byte));
}

export function middleware(richiesta: NextRequest) {
  const n = nonce();

  // `upgrade-insecure-requests` non è ridondante con HSTS: HSTS vale per il documento,
  // questa direttiva riscrive anche le risorse interne rimaste in chiaro per distrazione.
  //
  // `frame-ancestors 'none'` è la versione moderna di `X-Frame-Options`, e vale per i
  // browser che leggono la seconda invece della prima: si dichiarano entrambe.
  //
  // `img-src` ammette `data:` perché i documenti incorporano i grafici come URI dati.
  // IN SVILUPPO LA POLITICA SI ALLENTA, e senza questo ramo `next dev` NON FUNZIONA.
  //
  // È un difetto che ho introdotto io e che si è visto solo quando un'altra sessione ha
  // provato a lavorare sull'interfaccia: la ricarica a caldo di React usa `eval`, quindi
  // `script-src` senza `'unsafe-eval'` la blocca, la stretta di mano HMR fallisce, e la
  // console si riempie di «eval() is not supported» a ogni caricamento.
  //
  // COME È SFUGGITO: avevo verificato la CSP sull'istanza di PRODUZIONE — ventuno script,
  // zero senza nonce, nove intestazioni su nove — e mai con `next dev`. Una cosa verificata
  // in un modo e rotta nell'altro è la famiglia B del registro dei guasti, e ci sono
  // ricascato scrivendo proprio la difesa che doveva essere verificata due volte.
  //
  // L'allentamento vale SOLO fuori produzione. In produzione `NODE_ENV` è `production` e
  // questo ramo non esiste: nessuna `'unsafe-eval'` raggiunge mai un cliente.
  const sviluppo = process.env.NODE_ENV !== "production";

  const csp = [
    "default-src 'self'",
    sviluppo
      ? // `'unsafe-eval'` per la ricarica a caldo; il nonce resta, così lo script del tema
        // si comporta in sviluppo come in produzione e non si scopre la differenza tardi.
        `script-src 'self' 'unsafe-eval' 'unsafe-inline' 'nonce-${n}'`
      : `script-src 'self' 'nonce-${n}' 'strict-dynamic'`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    // In sviluppo il canale HMR è un WebSocket verso lo stesso host.
    sviluppo ? "connect-src 'self' ws: wss:" : "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    // `upgrade-insecure-requests` su `http://localhost` riscriverebbe tutto in https e
    // romperebbe lo sviluppo: vale solo dove c'è già TLS.
    ...(sviluppo ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");

  // Il nonce viaggia in una intestazione della RICHIESTA perché `layout.tsx` lo legge da lì
  // per il proprio script: è il canale che Next mette a disposizione fra middleware e
  // componenti server.
  const intestazioniRichiesta = new Headers(richiesta.headers);
  intestazioniRichiesta.set("x-nonce", n);

  const risposta = NextResponse.next({ request: { headers: intestazioniRichiesta } });

  risposta.headers.set("Content-Security-Policy", csp);
  risposta.headers.set("X-Content-Type-Options", "nosniff");
  risposta.headers.set("X-Frame-Options", "DENY");
  risposta.headers.set("Referrer-Policy", "same-origin");
  risposta.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  risposta.headers.set(
    "Permissions-Policy",
    "geolocation=(), camera=(), microphone=(), payment=(), interest-cohort=()",
  );
  // HSTS solo dove la connessione è già cifrata: dichiararlo in chiaro non ha effetto e in
  // sviluppo su `http://localhost` bloccherebbe il browser per due anni.
  if (richiesta.nextUrl.protocol === "https:") {
    risposta.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  }

  return risposta;
}

// I file con impronta nel nome non hanno bisogno di nonce né di intestazioni, e farli
// passare di qui costerebbe un'esecuzione del middleware per ogni immagine e ogni foglio di
// stile. `favicon.ico` e le rotte di Next interne restano fuori per la stessa ragione.
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
