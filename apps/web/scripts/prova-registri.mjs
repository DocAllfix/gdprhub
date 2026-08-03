#!/usr/bin/env node
// Prova dei registri, in produzione, undici su undici.
//
// Il cancello visivo dice che i pulsanti si premono senza rompere niente. Questo dice
// un'altra cosa: che i NUMERI sono giusti. In un registro di violazioni il difetto che
// costa caro non è un bottone morto, è un termine calcolato male che dichiara «in regola»
// una notifica fuori tempo massimo.
//
// Si verifica sull'aritmetica che si sbaglia davvero, con date scelte apposta:
//
//   conosciuta 80 ore fa   → SCADUTA          (le 72 ore sono ore, non tre giorni)
//   conosciuta 60 ore fa   → IN SCADENZA      (ultimo quarto: le ultime 18)
//   conosciuta  2 ore fa   → IN TERMINE
//   chiusa senza esito     → RIFIUTATA        (una spunta non è dimostrabile)
//   chiusa con esito       → ASSOLTA IN RITARDO, e il ritardo resta scritto
//   data nel futuro        → RIFIUTATA dal SERVER, non dal browser
//
//   pnpm prova:registri                            contro http://127.0.0.1:3100
//   pnpm prova:registri https://esempio.app        contro l'istanza online
//
// Le credenziali arrivano da .env.local (ADMIN_EMAIL / ADMIN_PASSWORD).

import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const BASE = process.argv[2] ?? "http://127.0.0.1:3100";
const RADICE = join(dirname(fileURLToPath(import.meta.url)), "..");

const TIPI = [
  "violazione",
  "diritto",
  "segnalazione",
  "flusso-odv",
  "formazione",
  "sorveglianza",
  "verifica-attrezzatura",
  "fornitore",
  "trasferimento",
  "trattamento",
  "dpia",
];

