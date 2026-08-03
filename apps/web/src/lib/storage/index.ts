import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve, sep } from "node:path";
import { env } from "@/lib/env";

// L'ARCHIVIO DEI FILE, dietro un'interfaccia sola.
//
// Il prodotto si vende per istanza: una su una VPS del cliente, una sulla vetrina che sta su
// Vercel. Sono due mondi con vincoli opposti — sulla VPS il disco è la cosa più semplice e
// più facile da salvare, su Vercel il disco non esiste (fuori da `/tmp`, che sparisce a ogni
// invocazione) e serve un archivio a oggetti. Scrivere il codice applicativo contro uno dei
// due significherebbe riscriverlo per l'altro.
//
// Il driver si sceglie dall'ambiente, come per il database, e non si dichiara a mano: un
// interruttore che qualcuno deve ricordarsi di girare è un interruttore girato male.
//
// TRE COSE VALGONO PER ENTRAMBI I DRIVER, e sono quelle che rendono un file un'evidenza
// invece che un allegato:
//
//   LA CHIAVE PORTA L'ORGANIZZAZIONE. Non è una comodità: è il confine. Un file di un altro
//   studio non è raggiungibile nemmeno conoscendone l'URL, perché la lettura passa sempre da
//   una chiave che comincia con l'organizzazione di chi chiede.
//
//   L'IMPRONTA SI CALCOLA QUI, non a valle. Il chiamante non può dichiarare un hash: lo
//   riceve. Un'evidenza il cui hash arriva dal client è un'evidenza che si può sostituire in
//   silenzio, ed è esattamente ciò che un ispettore vuole escludere.
//
//   IL TIPO SI DECIDE DAL CONTENUTO. L'estensione e l'intestazione `Content-Type` le sceglie
//   chi carica, quindi non valgono niente: si leggono i primi byte e si confrontano con le
//   firme note. Un eseguibile rinominato `dvr.pdf` viene respinto.

export type Archiviato = {
  readonly chiave: string;
  readonly hashSha256: string;
  readonly dimensione: number;
  readonly mime: string;
};

export interface Archivio {
  readonly nome: string;
  scrivi(chiave: string, dati: Buffer, mime: string): Promise<void>;
  leggi(chiave: string): Promise<Buffer>;
  elimina(chiave: string): Promise<void>;
}

// --- Tipi ammessi -------------------------------------------------------------------------
// Un'evidenza è un documento, non un programma. L'elenco è corto apposta: ogni tipo in più è
// una superficie in più, e nessuno ha mai avuto bisogno di allegare un archivio compresso a
// un adempimento.
const FIRME: readonly { mime: string; estensioni: readonly string[]; firma: readonly number[] }[] = [
  { mime: "application/pdf", estensioni: ["pdf"], firma: [0x25, 0x50, 0x44, 0x46] }, // %PDF
  { mime: "image/png", estensioni: ["png"], firma: [0x89, 0x50, 0x4e, 0x47] },
  { mime: "image/jpeg", estensioni: ["jpg", "jpeg"], firma: [0xff, 0xd8, 0xff] },
  // I formati Office moderni sono archivi zip: la firma è quella, e il tipo preciso si
  // distingue solo dal contenuto interno. Qui basta sapere che è un contenitore Office.
  {
    mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    estensioni: ["docx", "xlsx", "pptx"],
    firma: [0x50, 0x4b, 0x03, 0x04],
  },
];

export const TIPI_AMMESSI = FIRME.flatMap((f) => f.estensioni);
export const DIMENSIONE_MASSIMA = 25 * 1024 * 1024;

/**
 * Il tipo reale del file, letto dai primi byte.
 *
 * Restituisce `null` se nessuna firma corrisponde. Non si guarda l'estensione e non si
 * guarda l'intestazione dichiarata dal browser: le sceglie chi carica, e un controllo che
 * si fida di chi carica non è un controllo.
 */
export function tipoReale(dati: Buffer): string | null {
  for (const f of FIRME) {
    if (f.firma.every((b, i) => dati[i] === b)) return f.mime;
  }
  return null;
}

export function improntaSha256(dati: Buffer): string {
  return createHash("sha256").update(dati).digest("hex");
}

/**
 * La chiave di un'evidenza. L'organizzazione è il primo segmento e non è negoziabile.
 *
 * Il nome originale non entra nella chiave: contiene quello che l'utente ci ha messo, spesso
 * il nome di una persona, e finirebbe in un percorso che compare nei log. Resta nel database,
 * dove è un dato come gli altri.
 */
export function chiaveEvidenza(organizationId: string, evidenzaId: string, estensione: string): string {
  const pulita = estensione.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8) || "bin";
  return `evidenze/${organizationId}/${evidenzaId}.${pulita}`;
}

// --- Driver: disco -------------------------------------------------------------------------

class ArchivioSuDisco implements Archivio {
  readonly nome = "disco";
  constructor(private readonly radice: string) {}

  /** Nessuna chiave può uscire dalla radice, nemmeno con `..` nel mezzo. */
  private percorso(chiave: string): string {
    const p = resolve(this.radice, chiave);
    if (p !== this.radice && !p.startsWith(this.radice + sep)) {
      throw new Error("chiave fuori dalla radice dell'archivio");
    }
    return p;
  }

