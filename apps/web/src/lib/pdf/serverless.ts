import type { DriverPdf } from "./index";

// Driver PDF per ambienti serverless (Vercel). Usa il Chromium compresso di
// @sparticuz/chromium, l'unico che stia nei limiti di dimensione di una funzione.
//
// Questa è l'assunzione tecnica più rischiosa del progetto: nel progetto gemello
// EvalisDeck il percorso PDF su Vercel è rimasto dichiarato ma mai verificato. Qui si
// prova alla Fase 0, prima di costruirci sopra la relazione.

export const rendi: DriverPdf = async (html, opzioni) => {
  const [{ default: chromium }, { default: puppeteer }] = await Promise.all([
    import("@sparticuz/chromium"),
    import("puppeteer-core"),
  ]);

  // I font di sistema non esistono in una funzione serverless: senza questo, ogni
  // carattere non latino e ogni emoji diventano un rettangolo vuoto.
  chromium.setGraphicsMode = false;

  const browser = await puppeteer.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath(),
    headless: true,
  });

  try {
    const pagina = await browser.newPage();
    // Il documento è autonomo (nessuna risorsa remota), quindi `load` basta. Ciò che
    // conta davvero è attendere i font: senza, la prima pagina esce col ripiego.
    await pagina.setContent(html, { waitUntil: "load" });
    await pagina.evaluateHandle("document.fonts.ready");

    const pdf = await pagina.pdf({
      format: opzioni.formato,
      margin: opzioni.margini,
      printBackground: opzioni.stampaSfondi,
      preferCSSPageSize: true,
    });
    return new Uint8Array(pdf);
  } finally {
    await browser.close();
  }
};
