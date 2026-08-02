import { env } from "@/lib/env";

// Resa di documenti PDF. Il codice di dominio chiama `rendiPdf(html)` e non sa nulla di
// Chromium, di Vercel o di Docker: è ciò che rende lo stesso sorgente installabile sia
// come vetrina serverless sia come istanza dedicata dietro Caddy.
//
// I due driver si caricano con `import()` dinamico, così l'implementazione inutilizzata
// non entra mai nel bundle della funzione che gira.

export type OpzioniPdf = {
  /** Formato di pagina. I documenti di compliance sono sempre A4. */
  readonly formato?: "A4";
  /** Margini CSS. Il registro editoriale del documento li definisce in `@page`. */
  readonly margini?: { top: string; right: string; bottom: string; left: string };
  /** Include sfondi e colori: senza, le fasce e le tabelle stampano bianche. */
  readonly stampaSfondi?: boolean;
};

const PREDEFINITE = {
  formato: "A4",
  margini: { top: "0", right: "0", bottom: "0", left: "0" },
  stampaSfondi: true,
} as const satisfies Required<OpzioniPdf>;

/**
 * Rende una pagina HTML autonoma in un PDF.
 *
 * L'HTML deve bastare a se stesso: font incorporati, nessuna risorsa remota. Un documento
 * che dipende da Google Fonts si stampa con il font sbagliato appena il cliente lo apre
 * senza rete, ed è uno dei difetti del prototipo di partenza.
 */
export async function rendiPdf(html: string, opzioni: OpzioniPdf = {}): Promise<Uint8Array> {
  const opz = { ...PREDEFINITE, ...opzioni };
  const driver =
    env.PDF_DRIVER === "serverless" ? (await import("./serverless")).rendi : (await import("./local")).rendi;
  return driver(html, opz);
}

export type DriverPdf = (html: string, opzioni: Required<OpzioniPdf>) => Promise<Uint8Array>;