const env = Object.fromEntries(
  readFileSync(join(RADICE, ".env.local"), "utf8")
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

let passate = 0;
const difetti = [];

function prova(nome, condizione, dettaglio = "") {
  if (condizione) {
    passate++;
    console.log(`  ok   ${nome}`);
  } else {
    difetti.push(`${nome}${dettaglio ? ` — ${dettaglio}` : ""}`);
    console.log(`  ROTTO ${nome}${dettaglio ? ` — ${dettaglio}` : ""}`);
  }
}

/** Un istante espresso come lo vuole `datetime-local`, nel fuso del browser. */
const oreFa = (ore) => {
  const d = new Date(Date.now() - ore * 3_600_000);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
};

/**
 * Compila ogni campo obbligatorio del modulo aperto, qualunque sia il registro.
 *
 * I campi si leggono dal DOM invece che da un elenco scritto qui: è l'unico modo perché
 * questa prova resti vera quando si aggiunge un registro. Un elenco scritto a mano
 * diventerebbe silenziosamente incompleto, e una prova incompleta che passa è peggio di
 * nessuna prova.
 */
async function compila(tab, { quando }) {
  const modulo = tab.locator("form", { has: tab.locator('input[name="titolo"]') });

  await modulo.locator('input[name="titolo"]').fill(`Prova automatica ${Date.now()}`);
  await modulo.locator('input[name="conosciutoIl"]').fill(quando);

  // I campi propri del tipo: si riconoscono dal prefisso `d_`.
  for (const campo of await modulo.locator("[name^=d_]").all()) {
    if (!(await campo.isVisible())) continue;
    const tag = await campo.evaluate((e) => e.tagName.toLowerCase());
    const tipo = await campo.getAttribute("type");
    const obbligatorio = (await campo.getAttribute("required")) !== null;

    if (tag === "select") {
      // Si sceglie sempre la SECONDA opzione: la prima è il trattino vuoto, e selezionarla
      // farebbe passare per «compilato» un campo che il server deve rifiutare.
      const opzioni = await campo.locator("option").all();
      if (opzioni.length > 1) await campo.selectOption({ index: 1 });
      continue;
    }
    if (tipo === "checkbox") continue;
    if (!obbligatorio && tag !== "textarea") continue;
    if (tipo === "number") await campo.fill("3");
    else if (tipo === "date") await campo.fill(new Date().toISOString().slice(0, 10));
    else await campo.fill("Valore di prova");
  }
}

/** Il testo dello stato del termine della prima riga dell'elenco. */
async function primoTermine(tab) {
  const riga = tab.locator("main ul > li").first();
  await riga.waitFor({ state: "visible", timeout: 15_000 });
  return (await riga.locator("span.font-mono").first().innerText()).trim();
}

async function principale() {
  console.log(`\nProva dei registri su ${BASE}\n${"─".repeat(60)}`);

  const browser = await chromium.launch();
  const contesto = await browser.newContext();

  // Accesso via API, una volta: il limitatore di frequenza è attivo in produzione ed è
  // giusto che lo sia.
  const accesso = await contesto.request.post(new URL("/api/auth/sign-in/email", BASE).toString(), {
    // Le stesse credenziali del cancello visivo: un'utenza dedicata alla verifica, così
    // una prova che sbaglia la password non blocca l'accesso del committente.
    data: {
      email: env.GATE_EMAIL ?? env.ADMIN_EMAIL,
      password: env.GATE_PASSWORD ?? env.ADMIN_PASSWORD,
    },
    failOnStatusCode: false,
  });
  if (!accesso.ok()) {
    console.error(`Accesso non riuscito: ${accesso.status()}`);
    process.exit(1);
  }

  const tab = await contesto.newPage();
  const erroriConsole = [];
  tab.on("console", (m) => {
    if (m.type() === "error") erroriConsole.push(m.text());
  });

  await tab.goto(new URL("/portafoglio", BASE).toString(), { waitUntil: "networkidle" });
  const primaAzienda = await tab.locator('a[href^="/azienda/"]').first().getAttribute("href");
  if (!primaAzienda) {
    console.error("Nessuna azienda nel portafoglio: non c'è niente su cui provare.");
    process.exit(1);
  }
  const azienda = primaAzienda.split("/").slice(0, 3).join("/");
  console.log(`Azienda: ${azienda}\n`);

  // ── 1. L'aritmetica delle 72 ore, sui tre casi che contano ──────────────────────
  console.log("1. Le 72 ore, sui tre casi che si sbagliano");
  const casi = [
    { ore: 80, atteso: /scadut/i, nome: "80 ore fa → SCADUTA (non «tre giorni»)" },
    { ore: 60, atteso: /restano|scadenza/i, nome: "60 ore fa → ultimo quarto, avvisa" },
    { ore: 2, atteso: /restano/i, nome: "2 ore fa → in termine, con le ore residue" },
  ];
  for (const caso of casi) {
    await tab.goto(new URL(`${azienda}/registro/violazione`, BASE).toString(), {
      waitUntil: "networkidle",
    });
    await tab.getByRole("button", { name: /^Apri violazione$/ }).click();
    await compila(tab, { quando: oreFa(caso.ore) });
    await tab.locator('form button[type="submit"]').first().click();
    await tab.waitForTimeout(2500);
    const termine = await primoTermine(tab);
    prova(caso.nome, caso.atteso.test(termine), `letto «${termine}»`);
  }

  // ── 2. Il server rifiuta ciò che il browser lascia passare ──────────────────────
  console.log("\n2. La validazione sta sul server, non nel browser");
  await tab.goto(new URL(`${azienda}/registro/violazione`, BASE).toString(), {
    waitUntil: "networkidle",
  });
  await tab.getByRole("button", { name: /^Apri violazione$/ }).click();
  await compila(tab, { quando: oreFa(-48) }); // fra due giorni
  await tab.locator('form button[type="submit"]').first().click();
  await tab.waitForTimeout(2500);
  const avviso = await tab
    .locator('[role="alert"]')
    .first()
    .innerText()
    .catch(() => "");
  prova(
    "una data futura viene RIFIUTATA (darsi tempo che non si ha)",
    /futuro/i.test(avviso),
    `avviso «${avviso.slice(0, 90)}»`,
  );

  // ── 3. Chiudere un termine richiede di dire come ────────────────────────────────
  console.log("\n3. Un obbligo assolto senza esito non prova niente");
  await tab.goto(new URL(`${azienda}/registro/violazione`, BASE).toString(), {
    waitUntil: "networkidle",
  });
  const primaRiga = tab.locator("main ul > li").first();
  await primaRiga.locator("button[aria-expanded]").click();
  await tab.waitForTimeout(500);

  // Quattro caratteri: il browser accetta (non c'è `minlength`), il server no.
  await primaRiga.locator('textarea[name="esito"]').fill("ok");
  await primaRiga.getByRole("button", { name: /assolvimento/i }).click();
  await tab.waitForTimeout(2500);
  const rifiuto = await tab
    .locator('[role="alert"]')
    .first()
    .innerText()
    .catch(() => "");
  prova(
    "un esito di due caratteri viene RIFIUTATO dal server",
    /dimostrabile|assolt/i.test(rifiuto),
    `avviso «${rifiuto.slice(0, 90)}»`,
  );

  await tab.goto(new URL(`${azienda}/registro/violazione`, BASE).toString(), {
    waitUntil: "networkidle",
  });
  const riga2 = tab.locator("main ul > li").first();
  await riga2.locator("button[aria-expanded]").click();
  await tab.waitForTimeout(500);
  await riga2
    .locator('textarea[name="esito"]')
    .fill("Notifica trasmessa al Garante il 3 agosto, protocollo 2026/1187.");
  await riga2.getByRole("button", { name: /assolvimento/i }).click();
  await tab.waitForTimeout(3000);
  const dopoChiusura = await primoTermine(tab);
  prova(
    "assolta in ritardo resta scritta come tardiva",
    /ritardo/i.test(dopoChiusura),
    `letto «${dopoChiusura}»`,
  );

  // ── 4. Tutti e undici i registri accettano una voce ─────────────────────────────
  console.log("\n4. Undici registri, una voce ciascuno");
  for (const tipo of TIPI) {
    const url = new URL(`${azienda}/registro/${tipo}`, BASE).toString();
    await tab.goto(url, { waitUntil: "networkidle" });

    const intestazione = await tab.locator("h1").first().innerText();
    const prima = await tab.locator("main ul > li").count();

    const bottone = tab.locator("[data-tour=apri-voce]");
    if ((await bottone.count()) === 0) {
      prova(`${tipo}: modulo di apertura presente`, false, "il pulsante non c'è");
      continue;
    }
    await bottone.click();
    await compila(tab, { quando: oreFa(3) });
    await tab.locator('form button[type="submit"]').first().click();
    await tab.waitForTimeout(2500);

    const dopo = await tab.locator("main ul > li").count();
    const errore = await tab
      .locator('[role="alert"]')
      .first()
      .innerText()
      .catch(() => "");
    prova(
      `${tipo} · ${intestazione}: la voce viene registrata`,
      dopo > prima,
      errore || `righe ${prima} → ${dopo}`,
    );
  }

  // ── 5. Il protocollo progredisce e non si ripete ────────────────────────────────
  console.log("\n5. Il protocollo identifica una voce sola");
  await tab.goto(new URL(`${azienda}/registro/violazione`, BASE).toString(), {
    waitUntil: "networkidle",
  });
  const numeri = await tab.locator("main ul > li span.font-mono:has-text('n. ')").allInnerTexts();
  prova(
    "nessun numero di protocollo ripetuto",
    new Set(numeri).size === numeri.length,
    `${numeri.length} voci, ${new Set(numeri).size} numeri distinti`,
  );

  // ── 6. L'esportazione, art. 30.3 ────────────────────────────────────────────────
  console.log("\n6. Il registro si consegna, non solo si tiene");
  const csv = await contesto.request.get(new URL(`${azienda}/registro/trattamento/esporta`, BASE).toString());
  const testo = await csv.text();
  prova("l'esportazione risponde 200", csv.ok(), `stato ${csv.status()}`);
  prova(
    "è un CSV con il BOM che Excel italiano si aspetta",
    testo.startsWith("﻿"),
    `comincia con ${JSON.stringify(testo.slice(0, 6))}`,
  );
  prova(
    "porta le colonne dell'art. 30.1",
    /Finalità del trattamento/.test(testo) && /Termine di conservazione/.test(testo),
    testo.split("\r\n")[0]?.slice(0, 120),
  );
  prova("contiene le voci registrate", testo.split("\r\n").length > 2, `${testo.split("\r\n").length} righe`);

  // ── 7. Isolamento: la rotta di esportazione non è una porta di servizio ─────────
  console.log("\n7. L'esportazione non aggira il guard");
  const anonimo = await browser.newContext();
  const senzaSessione = await anonimo.request.get(
    new URL(`${azienda}/registro/trattamento/esporta`, BASE).toString(),
    { failOnStatusCode: false, maxRedirects: 0 },
  );
  prova(
    "senza sessione l'esportazione non consegna dati",
    senzaSessione.status() >= 300 && !(await senzaSessione.text()).includes("Finalità"),
    `stato ${senzaSessione.status()}`,
  );
  await anonimo.close();

  // ── 8. ⌘K trova i registri ──────────────────────────────────────────────────────
  console.log("\n8. Si arriva a un registro cercandolo");
  await tab.goto(new URL("/portafoglio", BASE).toString(), { waitUntil: "networkidle" });
  await tab.keyboard.press("Control+K");
  await tab.waitForTimeout(400);
  await tab.keyboard.type("violazioni");
  await tab.waitForTimeout(1800);
  const risultati = await tab.locator('[role="option"], [role="listbox"] li, [cmdk-item]').allInnerTexts();
  const trovato = risultati.some((r) => /violazion/i.test(r));
  prova("⌘K trova il registro delle violazioni", trovato, `${risultati.length} risultati`);
  if (trovato) {
    await tab.keyboard.press("Enter");
    await tab.waitForTimeout(2500);
    prova("e ci porta davvero", /\/registro\//.test(tab.url()), tab.url().replace(BASE, ""));
  }

  // ── 9. La console resta pulita ──────────────────────────────────────────────────
  console.log("\n9. Nessun rumore in console");
  const veri = erroriConsole.filter((e) => !/favicon|ERR_ABORTED/i.test(e));
  prova("nessun errore in console durante tutta la prova", veri.length === 0, veri.slice(0, 3).join(" · "));

  await browser.close();

  console.log(`\n${"─".repeat(60)}`);
  console.log(`${passate} verifiche passate, ${difetti.length} difetti`);
  if (difetti.length > 0) {
    console.log("\nDifetti:");
    for (const d of difetti) console.log(`  · ${d}`);
    process.exit(1);
  }
  console.log("Registri verdi.\n");
}

principale().catch((e) => {
  console.error(e);
  process.exit(1);
});
