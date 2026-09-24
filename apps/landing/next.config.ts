import type { NextConfig } from "next";

// LA CSP DELLA LANDING, E PERCHÉ NON HA UN NONCE (docs/07 §3.6).
//
// Il prodotto usa un nonce per richiesta, ed è la scelta giusta per lui: ogni pagina è resa al
// momento. La landing no: le pagine sono statiche, costruite una volta e servite dalla CDN, e
// un nonce nasce per richiesta. Non c'è una richiesta in cui nascere.
//
// Le pagine di Next contengono script inline — il payload RSC, `self.__next_f.push(...)` — il cui
// contenuto cambia a ogni build. Una CSP a hash richiederebbe di calcolarli DOPO la build e
// di consegnarli in un'intestazione che Vercel legge PRIMA: non c'è un punto della catena in
// cui farlo senza aggirare il costruttore di Next. Quindi `'unsafe-inline'` sugli script, e
// ogni altra direttiva stretta.
//
// Il rischio residuo, scritto: `'unsafe-inline'` apre la strada a un XSS se la pagina
// rendesse contenuto controllato da un utente. Non ne rende nessuno: niente sessioni, niente
// cookie, niente parametri riflessi nell'HTML (il motivo del modulo si legge lato client e
// sceglie fra tre valori fissi). La difesa che resta vera è tutto il resto dell'elenco.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "upgrade-insecure-requests",
].join("; ");

const nextConfig: NextConfig = {
  // Motore e componenti condivisi sono sorgente TypeScript del workspace.
  transpilePackages: ["@gdpr/engine", "@gdpr/ui"],
  poweredByHeader: false,

  async headers() {
    // In sviluppo React ha bisogno di `eval` per il ricaricamento a caldo: la CSP si prova su
    // `next build && next start`, che è ciò che gira in produzione.
    if (process.env.NODE_ENV !== "production") return [];
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: CSP },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
