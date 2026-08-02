#!/usr/bin/env node
// Percorso completo, clic per clic, di quello che farà il committente.
//
// Il cancello visivo verifica che ogni pulsante si possa premere senza rompere nulla; questo
// verifica che il FLUSSO funzioni: accesso sbagliato, accesso, cambio password forzato,
// portafoglio, filtri, creazione di un'azienda con validazione che fallisce, attivazione e
// disattivazione dei moduli, marchio, temi, isolamento, uscita.
//
// Non sostituisce il cancello e non ne è sostituito: uno prova i comandi, l'altro prova il
// mestiere. Insieme sono la ragione per cui la Fase 6 ha trovato tre difetti che nessuna
// lettura del codice aveva visto.
//
//   pnpm percorso                              contro http://127.0.0.1:3100
//   pnpm percorso https://esempio.app          contro l'istanza online
//   pnpm percorso <base> <nuova-password>      quando l'utente deve ancora cambiarla
//
// Le credenziali arrivano da .env.local (ADMIN_EMAIL / ADMIN_PASSWORD).
// Gli screenshot finiscono in `percorso/`.

import { chromium } from "playwright";
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const BASE = process.argv[2] ?? "http://127.0.0.1:3100";
const S = join(dirname(fileURLToPath(import.meta.url)), "..", "percorso");

const env = Object.fromEntries(
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", ".env.local"), "utf8")
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

const EMAIL = env.ADMIN_EMAIL;
const PASSWORD_INIZIALE = env.ADMIN_PASSWORD;
const PASSWORD_NUOVA = process.argv[3] ?? PASSWORD_INIZIALE;

mkdirSync(S, { recursive: true });

const problemi = [];
const passi = [];
const nota = (t) => {
  passi.push(t);
  console.log(`  · ${t}`);
};
const problema = (t) => {
  problemi.push(t);
  console.log(`  ✗ ${t}`);
};

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "it-IT" });
const p = await ctx.newPage();

const console_ = [];
p.on("console", (m) => {
  if (["error", "warning"].includes(m.type()) && !/DevTools|Fast Refresh/i.test(m.text())) {
    console_.push(`${m.type()}: ${m.text()}`);
  }
});
p.on("pageerror", (e) => console_.push(`eccezione: ${e.message}`));
const rete = [];
p.on("response", (r) => {
  if (r.status() >= 400) rete.push(`${r.status()} ${r.request().method()} ${r.url()}`);
});

/**
 * Attende che il riquadro dei moduli dica una certa cosa.
 *
 * Non si aspetta un numero di millisecondi: su Vercel attivare un modulo richiede quasi
 * cinque secondi — sessantacinque scritture e un giro di rete — e un'attesa a orologio
 * bocciava in produzione ciò che passava in locale. Un test che dipende dalla latenza non
 * verifica il prodotto, verifica la connessione.
 */
async function attendiModuli(p, regola, cosa) {
  try {
    await p.waitForFunction(
      (fonte) =>
        new RegExp(fonte).test(document.querySelector('[data-tour="moduli-azienda"]')?.textContent ?? ""),
      regola.source,
      { timeout: 60000 },
    );
    return true;
  } catch {
    problema(cosa);
    return false;
  }
}

const scatta = (n) => p.screenshot({ path: `${S}/${n}.png`, fullPage: true });

// --- 1. La radice reindirizza all'accesso -------------------------------------------------
console.log("\n1 · Radice e accesso");
await p.goto(BASE, { waitUntil: "networkidle" });
if (!p.url().includes("/accedi")) problema(`la radice non porta all'accesso: ${p.url()}`);
else nota("radice → /accedi");
await scatta("01-accedi");

// --- 2. Credenziali sbagliate: messaggio, nessuna sessione --------------------------------
console.log("\n2 · Credenziali sbagliate");
await p.fill("#email", EMAIL);
await p.fill("#password", "password-sbagliata-lunga");
await p.click('button[type="submit"]');
await p.waitForTimeout(1200);
const err = await p
  .locator('[role="alert"]')
  .filter({ hasText: /./ })
  .first()
  .textContent()
  .catch(() => null);
