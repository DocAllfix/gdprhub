// Cancello visivo — verifica eseguita, non dichiarata.
//
// Per ogni pagina dichiarata in `pagine.mjs`, e per ogni combinazione di larghezza e tema:
//   1. carica la pagina e sorveglia console e rete
//   2. clicca OGNI elemento interattivo enumerato dal DOM, non un campione
//   3. verifica che ogni collegamento interno risponda (niente 404 silenziosi)
//   4. attraversa la pagina da tastiera e pretende un anello di focus visibile
//   5. salva uno screenshot per l'ispezione umana
//
// Esce con codice diverso da zero al primo difetto: è un cancello, non un rapporto.
//
// Uso:
//   node scripts/gate-visivo.mjs                      → contro http://127.0.0.1:3100
//   node scripts/gate-visivo.mjs https://esempio.app  → contro l'istanza online
//   node scripts/gate-visivo.mjs --solo /portafoglio  → una pagina sola

import { chromium } from "playwright";
import { mkdirSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { PAGINE } from "./pagine.mjs";

const RADICE = join(dirname(fileURLToPath(import.meta.url)), "..");
const SCREENSHOT = join(RADICE, "screenshot");

const LARGHEZZE = [
  { nome: "mobile", larghezza: 360, altezza: 780 },
  { nome: "tablet", larghezza: 768, altezza: 1024 },
  { nome: "desktop", larghezza: 1440, altezza: 900 },
];
const TEMI = /** @type {const} */ (["light", "dark"]);

// Rumore di terze parti e del server di sviluppo che non indica un difetto nostro.
const CONSOLE_IGNORATI = [/Download the React DevTools/i, /\[Fast Refresh\]/i, /React DevTools/i];

const argomenti = process.argv.slice(2);
const base = argomenti.find((a) => a.startsWith("http")) ?? "http://127.0.0.1:3100";
const soloIndice = argomenti.indexOf("--solo");
const soloPercorso = soloIndice >= 0 ? argomenti[soloIndice + 1] : null;

const difetti = [];
const segnala = (dove, cosa) => difetti.push(`${dove}\n     ${cosa}`);

/** Colore di fondo osservato per ogni pagina/larghezza/tema: serve al confronto fra temi. */
const fondiPerTema = new Map();

/** Elementi che l'utente può azionare. I collegamenti si verificano a parte: cliccarli naviga via. */
const SELETTORE_AZIONABILI = [
  "button:not([disabled])",
  "[role=button]:not([aria-disabled=true])",
  "summary",
  "input[type=checkbox]:not([disabled])",
  "input[type=radio]:not([disabled])",
  "[role=switch]",
  "[role=tab]",
].join(", ");

async function verificaPagina(browser, pagina, misura, tema) {
  const etichetta = `${pagina.percorso} · ${misura.nome} · ${tema}`;
  const contesto = await browser.newContext({
    viewport: { width: misura.larghezza, height: misura.altezza },
    colorScheme: tema,
    locale: "it-IT",
    timezoneId: "Europe/Rome",
  });
  const tab = await contesto.newPage();

  const messaggi = [];
  const risposteRotte = [];
  tab.on("console", (m) => {
    if (!["error", "warning"].includes(m.type())) return;
    const testo = m.text();
    if (CONSOLE_IGNORATI.some((r) => r.test(testo))) return;
    messaggi.push(`console.${m.type()}: ${testo}`);
  });
  tab.on("pageerror", (e) => messaggi.push(`eccezione non gestita: ${e.message}`));
  tab.on("response", (r) => {
    if (r.status() >= 400) risposteRotte.push(`${r.status()} ${r.url()}`);
  });

  const url = new URL(pagina.percorso, base).toString();

  // Server spento, DNS sbagliato, TLS rotto: sono difetti da riportare, non eccezioni da
  // far esplodere. Un cancello che va in crash non dice quale pagina ha il problema.
  let risposta;
  try {
    risposta = await tab.goto(url, { waitUntil: "networkidle", timeout: 60_000 });
  } catch (e) {
    segnala(etichetta, `pagina irraggiungibile: ${e.message.split("\n")[0]}`);
    await contesto.close();
    return;
  }

  if (!risposta || risposta.status() >= 400) {
    segnala(etichetta, `la pagina risponde ${risposta?.status() ?? "senza risposta"}`);
    await contesto.close();
    return;
  }

  // Il tema si può pilotare in due modi: la preferenza di sistema e l'attributo che il
  // selettore dell'interfaccia scrive sulla radice. Vanno concordi, o il tema scuro
  // funziona solo per chi ha la preferenza impostata nel sistema operativo.
  await tab.evaluate((t) => document.documentElement.setAttribute("data-theme", t), tema);
  await tab.waitForTimeout(150);

  mkdirSync(SCREENSHOT, { recursive: true });
  const nomeFile = `${pagina.percorso.replace(/\W+/g, "_") || "_radice"}--${misura.nome}--${tema}.png`;
  await tab.screenshot({ path: join(SCREENSHOT, nomeFile), fullPage: true });

  // --- 0. Il tema è davvero applicato? -------------------------------------------------
  // Al primo giro questo cancello è passato verde su una pagina in cui il tema scuro non
  // esisteva: i token stavano sotto una classe che nessuno applicava. Uno strumento di
  // verifica che non verifica ciò che dichiara è peggio di nessuno strumento, quindi ora
  // si registra il colore di fondo reale e a fine giro si confrontano i due temi.
  const fondo = await tab.evaluate(() => getComputedStyle(document.body).backgroundColor);
  fondiPerTema.set(`${pagina.percorso}|${misura.nome}|${tema}`, fondo);

  // --- 1. Nessun errore al caricamento ------------------------------------------------
  if (messaggi.length) segnala(etichetta, `al caricamento:\n     - ${messaggi.join("\n     - ")}`);
  if (risposteRotte.length)
    segnala(etichetta, `richieste fallite:\n     - ${risposteRotte.join("\n     - ")}`);

  // --- 2. Ogni elemento azionabile viene davvero cliccato ------------------------------
  // Si ricarica fra un clic e l'altro: un clic può smontare il DOM e invalidare gli
  // handle successivi. Lento, ma è un cancello e deve essere esaustivo.
  const quantiAzionabili = await tab.locator(SELETTORE_AZIONABILI).count();
  for (let i = 0; i < quantiAzionabili; i++) {
    const prima = messaggi.length;
    const elemento = tab.locator(SELETTORE_AZIONABILI).nth(i);
    let descrizione = `elemento #${i}`;
    try {
      descrizione = await elemento.evaluate((el) => {
        const testo = (el.textContent ?? "").trim().slice(0, 40);
        return `<${el.tagName.toLowerCase()}> ${testo || el.getAttribute("aria-label") || "(senza testo)"}`;
      });
      if (!(await elemento.isVisible())) continue;
      await elemento.click({ timeout: 5_000, trial: false });
      await tab.waitForTimeout(250);
    } catch (e) {
      segnala(etichetta, `clic fallito su ${descrizione}: ${e.message.split("\n")[0]}`);
    }
    const nuovi = messaggi.slice(prima);
    if (nuovi.length)
      segnala(etichetta, `clic su ${descrizione} produce:\n     - ${nuovi.join("\n     - ")}`);

    if (tab.url() !== url) await tab.goto(url, { waitUntil: "networkidle" });
    else await tab.reload({ waitUntil: "networkidle" });
  }

  // --- 3. I collegamenti interni portano da qualche parte ------------------------------
  const href = await tab.$$eval("a[href]", (as) => as.map((a) => a.getAttribute("href")).filter(Boolean));
  const interni = [...new Set(href.filter((h) => h.startsWith("/") && !h.startsWith("//")))];
  for (const h of interni) {
    const r = await tab.request.get(new URL(h, base).toString(), { failOnStatusCode: false });
    if (r.status() >= 400) segnala(etichetta, `collegamento rotto: ${h} risponde ${r.status()}`);
  }

  // --- 4. Il focus da tastiera si vede -------------------------------------------------
  const quantiFocalizzabili = Math.min(
    await tab
      .locator(
        "a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex='-1'])",
      )
      .count(),
    40,
  );
  for (let i = 0; i < quantiFocalizzabili; i++) {
    await tab.keyboard.press("Tab");
    const esito = await tab.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return null;
      const s = getComputedStyle(el);
      const visibile =
        (s.outlineStyle !== "none" && parseFloat(s.outlineWidth) > 0) ||
        s.boxShadow !== "none" ||
        s.getPropertyValue("--focus-visibile") === "1";
      return { visibile, tag: el.tagName.toLowerCase(), testo: (el.textContent ?? "").trim().slice(0, 30) };
    });
    if (esito && !esito.visibile) {
      segnala(etichetta, `focus non visibile su <${esito.tag}> ${esito.testo}`);
      break; // un caso basta a bocciare: non serve inondare il rapporto
    }
  }

  await contesto.close();
  console.log(`  ok  ${etichetta}  (${quantiAzionabili} azionabili, ${interni.length} collegamenti)`);
}

