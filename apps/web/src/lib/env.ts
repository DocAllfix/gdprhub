import { z } from "zod";

// Configurazione dell'istanza, validata una volta all'avvio.
//
// Regola: nessun `process.env.X` sparso nel codice. Se manca una variabile obbligatoria,
// l'applicazione deve rifiutarsi di partire con un messaggio comprensibile, non fallire
// più tardi con un errore oscuro nel mezzo di un'operazione dell'utente.
//
// Le variabili che cambiano fra vetrina (Vercel) e produzione (Docker + Caddy) sono
// SOLO i due selettori di driver: tutto il resto del codice non sa dove sta girando.

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  /** URL pubblico dell'istanza. Better Auth lo legge all'avvio (Fase 3). */
  APP_URL: z.url().default("http://localhost:3000"),

  /**
   * Origini aggiuntive ammesse all'autenticazione, separate da virgola.
   *
   * Better Auth rifiuta con 403 «Invalid origin» ogni richiesta che non arrivi da
   * `APP_URL`: è la protezione contro il CSRF e va tenuta. Ma un'istanza dietro Caddy può
   * rispondere legittimamente su più nomi — il dominio dello studio e il sottodominio di
   * servizio — e su Vercel il dominio di produzione non coincide con quello del singolo
   * deploy. Quelle sono eccezioni da DICHIARARE, non da disattivare.
   */
  TRUSTED_ORIGINS: z.string().optional(),

  /**
   * Postgres, una stringa sola: su Vercel la inietta l'integrazione Neon (region EU), in
   * produzione arriva dal container dello stack. Serve sia al runtime sia alle migrazioni.
   */
  DATABASE_URL: z.string().min(1).optional(),

  /**
   * Segreto delle sessioni. In sviluppo ha un valore riconoscibile e innocuo; in produzione
   * è obbligatorio e lungo, e l'istanza si rifiuta di partire senza (vedi il controllo in
   * fondo al file). Si genera con `openssl rand -hex 32`.
   */
  AUTH_SECRET: z.string().min(32).default("sviluppo-non-usare-in-produzione-0000000000000000"),

  /**
   * Amministratore iniziale, creato al primo avvio dell'istanza.
   * Le credenziali si consegnano al referente su canale sicuro e al primo accesso il cambio
   * password e il secondo fattore sono forzati.
   */
  ADMIN_EMAIL: z.email().optional(),
  ADMIN_PASSWORD: z.string().min(12).optional(),
  ADMIN_NOME: z.string().default("Amministratore"),
  /** Nome dello studio proprietario dell'istanza. */
  STUDIO_NOME: z.string().default("Studio"),

  /**
   * Dove finiscono le evidenze documentali.
   *   blob → Vercel Blob (vetrina)
   *   fs   → volume locale (produzione per istanza)
   */
  STORAGE_DRIVER: z.enum(["blob", "fs"]).default("fs"),
  /** Radice del volume quando STORAGE_DRIVER=fs. */
  STORAGE_FS_ROOT: z.string().default("./.dati/evidenze"),

  /**
   * Come si rende il PDF.
   *   serverless → @sparticuz/chromium (Vercel)
   *   local      → Chromium di sistema o di Playwright (produzione, sviluppo)
   */
  PDF_DRIVER: z.enum(["serverless", "local"]).default("local"),
  /** Percorso esplicito dell'eseguibile Chromium quando PDF_DRIVER=local. */
  PDF_CHROMIUM_PATH: z.string().optional(),

  /**
   * Telemetria degli errori. Spenta di default: un'istanza che manda tracce a un servizio
   * esterno fa uscire dati dal server del cliente, e in un prodotto GDPR va dichiarato.
   */
  SENTRY_DSN: z.string().optional(),
});

/**
 * Su Vercel il filesystem è effimero e Chromium di sistema non esiste: i due driver
 * DEVONO essere quelli serverless. Invece di pretendere che qualcuno lo configuri a mano
 * (e scoprire l'errore al primo PDF generato), l'istanza riconosce da sé dove sta girando.
 *
 * Resta comunque sovrascrivibile: un valore esplicito nell'ambiente ha sempre la meglio.
 */
type Ambiente = Record<string, string | undefined>;

export function predefinitiDellAmbiente(ambiente: Ambiente): Ambiente {
  if (ambiente.VERCEL !== "1") return ambiente;
  return {
    ...ambiente,
    STORAGE_DRIVER: ambiente.STORAGE_DRIVER ?? "blob",
    PDF_DRIVER: ambiente.PDF_DRIVER ?? "serverless",
    APP_URL: ambiente.APP_URL ?? (ambiente.VERCEL_URL ? `https://${ambiente.VERCEL_URL}` : undefined),
  };
}

const analisi = schema.safeParse(predefinitiDellAmbiente(process.env));

if (!analisi.success) {
  const dettagli = analisi.error.issues
    .map((i) => `  ${i.path.join(".") || "(radice)"}: ${i.message}`)
    .join("\n");
  throw new Error(
    `Configurazione dell'istanza non valida:\n${dettagli}\n\nControlla il file .env (vedi .env.example).`,
  );
}

export const env = analisi.data;
export type Env = typeof env;

/**
 * Controlli che valgono solo in produzione.
 *
 * Il segreto di sviluppo è comodo perché fa partire l'istanza senza configurare nulla, ma è
 * pubblico: sta nel repository. Se finisse in produzione, chiunque legga questo file
 * potrebbe forgiare una sessione valida. Meglio che l'istanza si rifiuti di partire.
 */
if (env.NODE_ENV === "production") {
  const mancanti: string[] = [];
  if (env.AUTH_SECRET.startsWith("sviluppo-")) mancanti.push("AUTH_SECRET (è ancora quello di sviluppo)");
  if (!env.DATABASE_URL) mancanti.push("DATABASE_URL");
  if (mancanti.length) {
    throw new Error(
      `L'istanza non può partire in produzione:\n  - ${mancanti.join("\n  - ")}\n\n` +
        "Genera il segreto con `openssl rand -hex 32` e mettilo in .env.prod.",
    );
  }
}

/** Vero quando l'istanza gira su un ambiente effimero senza filesystem persistente. */
export const isVetrinaServerless = env.STORAGE_DRIVER === "blob" || env.PDF_DRIVER === "serverless";