if (!err) problema("credenziali sbagliate: nessun messaggio d'errore");
else nota(`errore mostrato: «${err.trim()}»`);
if (!p.url().includes("/accedi")) problema("credenziali sbagliate ma la pagina è cambiata");
await scatta("02-errore");

// --- 3. Accesso corretto -------------------------------------------------------------------
console.log("\n3 · Accesso");
await p.fill("#password", PASSWORD_INIZIALE);
await p.click('button[type="submit"]');
await p.waitForURL(/primo-accesso|portafoglio/, { timeout: 15000 }).catch(() => {});
// Il push del client arriva prima del reindirizzamento del server: senza questa attesa si
// legge /portafoglio e un istante dopo si è su /primo-accesso.
await p.waitForLoadState("networkidle");
await p.waitForTimeout(800);
nota(`dopo l'accesso: ${new URL(p.url()).pathname}`);
await scatta("03-dopo-accesso");

// --- 4. Cambio password forzato ------------------------------------------------------------
if (p.url().includes("/primo-accesso")) {
  console.log("\n4 · Cambio password forzato");
  // Il guard deve reggere: chi prova ad andare altrove torna qui.
  await p.goto(`${BASE}/portafoglio`, { waitUntil: "networkidle" });
  if (!p.url().includes("/primo-accesso")) problema("con la password iniziale si accede al portafoglio");
  else nota("il portafoglio rimanda al cambio password");

  // Password troppo corta
  await p.fill("#attuale", PASSWORD_INIZIALE);
  await p.fill("#nuova", "corta");
  await p.fill("#conferma", "corta");
  await p.locator('form button[type="submit"]').click();
  await p.waitForTimeout(1200);
  const e1 = await p
    .locator('[role="alert"]')
    .filter({ hasText: /./ })
    .first()
    .textContent()
    .catch(() => null);
  nota(`password corta → ${e1 ? `«${e1.trim()}»` : "NESSUN ERRORE"}`);
  if (!e1) problema("password sotto i 12 caratteri accettata");

  // Password che non coincidono
  await p.fill("#nuova", PASSWORD_NUOVA);
  await p.fill("#conferma", `${PASSWORD_NUOVA}x`);
  await p.locator('form button[type="submit"]').click();
  await p.waitForTimeout(1200);
  const e2 = await p
    .locator('[role="alert"]')
    .filter({ hasText: /./ })
    .first()
    .textContent()
    .catch(() => null);
  nota(`conferma diversa → ${e2 ? `«${e2.trim()}»` : "NESSUN ERRORE"}`);
  if (!e2) problema("password e conferma diverse accettate");
  await scatta("04-primo-accesso");

  // Cambio valido
  await p.fill("#attuale", PASSWORD_INIZIALE);
  await p.fill("#nuova", PASSWORD_NUOVA);
  await p.fill("#conferma", PASSWORD_NUOVA);
  await p.locator('form button[type="submit"]').click();
  await p.waitForURL(/portafoglio/, { timeout: 20000 }).catch(() => {});
  if (!p.url().includes("/portafoglio")) problema(`dopo il cambio password: ${p.url()}`);
  else nota("cambio password riuscito → portafoglio");
}

// --- 5. Portafoglio -------------------------------------------------------------------------
console.log("\n5 · Portafoglio");
await p.goto(`${BASE}/portafoglio`, { waitUntil: "networkidle" });
await scatta("05-portafoglio");
const righe = await p.locator("tbody tr").count();
nota(`${righe} righe in tabella`);
const indicatori = await p.locator('[data-tour="indicatori-portafoglio"] p.text-2xl').allTextContents();
nota(`indicatori: ${indicatori.join(" | ")}`);