async function main() {
  const pagine = soloPercorso ? PAGINE.filter((p) => p.percorso === soloPercorso) : PAGINE;
  if (!pagine.length) {
    console.error(`Nessuna pagina da verificare${soloPercorso ? ` per '${soloPercorso}'` : ""}.`);
    process.exit(1);
  }

  console.log(`Cancello visivo su ${base}`);
  console.log(`${pagine.length} pagine × ${LARGHEZZE.length} larghezze × ${TEMI.length} temi\n`);

  rmSync(SCREENSHOT, { recursive: true, force: true });
  const browser = await chromium.launch();
  try {
    for (const pagina of pagine) {
      for (const misura of LARGHEZZE) {
        for (const tema of TEMI) {
          await verificaPagina(browser, pagina, misura, tema);
        }
      }
    }
  } finally {
    await browser.close();
  }

  // --- Il tema scuro esiste davvero? ---------------------------------------------------
  // Confronto a posteriori: se chiaro e scuro producono lo stesso colore di fondo, il tema
  // non è implementato e ogni altro esito su «dark» è privo di significato.
  for (const pagina of pagine) {
    for (const misura of LARGHEZZE) {
      const chiaro = fondiPerTema.get(`${pagina.percorso}|${misura.nome}|light`);
      const scuro = fondiPerTema.get(`${pagina.percorso}|${misura.nome}|dark`);
      if (chiaro && scuro && chiaro === scuro) {
        segnala(
          `${pagina.percorso} · ${misura.nome}`,
          `chiaro e scuro rendono lo stesso fondo (${chiaro}): il tema scuro non è applicato`,
        );
      }
    }
  }

  if (difetti.length) {
    console.error(`\n✗ CANCELLO NON SUPERATO — ${difetti.length} difetti\n`);
    difetti.forEach((d, i) => console.error(`  ${i + 1}. ${d}\n`));
    process.exit(1);
  }
  console.log(`\n✓ Cancello superato. Screenshot in apps/web/screenshot/`);
}

await main();
