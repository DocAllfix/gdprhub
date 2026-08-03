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

  /**
   * Impone il cambio password al primo accesso.
   *
   * Acceso di default, e sulle istanze vendute deve restarlo: le credenziali iniziali stanno
   * in chiaro nel file d'ambiente di una macchina che non controlliamo, e quella finestra va
   * chiusa. Si spegne dove le utenze si creano a mano per far provare il sistema, perché lì
   * chi consegna la password la conosce già e l'attrito non protegge nessuno.
   */
  RICHIEDI_CAMBIO_PASSWORD: z
    .enum(["true", "false"])
    .default("true")
    .transform((v) => v === "true"),
  /** Nome dello studio proprietario dell'istanza. */
  STUDIO_NOME: z.string().default("Studio"),
  /**
   * Dove finiscono le evidenze quando l'istanza gira su una macchina propria.
   *
   * Vuoto significa `.archivio` accanto all'applicazione, che va bene per lo sviluppo. In
   * produzione su VPS va puntato a un volume che il backup comprende: un'evidenza che non
   * finisce nel salvataggio è un documento che esiste finché non serve.
   * Su Vercel questa variabile non si guarda: lì l'archivio è a oggetti.
   */
  ARCHIVIO_RADICE: z.string().optional(),

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
 * Vero mentre Next sta COMPILANDO, non mentre serve richieste.
 *
 * La differenza conta. `next build` gira con `NODE_ENV=production` e carica ogni modulo
 * per raccogliere i dati delle pagine — comprese le rotte che importano il database. Ma
 * una compilazione non risponde a nessuno: non le serve un segreto di sessione, e non le
 * serve un database. Pretenderli lì significa una cosa sola, che i segreti di produzione
 * devono stare nell'ambiente di build; ed è esattamente ciò che non si vuole, né sulla CI
 * né nella `docker build` di un'istanza cliente.
 */
const inCompilazione = process.env.NEXT_PHASE === "phase-production-build";

/**
 * Controlli che valgono solo su un'istanza che PARTE in produzione.
 *
 * Il segreto di sviluppo è comodo perché fa partire l'istanza senza configurare nulla, ma è
 * pubblico: sta nel repository. Se finisse in produzione, chiunque legga questo file
 * potrebbe forgiare una sessione valida. Meglio che l'istanza si rifiuti di partire.
 *
 * Il rifiuto si sposta dalla compilazione all'avvio, e non si allenta: un'immagine
 * costruita senza segreti si costruisce, ma non serve una sola richiesta finché non ne
 * riceve di veri. È il momento giusto in cui fallire.
 */
if (env.NODE_ENV === "production" && !inCompilazione) {
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