// Filtro
await p.fill('[data-tour="filtro-portafoglio"]', "verdi");
await p.waitForTimeout(400);
nota(`filtro «verdi» → ${await p.locator("tbody tr").count()} righe`);
await p.fill('[data-tour="filtro-portafoglio"]', "zzzz");
await p.waitForTimeout(400);
const vuoto = await p.locator("tbody tr td").first().textContent();
nota(`filtro senza esiti → «${vuoto?.trim()}»`);
await p.fill('[data-tour="filtro-portafoglio"]', "");
await p.waitForTimeout(300);

// Ordinamento su ogni intestazione
const intestazioni = await p.locator("thead button").count();
for (let i = 0; i < intestazioni; i++) {
  await p.locator("thead button").nth(i).click();
  await p.waitForTimeout(150);
}
nota(`${intestazioni} intestazioni ordinabili cliccate`);

// --- 6. Pannello nuova azienda ---------------------------------------------------------------
console.log("\n6 · Nuova azienda");
await p.click('[data-tour="nuova-azienda"]');
await p.waitForTimeout(600);
const pannello = await p.locator('[role="dialog"]').isVisible();
if (!pannello) problema("il pannello «nuova azienda» non si apre");
else nota("pannello aperto");
await scatta("06-nuova-azienda");

// Validazione: nome vuoto → il browser blocca (required). Si prova la P.IVA malformata.
await p.fill("#nome", "Collaudo Cancello S.r.l.");
await p.fill("#piva", "123");
await p.locator('[role="dialog"] button[type="submit"]').click();
await p.waitForTimeout(1500);
const e3 = await p
  .locator('[role="dialog"] [role="alert"]')
  .first()
  .textContent()
  .catch(() => null);
nota(`P.IVA di 3 cifre → ${e3 ? `«${e3.trim()}»` : "NESSUN ERRORE"}`);
if (!e3) problema("partita IVA malformata accettata");

