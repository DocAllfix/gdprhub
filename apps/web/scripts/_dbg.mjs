import { chromium } from "playwright";
import { readFileSync } from "node:fs";
const BASE = "https://gdprhub.vercel.app";
const ID = "f917c931-daf9-462d-a15b-cfe2b8ceb37a";
const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((r) => r.includes("=") && !r.trim().startsWith("#"))
    .map((r) => {
      const i = r.indexOf("=");
      return [
        r.slice(0, i).trim(),
        r
          .slice(i + 1)
          .trim()
          .replace(/^["']|["']$/g, ""),
      ];
    }),
);
const b = await chromium.launch();
const c = await b.newContext({ viewport: { width: 390, height: 844 } });
await c.request.post(new URL("/api/auth/sign-in/email", BASE).toString(), {
  data: { email: env.GATE_EMAIL, password: env.GATE_PASSWORD },
});
const t = await c.newPage();
await t.goto(new URL(`/azienda/${ID}/registro/trattamento`, BASE).toString(), { waitUntil: "networkidle" });
await t.getByRole("button", { name: "Apri la navigazione" }).click();
await t.waitForTimeout(600);
console.log(
  "fuoco dopo apertura:",
  await t.evaluate(() => {
    const a = document.activeElement;
    return a ? `${a.tagName}[${a.getAttribute("aria-label") ?? ""}]` : "nessuno";
  }),
);
await t.keyboard.press("Escape");
await t.waitForTimeout(600);
const velo = t.locator(".fixed.inset-0[aria-label^='Chiudi']");
console.log("velo dopo Esc:", (await velo.count()) ? await velo.first().isVisible() : "sparito");
await b.close();
