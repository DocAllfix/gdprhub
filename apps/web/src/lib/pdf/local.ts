import { env } from "@/lib/env";
import type { DriverPdf } from "./index";

// Driver PDF per sviluppo e per le istanze dedicate. Usa il Chromium di Playwright, che è
// già presente perché serve ai test end-to-end e al cancello visivo: nessun peso in più.
//
// In produzione dentro il container si passa `PDF_CHROMIUM_PATH` puntando al Chromium
// installato nell'immagine, così non serve scaricare i browser di Playwright al deploy.

export const rendi: DriverPdf = async (html, opzioni) => {
  const { chromium } = await import("playwright");

  const browser = await chromium.launch(
    env.PDF_CHROMIUM_PATH ? { executablePath: env.PDF_CHROMIUM_PATH } : {},
  );

  try {
    const pagina = await browser.newPage();
    await pagina.setContent(html, { waitUntil: "networkidle" });
    await pagina.evaluate(() => document.fonts.ready);

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