// Creazione valida, con un solo modulo
await p.fill("#piva", "");
await p.uncheck('input[name="modulo-d231"]');
await p.uncheck('input[name="modulo-d81"]');
await p.locator('[role="dialog"] button[type="submit"]').click();
await p.waitForURL(/\/azienda\//, { timeout: 30000 }).catch(() => {});
if (!p.url().includes("/azienda/")) problema(`dopo la creazione: ${p.url()}`);
else nota(`creata e aperta: ${new URL(p.url()).pathname}`);
const idNuova = p.url().split("/azienda/")[1];
await scatta("07-azienda-nuova");

// --- 7. Scheda azienda: moduli ---------------------------------------------------------------
console.log("\n7 · Moduli");
const testoModuli = await p.locator('[data-tour="moduli-azienda"]').innerText();
nota(`stato iniziale: ${testoModuli.replace(/\n+/g, " · ").slice(0, 200)}`);
if (!/Attivo · 42 adempimenti/.test(testoModuli)) problema("il modulo GDPR non ha 42 adempimenti");

// Attiva 81/08
await p.locator('[data-tour="modulo-d81"]').click();
if (await attendiModuli(p, /Attivo · 64 adempimenti/, "attivando 81/08 non compaiono 64 adempimenti")) {
  nota("81/08 attivato → 64 adempimenti");
}

// Disattiva GDPR: i dati devono restare
await p.locator('[data-tour="modulo-gdpr"]').click();
if (
  await attendiModuli(
    p,
    /Non attivo · 42 adempimenti conservati/,
    "disattivando il GDPR non si dichiara che i dati restano conservati",
  )
) {
  nota("GDPR disattivato → 42 adempimenti conservati");
}
await scatta("08-moduli");

// Riattiva GDPR
await p.locator('[data-tour="modulo-gdpr"]').click();
if (await attendiModuli(p, /Attivo · 42 adempimenti/, "riattivando il GDPR i 42 adempimenti non tornano")) {
  nota("GDPR riattivato → 42 adempimenti");
}

// --- 8. Scheda dell'azienda di esempio --------------------------------------------------------
console.log("\n8 · Azienda di esempio");
await p.goto(`${BASE}/portafoglio`, { waitUntil: "networkidle" });
const primoLink = await p.locator('a[href^="/azienda/"]').first().getAttribute("href");
await p.goto(`${BASE}${primoLink}`, { waitUntil: "networkidle" });
nota(`aperta: ${await p.locator("h1").textContent()}`);
const scadenze = await p.locator("tbody tr").count();
nota(`${scadenze} scadenze in agenda`);
await scatta("09-azienda-demo");

// --- 9. Impostazioni ---------------------------------------------------------------------------
console.log("\n9 · Impostazioni");
await p.goto(`${BASE}/impostazioni`, { waitUntil: "networkidle" });
const nomeStudio = await p.inputValue("#brandNome");
await p.fill("#brandNome", `${nomeStudio} · collaudo`);
await p.locator('form[data-tour="marchio"] button[type="submit"]').click();
await p.waitForTimeout(2500);
const barra = await p.locator("aside p").first().textContent();
if (!barra?.includes("collaudo")) problema(`il marchio non si riflette nella barra laterale: «${barra}»`);
else nota(`marchio aggiornato e riflesso: «${barra.trim()}»`);
await p.fill("#brandNome", nomeStudio);
await p.locator('form[data-tour="marchio"] button[type="submit"]').click();
await p.waitForTimeout(2000);
nota("marchio ripristinato");
await scatta("10-impostazioni");

// --- 10. Tema ---------------------------------------------------------------------------------
console.log("\n10 · Tema");
for (const t of ["dark", "light", "system"]) {
  await p.locator(`[data-tour="tema"] button`).nth(["light", "dark", "system"].indexOf(t)).click();
  await p.waitForTimeout(300);
  const attr = await p.evaluate(() => document.documentElement.getAttribute("data-theme"));
  const fondo = await p.evaluate(() => getComputedStyle(document.body).backgroundColor);
  nota(`${t} → data-theme=${attr}, fondo=${fondo}`);
}
await p.locator('[data-tour="tema"] button').nth(1).click();
await p.waitForTimeout(300);
await scatta("11-tema-scuro");
await p.locator('[data-tour="tema"] button').nth(0).click();
await p.waitForTimeout(300);

// --- 11. Isolamento: un'azienda inesistente ------------------------------------------------------
console.log("\n11 · Isolamento");
const r404 = await p.goto(`${BASE}/azienda/00000000-0000-0000-0000-000000000000`, {
  waitUntil: "networkidle",
});
nota(`azienda inesistente → HTTP ${r404?.status()}`);
if (r404?.status() !== 404) problema("un identificativo inventato non restituisce 404");

// --- 12. Uscita ------------------------------------------------------------------------------
console.log("\n12 · Uscita");
await p.goto(`${BASE}/portafoglio`, { waitUntil: "networkidle" });
await p.locator('[data-tour="esci"]').click();
await p.waitForURL(/accedi/, { timeout: 15000 }).catch(() => {});
nota(`dopo l'uscita: ${new URL(p.url()).pathname}`);
const dopoUscita = await p.goto(`${BASE}/portafoglio`, { waitUntil: "networkidle" });
if (!p.url().includes("/accedi")) problema("dopo l'uscita il portafoglio è ancora raggiungibile");
else nota(`portafoglio da disconnesso → ${new URL(p.url()).pathname} (HTTP ${dopoUscita?.status()})`);
await scatta("12-uscita");

// --- Rapporto ----------------------------------------------------------------------------------
console.log(`\n${"—".repeat(60)}`);
console.log(`Passi eseguiti: ${passi.length}`);
console.log(`Console (errori/avvisi): ${console_.length}`);
console_.slice(0, 10).forEach((m) => console.log(`   ${m}`));
console.log(`Richieste ≥400: ${rete.length}`);
rete.slice(0, 10).forEach((m) => console.log(`   ${m}`));
console.log(`Problemi: ${problemi.length}`);
problemi.forEach((m) => console.log(`   ✗ ${m}`));
console.log(`Azienda di collaudo creata: ${idNuova}`);

await browser.close();
process.exit(problemi.length + console_.length + rete.length > 0 ? 1 : 0);
