import { chromium } from "playwright";
const B = process.argv[2] ?? "https://gdprhub.vercel.app";
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, locale: "it-IT" });
await ctx.request.post(`${B}/api/auth/sign-in/email`, { data: { email: "collaudo1@compliancedesk.it", password: "3g29f-tk8de-ipjsd" } });
const p = await ctx.newPage();

for (const percorso of ["/portafoglio", "/scadenzario"]) {
  await p.goto(`${B}${percorso}`, { waitUntil: "load" });
  await p.goto("about:blank");
  const t0 = Date.now();
  await p.goto(`${B}${percorso}`, { waitUntil: "load" });
  const m = await p.evaluate(() => {
    const n = performance.getEntriesByType("navigation")[0];
    const risorse = performance.getEntriesByType("resource");
    const js = risorse.filter((r) => r.name.endsWith(".js"));
    return {
      risposta: Math.round(n.responseStart - n.requestStart),
      scarico: Math.round(n.responseEnd - n.responseStart),
      html: Math.round(n.transferSize / 1024),
      dcl: Math.round(n.domContentLoadedEventEnd - n.startTime),
      load: Math.round(n.loadEventEnd - n.startTime),
      nodi: document.querySelectorAll("*").length,
      jsFile: js.length,
      jsKb: Math.round(js.reduce((a, r) => a + (r.transferSize || 0), 0) / 1024),
      jsMs: Math.round(Math.max(...js.map((r) => r.responseEnd), 0)),
    };
  });
  console.log(`${percorso}
  risposta del server   ${m.risposta} ms
  scarico dell'HTML     ${m.scarico} ms  (${m.html} KB)
  JavaScript            ${m.jsFile} file, ${m.jsKb} KB, ultimo a ${m.jsMs} ms
  DOM pronto            ${m.dcl} ms
  caricamento completo  ${m.load} ms   ·  ${m.nodi} nodi nel DOM
  misurato dall'esterno ${Date.now() - t0} ms\n`);
}
await b.close();
