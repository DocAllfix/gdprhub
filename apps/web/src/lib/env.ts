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

  /** Postgres. Su Vercel è Neon (region EU); in produzione il container dello stack. */
  DATABASE_URL: z.string().min(1).optional(),

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

const analisi = schema.safeParse(process.env);

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

/** Vero quando l'istanza gira su un ambiente effimero senza filesystem persistente. */
export const isVetrinaServerless = env.STORAGE_DRIVER === "blob" || env.PDF_DRIVER === "serverless";
