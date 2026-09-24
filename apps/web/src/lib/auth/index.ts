import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { organization, twoFactor } from "better-auth/plugins";
import { db, schema } from "@/lib/db";
import { env } from "@/lib/env";
import { accoda } from "@/lib/posta";
import { invito, reimpostaPassword } from "@/lib/posta/modelli";
import { nomeStudio } from "@/lib/posta/studio";
import { PRODOTTO } from "@/lib/brand";

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

// ============================================================================================
// LA DEMO PUBBLICA, SUL LATO CHE `assertNotDemo` NON VEDE _(2026-09-24)_
// ============================================================================================
//
// `assertNotDemo` protegge le nostre server action. Ma password, secondo fattore, profilo e
// sessioni passano dalle API di Better Auth, che le nostre azioni non attraversano: senza
// questo gancio, il primo visitatore della demo poteva cambiare la password dell'utente
// condiviso — o revocarne tutte le sessioni — e chiudere fuori tutti gli altri.
//
// Si blocca solo ciò che MODIFICA un account o la struttura dello studio. Resta aperta la
// verifica del codice TOTP: l'amministratore della vetrina potrebbe averlo attivo, e
// bloccarla lo chiuderebbe fuori dalla sua stessa istanza.
const BLOCCATI_IN_DEMO = new Set([
  "/change-password",
  "/set-password",
  "/reset-password",
  "/request-password-reset",
  "/forget-password",
  "/change-email",
  "/update-user",
  "/delete-user",
  "/revoke-session",
  "/revoke-sessions",
  "/revoke-other-sessions",
  "/sign-up/email",
  "/two-factor/enable",
  "/two-factor/disable",
  "/two-factor/generate-backup-codes",
  "/organization/create",
  "/organization/update",
  "/organization/delete",
  "/organization/invite-member",
  "/organization/accept-invitation",
  "/organization/remove-member",
  "/organization/update-member-role",
  "/organization/leave",
]);

/** Una riga sola per istanza: la modalità si legge solo quando il percorso è fra i bloccati. */
async function istanzaInDemo(): Promise<boolean> {
  const riga = await db.query.instanceConfig.findFirst({ columns: { mode: true } });
  return riga?.mode === "demo";
}

function origini(): string[] {
  const elenco = [env.APP_URL];

  const dominioProduzione = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (dominioProduzione) elenco.push(`https://${dominioProduzione}`);
  if (process.env.VERCEL_URL) elenco.push(`https://${process.env.VERCEL_URL}`);

  if (env.TRUSTED_ORIGINS) {
    elenco.push(
      ...env.TRUSTED_ORIGINS.split(",")
        .map((o) => o.trim())
        .filter(Boolean),
    );
  }

  // In sviluppo la porta cambia a ogni collaudo e nessuno ricorda di aggiornare APP_URL:
  // il carattere jolly vale SOLO qui, e in produzione questo ramo non esiste.
  if (env.NODE_ENV !== "production") {
    elenco.push("http://localhost:*", "http://127.0.0.1:*");
  }

  return [...new Set(elenco)];
}

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema }),

  baseURL: env.APP_URL,
  secret: env.AUTH_SECRET,

  // Better Auth rifiuta con 403 «Invalid origin» tutto ciò che non arriva da `baseURL`, ed
  // è la protezione giusta contro il CSRF: non si disattiva, si dichiarano le eccezioni.
  //
  // Le eccezioni sono reali e sono tre:
  //   1. Su Vercel il dominio di produzione (gdprhub.vercel.app) NON è quello del singolo
  //      deploy, che è ciò che `VERCEL_URL` contiene. Senza questa riga l'accesso sulla
  //      vetrina risponderebbe 403 pur funzionando in locale.
  //   2. Un'istanza dietro Caddy può rispondere su più nomi legittimi.
  //   3. In sviluppo la porta cambia di continuo, e `localhost` e `127.0.0.1` sono origini
  //      diverse per il browser: è così che questo difetto è saltato fuori.
  trustedOrigins: origini(),

  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (!BLOCCATI_IN_DEMO.has(ctx.path)) return;
      if (await istanzaInDemo()) {
        throw new APIError("FORBIDDEN", {
          message: "In modalità dimostrativa questa operazione non è disponibile.",
        });
      }
    }),
  },

  // LIMITATORE, dichiarato invece che ereditato.
  //
  // Better Auth ne ha uno predefinito, ed e' il motivo per cui era facile non accorgersi
  // che mancava: spento in sviluppo, e in produzione cento richieste ogni dieci secondi per
  // indirizzo su QUALUNQUE rotta. Sono seicento tentativi di password al minuto, senza una
  // regola dedicata all'accesso e senza blocco dell'utenza.
  //
  // Aggravante che rendeva l'attacco invisibile: i tentativi falliti non finivano in nessun
  // registro (vedi il gancio piu' sotto, che ora li scrive).
  //
  // `storage: "database"` e non la memoria: sulla vetrina il contatore vive dentro una
  // funzione serverless e si azzera a ogni avvio a freddo, quindi bastava aspettare. In una
  // tabella il conteggio sopravvive al processo.
  rateLimit: {
    enabled: true,
    storage: "database",
    window: 60,
    max: 100,
    customRules: {
      // Dieci tentativi al minuto per indirizzo. Un utente che sbaglia la password tre
      // volte di fila non se ne accorge; un dizionario sì.
      "/sign-in/email": { window: 60, max: 10 },
      // Il secondo fattore ha sei cifre: senza limite si esaurisce lo spazio in poche ore.
      "/two-factor/verify-totp": { window: 60, max: 5 },
      "/two-factor/verify-backup-code": { window: 60, max: 5 },
      // Reimpostare la password manda posta: senza limite diventa un amplificatore di spam
      // a nome del dominio dello studio.
      "/forget-password": { window: 300, max: 3 },
    },
  },

  emailAndPassword: {
    enabled: true,
    // La porta chiusa lato server: non è un pulsante nascosto nell'interfaccia.
    disableSignUp: true,
    minPasswordLength: 12,
    requireEmailVerification: false,

    // IL RECUPERO PASSWORD, che prima non esisteva.
    //
    // Con `disableSignUp: true` nessuno puo' rifarsi un'utenza: senza questa funzione un
    // utente che perde la password resta fuori finche' un amministratore non interviene, e
    // se l'amministratore e' lui, finche' non interveniamo NOI sul database del cliente.
    //
    // La mail si ACCODA e non parte in linea: un timeout del relay non deve far fallire la
    // richiesta lasciando l'utente senza messaggio e senza errore comprensibile.
    sendResetPassword: async ({ user, url }) => {
      const { oggetto, testo } = reimpostaPassword(url, await nomeStudio(), 60);
      await accoda({ a: user.email, oggetto, testo });
    },
    resetPasswordTokenExpiresIn: 60 * 60,
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

      // GLI INVITI, che erano configurati e non si potevano mandare.
      //
      // `invitationExpiresIn` c'era gia', i ruoli erano verificati lato server, ma senza
      // posta non esisteva modo di consegnare l'invito: ogni utenza andava creata da riga
      // di comando sulla VPS del cliente.
      sendInvitationEmail: async (dati) => {
        const url = `${env.APP_URL}/invito/${dati.id}`;
        const { oggetto, testo } = invito(url, await nomeStudio(), dati.role, 7);
        await accoda({ a: dati.email, oggetto, testo, organizationId: dati.organization.id });
      },
    }),
    twoFactor({
      issuer: PRODOTTO.nome,
    }),
  ],
});

export type Auth = typeof auth;
export type Sessione = typeof auth.$Infer.Session;
