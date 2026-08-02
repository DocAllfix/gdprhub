import { chromium } from "playwright";
const B = "https://gdprhub.vercel.app";
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, locale: "it-IT" });
await ctx.request.post(`${B}/api/auth/sign-in/email`, {
  data: { email: "verifica@compliancedesk.it", password: "Verifica-Interna-2026" },
});
const p = await ctx.newPage();
for (const r of ["/cruscotto", "/portafoglio", "/scadenzario"]) {
  const m = [];
  for (let i = 0; i < 4; i++) {
    const t0 = Date.now();
    await p.goto(`${B}${r}`, { waitUntil: "load" });
    m.push(Date.now() - t0);
  }
  m.sort((a, b) => a - b);
  console.log(
    r.padEnd(15),
    "mediana",
    String(m[1]).padStart(5) + "ms",
    " min",
    String(m[0]).padStart(5) + "ms",
  );
}
await b.close();