  async scrivi(chiave: string, dati: Buffer): Promise<void> {
    const p = this.percorso(chiave);
    await mkdir(dirname(p), { recursive: true });
    await writeFile(p, dati);
  }

  async leggi(chiave: string): Promise<Buffer> {
    return readFile(this.percorso(chiave));
  }

  async elimina(chiave: string): Promise<void> {
    await rm(this.percorso(chiave), { force: true });
  }
}

// --- Driver: archivio a oggetti di Vercel ---------------------------------------------------

class ArchivioBlob implements Archivio {
  readonly nome = "blob";

  private async modulo() {
    // Importato a richiesta: su una VPS il pacchetto non serve e non deve nemmeno essere
    // caricato per far partire il processo.
    return import("@vercel/blob");
  }

  async scrivi(chiave: string, dati: Buffer, mime: string): Promise<void> {
    const { put } = await this.modulo();
    // ACCESSO PRIVATO, ed è l'unica scelta difendibile.
    //
    // Il primo giro scriveva `access: "public"` e lo store ha rifiutato — giustamente. Un
    // blob pubblico ha un indirizzo che chiunque lo conosca può aprire, e sarebbe una porta
    // di servizio che scavalca il controllo di appartenenza che sta nella rotta. Per un DVR
    // o un certificato medico è esattamente ciò che non deve esistere: il documento esce
    // solo da `/api/evidenze/[id]`, dove si riverifica di chi è.
    //
    // `addRandomSuffix: false` perché la chiave la decidiamo noi e porta l'organizzazione.
    await put(chiave, dati, { access: "private", contentType: mime, addRandomSuffix: false });
  }

  async leggi(chiave: string): Promise<Buffer> {
    const { get } = await this.modulo();
    // Su uno store privato non esiste un URL da aprire: si legge dal server, con le
    // credenziali dell'istanza. È giusto che sia così — il documento arriva all'utente
    // dalla nostra rotta, che prima riverifica di chi è e ne ricontrolla l'impronta.
    //
    // `useCache: false` perché il contenuto di un'evidenza non cambia mai, ma la CDN può
    // servire una copia di un blob eliminato e ricreato con la stessa chiave: qui si vuole
    // il byte che sta nell'archivio, non quello che qualcuno ha visto per ultimo.
    const risultato = await get(chiave, { access: "private", useCache: false });
    if (!risultato) throw new Error("archivio: documento non trovato");
    const pezzi: Uint8Array[] = [];
    // @ts-expect-error — lo stream è un ReadableStream del web, iterabile a runtime su Node.
    for await (const pezzo of risultato.stream) pezzi.push(pezzo as Uint8Array);
    return Buffer.concat(pezzi);
  }

  async elimina(chiave: string): Promise<void> {
    const { del } = await this.modulo();
    await del(chiave);
  }
}

// --- Scelta del driver ----------------------------------------------------------------------

let archivio: Archivio | null = null;

/**
 * L'archivio dell'istanza.
 *
 * Su Vercel il disco è di sola lettura fuori da `/tmp`, che per giunta sparisce fra
 * un'invocazione e l'altra: se c'è il token dell'archivio a oggetti si usa quello, e se non
 * c'è si FALLISCE DICENDOLO. Ripiegare su `/tmp` darebbe un caricamento che riesce e un
 * documento che il giorno dopo non c'è più — il peggior esito possibile per un'evidenza.
 */
export function archivioIstanza(): Archivio {
  if (archivio) return archivio;
  const suVercel = Boolean(process.env.VERCEL);
  if (suVercel) {
    // DUE MODI DI AUTENTICARSI, ed entrambi vanno accettati.
    //
    // Il primo giro pretendeva `BLOB_READ_WRITE_TOKEN` e basta. È sbagliato: collegando uno
    // store dal pannello, Vercel non crea quella variabile — mette `BLOB_STORE_ID` e la
    // libreria si autentica con il token OIDC che l'ambiente ha già. Il controllo avrebbe
    // rifiutato un'istanza configurata correttamente, che è il difetto tipico di una
    // precondizione scritta su un'assunzione invece che sul comportamento reale.
    //
    // Il controllo resta perché la cosa da impedire è un'altra: che su Vercel senza
    // archivio si ripieghi sul disco. Lì `/tmp` sparisce fra un'invocazione e l'altra, e un
    // caricamento riuscito con un documento che domani non c'è più è il peggior esito
    // possibile per un'evidenza.
    const configurato =
      Boolean(process.env.BLOB_READ_WRITE_TOKEN) || Boolean(process.env.BLOB_STORE_ID);
    if (!configurato) {
      throw new Error(
        "Archivio non configurato: su Vercel serve uno store Blob collegato al progetto " +
          "(BLOB_STORE_ID, oppure BLOB_READ_WRITE_TOKEN). Il disco non è scrivibile e " +
          "un'evidenza salvata in /tmp sparirebbe.",
      );
    }
    archivio = new ArchivioBlob();
  } else {
    archivio = new ArchivioSuDisco(resolve(env.ARCHIVIO_RADICE ?? join(process.cwd(), ".archivio")));
  }
  return archivio;
}

/** Solo per i test di conformità: permette di provare un driver preciso. */
export function archivioSuDisco(radice: string): Archivio {
  return new ArchivioSuDisco(resolve(radice));
}
