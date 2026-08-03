import { chromium } from "playwright";
import { createHash } from "node:crypto";

const BASE = process.env.BASE ?? "http://127.0.0.1:3311";
const b = await chromium.launch();
const c = await b.newContext({ locale: "it-IT", viewport: { width: 1440, height: 900 } });
const r = await c.request.post(`${BASE}/api/auth/sign-in/email`, {
  data: { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD },
});
if (!r.ok()) {
  console.log("accesso fallito", r.status());
  process.exit(1);
}

const p = await c.newPage();
p.on("pageerror", (e) => console.log("ECCEZIONE PAGINA:", String(e).slice(0, 300)));
p.on("console", (m) => {
  if (m.type() === "error") console.log("console.error:", m.text().slice(0, 300));
});
p.on("response", (res) => {
  if (res.request().method() !== "POST") return;
  res
    .text()
    .then((t) => console.log("RISPOSTA", res.status(), "|", t.slice(0, 400)))
    .catch(() => {});
});

await p.goto(`${BASE}/portafoglio`, { waitUntil: "networkidle" });
const href = await p.locator('a[href^="/azienda/"]').first().getAttribute("href");
await p.goto(`${BASE}${href}/d81`, { waitUntil: "networkidle" });
await p.locator("[data-tour=apri-adempimento]").first().click();
await p.waitForSelector("[data-tour=evidenze]", { timeout: 15000 });

const contenuto = Buffer.concat([
  Buffer.from("%PDF-1.7\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF"),
  Buffer.from(`prova-${Date.now()}`),
]);
const atteso = createHash("sha256").update(contenuto).digest("hex");

await p.locator("[data-tour=evidenze] input[type=file]").setInputFiles({
  name: "dvr-di-prova.pdf",
  mimeType: "application/pdf",
  buffer: contenuto,
});
await p.getByRole("button", { name: "Allega", exact: true }).click();
await p.waitForTimeout(9000);

console.log("--- pannello ---");
console.log(await p.locator("[data-tour=evidenze]").innerText());
console.log("impronta attesa:", atteso.slice(0, 12));

const link = await p
  .locator('[data-tour=evidenze] a[href^="/api/evidenze/"]')
  .first()
  .getAttribute("href")
  .catch(() => null);
if (link) {
  const g = await c.request.get(`${BASE}${link}`);
  const scaricato = Buffer.from(await g.body());
  const uguale = createHash("sha256").update(scaricato).digest("hex") === atteso;
  console.log("scaricamento:", g.status(), "· identico:", uguale ? "SI" : "NO");
} else {
  console.log("nessun collegamento all'evidenza: il caricamento non è andato a buon fine");
}
await b.close();
