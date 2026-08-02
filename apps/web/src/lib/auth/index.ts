import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { organization, twoFactor } from "better-auth/plugins";
import { db, schema } from "@/lib/db";
import { env } from "@/lib/env";

// Autenticazione dell'istanza.
//
// Tre scelte che discendono dal modello di distribuzione, non da preferenze:
//
// 1. NESSUNA REGISTRAZIONE PUBBLICA. L'istanza è venduta, non sottoscritta: gli utenti li
//    crea l'amministratore. `disableSignUp` chiude la porta lato server, così non basta
//    conoscere l'URL dell'endpoint per entrare.
//
// 2. SECONDO FATTORE. L'istanza contiene le evidenze di compliance di aziende terze: è il
//    genere di archivio per cui una password sola non basta.
//
// 3. UN SOLO STUDIO per istanza. Il plugin `organization` regala inviti, membri e ruoli
//    senza codice, e tenerlo anche con una sola organizzazione è ciò che rende reversibile
//    la scelta di non usare RLS: il giorno che servisse un'istanza condivisa, la struttura
//    c'è già.

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema }),

  baseURL: env.APP_URL,
  secret: env.AUTH_SECRET,

  emailAndPassword: {
    enabled: true,
    // La porta chiusa lato server: non è un pulsante nascosto nell'interfaccia.
    disableSignUp: true,
    minPasswordLength: 12,
    requireEmailVerification: false,
  },

  user: {
    additionalFields: {
      // Le credenziali iniziali dell'amministratore arrivano dall'onboarding dell'istanza:
      // vanno cambiate al primo accesso, e il flag lo impone all'applicazione.
      mustChangePassword: { type: "boolean", defaultValue: false, input: false },
    },
  },

  session: {
    expiresIn: 60 * 60 * 8, // otto ore: una giornata di lavoro, non un mese
    updateAge: 60 * 60,
    cookieCache: { enabled: true, maxAge: 60 * 5 },
  },

  advanced: {
    // I cookie di sessione restano HttpOnly e SameSite: nessun token in localStorage.
    useSecureCookies: env.NODE_ENV === "production",
  },

  plugins: [
    organization({
      // Lo studio lo crea l'onboarding dell'istanza, non l'utente. In un prodotto venduto
      // per istanza, un utente che crea una seconda organizzazione è un errore, non una
      // funzione.
      allowUserToCreateOrganization: false,
      organizationLimit: 1,
      membershipLimit: 50,
      invitationExpiresIn: 60 * 60 * 24 * 7,
    }),
    twoFactor({
      issuer: "Suite Compliance",
    }),
  ],
});

export type Auth = typeof auth;
export type Sessione = typeof auth.$Infer.Session;
