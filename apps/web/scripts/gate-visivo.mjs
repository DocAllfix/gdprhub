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
// `[data-cancello=salta]` esce dalla spazzata, e ogni esclusione porta il suo perché
// scritto accanto al componente. L'unica finora: «Nuova password» nelle impostazioni, che
// rigenera la password di ogni utenza compresa quella con cui il cancello rientra — tre
// giri bocciati con 401 prima di capirlo.
//
// Un'esclusione non è un pulsante che nessuno verifica: è un pulsante che va verificato
// ALTROVE, con un test che crea un'utenza usa e getta e controlla che la nuova password
// funzioni davvero. Il cancello non saprebbe farlo comunque.
//
// Il conteggio degli esclusi si stampa a ogni giro: un'esclusione che si moltiplica in
// silenzio diventa il modo per non verificare più niente.
const SELETTORE_AZIONABILI = [
  "button:not([disabled])",
  "[role=button]:not([aria-disabled=true])",
  "summary",
  "input[type=checkbox]:not([disabled])",
  "input[type=radio]:not([disabled])",
  "[role=switch]",
  "[role=tab]",
]
  .map((s) => `${s}:not([data-cancello=salta])`)
  .join(", ");

const SELETTORE_ESCLUSI = "[data-cancello=salta]";

// --- Sessione ---------------------------------------------------------------------------
// Le pagine operative stanno dietro il guard. Il cancello apre la sessione chiamando
// l'endpoint di Better Auth: i cookie finiscono nel contesto, come per un accesso vero.
//
// Se le credenziali mancano o l'accesso fallisce, il cancello BOCCIA invece di saltare le
// pagine: una verifica che si autoesclude in silenzio è il modo migliore per credere di
// aver controllato qualcosa che nessuno ha guardato.
// Si entra UNA VOLTA sola e si riusano i cookie. L'autenticazione ha un limitatore di
// frequenza — giusto che ci sia, protegge da chi prova le password a raffica — e un
// cancello che apre una sessione per ognuna delle 24 combinazioni di pagina, larghezza e
// tema lo fa scattare: il primo giro è finito con 24 rifiuti 429 e zero pagine verificate.
const CREDENZIALI = {
  email: process.env.GATE_EMAIL ?? process.env.ADMIN_EMAIL,
  password: process.env.GATE_PASSWORD ?? process.env.ADMIN_PASSWORD,
};

/** Cookie di una sessione valida, ottenuti una sola volta e riusati da tutti i contesti. */
let cookieSessione = null;

async function accediUnaVolta(browser) {
  if (cookieSessione) return true;
  if (!CREDENZIALI.email || !CREDENZIALI.password) {
    segnala("sessione", "ADMIN_EMAIL/ADMIN_PASSWORD assenti: impossibile verificare le pagine protette");
    return false;
  }
  const contesto = await browser.newContext();
  // Il limitatore di tentativi è attivo e va rispettato, non aggirato: se risponde 429 si
  // aspetta e si riprova, invece di allentare la configurazione di produzione per far
  // passare un test.
  let r = null;
  for (let tentativo = 0; tentativo < 4; tentativo++) {
    r = await contesto.request.post(new URL("/api/auth/sign-in/email", base).toString(), {
      data: { email: CREDENZIALI.email, password: CREDENZIALI.password },
      failOnStatusCode: false,
    });
    if (r.ok()) break;
    if (r.status() !== 429) break;
    await new Promise((risolvi) => setTimeout(risolvi, 12_000));
  }
  if (!r || !r.ok()) {
    segnala(
      "sessione",
      `accesso non riuscito (${r ? r.status() : "nessuna risposta"}): le pagine protette non sono verificabili`,
    );
    await contesto.close();
    return false;
  }
  cookieSessione = await contesto.cookies();
  await contesto.close();
  return true;
}

/** Innesta la sessione già aperta in un contesto nuovo, senza ripassare dal login. */
async function apriSessione(contesto, etichetta) {
  if (!cookieSessione) {
    segnala(etichetta, "nessuna sessione disponibile: le pagine protette non sono verificabili");
    return false;
  }
  await contesto.addCookies(cookieSessione);
  return true;
}

async function verificaPagina(browser, pagina, misura, tema) {
  const etichetta = `${pagina.percorso} · ${misura.nome} · ${tema}`;
  const contesto = await browser.newContext({
    viewport: { width: misura.larghezza, height: misura.altezza },
    colorScheme: tema,
    locale: "it-IT",
    timezoneId: "Europe/Rome",
  });

  if (pagina.autenticata && !(await apriSessione(contesto, etichetta))) {
    await contesto.close();
    return;
  }

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

  // Una pagina protetta che finisce sull'accesso non è stata verificata: il resto del giro
  // controllerebbe il modulo di login credendo di controllare il portafoglio.
  if (pagina.autenticata && new URL(tab.url()).pathname.startsWith("/accedi")) {
    segnala(etichetta, "la sessione non regge: la pagina protetta rimanda all'accesso");
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

  // --- 0-bis. La pagina ha reso sé stessa, non il proprio ripiego? ---------------------
  // Una schermata che rende «il modulo non è attivo» o uno stato vuoto non produce errori
  // di console né richieste rotte: passa verde e non verifica niente. È successo, e me ne
  // sono accorto per caso guardando il numero di comandi azionabili.
  if (pagina.atteso && (await tab.locator(pagina.atteso).count()) === 0) {
    segnala(
      etichetta,
      `la pagina si è caricata ma «${pagina.atteso}» non c'è: ha reso un ripiego o uno stato vuoto`,
    );
  }

  // --- 1. Nessun errore al caricamento ------------------------------------------------
  if (messaggi.length) segnala(etichetta, `al caricamento:\n     - ${messaggi.join("\n     - ")}`);
  if (risposteRotte.length)
    segnala(etichetta, `richieste fallite:\n     - ${risposteRotte.join("\n     - ")}`);

  // --- 2. I collegamenti interni portano da qualche parte ------------------------------
  const href = await tab.$$eval("a[href]", (as) => as.map((a) => a.getAttribute("href")).filter(Boolean));
  const interni = [...new Set(href.filter((h) => h.startsWith("/") && !h.startsWith("//")))];
  for (const h of interni) {
    const r = await tab.request.get(new URL(h, base).toString(), { failOnStatusCode: false });
    if (r.status() >= 400) segnala(etichetta, `collegamento rotto: ${h} risponde ${r.status()}`);
  }

  // --- 3. Il focus da tastiera si vede -------------------------------------------------
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

  // --- 4. Ogni elemento azionabile viene cliccato, e l'USCITA per ultima ---------------
  // Collegamenti e focus si verificano PRIMA: l'ultimo clic chiude la sessione, e dopo
  // quello si è sulla pagina di accesso. Controllarli dopo avrebbe misurato quella.
  //
  // NON SI ITERA PER INDICE. Un clic può togliere di mezzo altri comandi — disattivare un
  // modulo fa sparire la tabella e i suoi sette pulsanti di ordinamento — e gli indici
  // calcolati all'inizio puntano nel vuoto. Si raccolgono descrittori stabili e a ogni giro
  // si ricerca l'elemento: se è sparito per effetto di un clic precedente lo si dice, non lo
  // si conta come guasto.
  const bersagli = await tab.locator(SELETTORE_AZIONABILI).evaluateAll((elementi) =>
    elementi.map((e, i) => ({
      indice: i,
      tour: e.dataset.tour ?? null,
      testo: (e.textContent ?? "").trim().slice(0, 40) || e.getAttribute("aria-label") || "",
      tag: e.tagName.toLowerCase(),
    })),
  );

  // L'USCITA SI CLICCA PER ULTIMA e chiude la sessione condivisa dal cancello: dopo va
  // riaperta. Cliccarla a metà giro lasciava le pagine successive senza verifica — e il
  // guasto restava invisibile per cinque minuti, quanto dura la cache del cookie di
  // sessione, così sembrava che il difetto fosse altrove.
  const uscita = bersagli.find((b) => b.tour === "esci");
  const ordinati = uscita ? [...bersagli.filter((b) => b !== uscita), uscita] : bersagli;
  const quantiAzionabili = ordinati.length;
  let scomparsi = 0;

  for (const bersaglio of ordinati) {
    const descrizione = `<${bersaglio.tag}> ${bersaglio.testo || "(senza testo)"}`;
    const elemento = bersaglio.tour
      ? tab.locator(`[data-tour="${bersaglio.tour}"]`)
      : tab.locator(SELETTORE_AZIONABILI).nth(bersaglio.indice);

    if ((await elemento.count()) === 0) {
      scomparsi += 1;
      continue;
    }
    if (!(await elemento.first().isVisible())) continue;

    const primaConsole = messaggi.length;
    const primaRete = risposteRotte.length;
    let cliccato = false;
    try {
      await elemento.first().click({ timeout: 5_000, trial: false });
      cliccato = true;
      await tab.waitForTimeout(200);
    } catch (e) {
      segnala(etichetta, `clic fallito su ${descrizione}: ${e.message.split("\n")[0]}`);
    }

    // Una richiesta respinta non è di per sé un difetto: premere «Accedi» a modulo vuoto
    // DEVE produrre un 400, ed è il comportamento corretto. Il difetto è che l'interfaccia
    // taccia. Quindi 5xx ed eccezioni bocciano sempre; un 4xx boccia solo se dopo il clic
    // l'utente non vede alcun messaggio.
    const nuoveRisposte = risposteRotte.slice(primaRete);
    const nuoviMessaggi = messaggi.slice(primaConsole);
    const eccezioni = nuoviMessaggi.filter((m) => m.startsWith("eccezione"));
    const guasti = nuoveRisposte.filter((r) => Number(r.split(" ")[0]) >= 500);
    const respinte = nuoveRisposte.filter((r) => Number(r.split(" ")[0]) < 500);
    const avvisoVisibile =
      respinte.length > 0 && (await tab.locator('[role="alert"]').filter({ hasText: /\S/ }).count()) > 0;

    if (eccezioni.length) segnala(etichetta, `clic su ${descrizione}: ${eccezioni.join(" · ")}`);
    if (guasti.length) {
      segnala(etichetta, `clic su ${descrizione}: il server risponde ${guasti.join(" · ")}`);
    }
    if (respinte.length && !avvisoVisibile) {
      segnala(
        etichetta,
        `clic su ${descrizione}: richiesta respinta (${respinte.join(" · ")}) e NESSUN messaggio all'utente`,
      );
    }
    const altri = nuoviMessaggi.filter(
      (m) => !m.startsWith("eccezione") && !/Failed to load resource/i.test(m),
    );
    if (altri.length) {
      segnala(etichetta, `clic su ${descrizione} produce:\n     - ${altri.join("\n     - ")}`);
    }

    if (bersaglio === uscita && cliccato) {
      await tab.waitForURL(/\/accedi/, { timeout: 15_000 }).catch(() => {});
      if (!new URL(tab.url()).pathname.startsWith("/accedi")) {
        segnala(etichetta, `«Esci» non porta all'accesso: resta su ${new URL(tab.url()).pathname}`);
      }
      // La sessione appena chiusa era quella condivisa: si riapre per chi viene dopo.
      cookieSessione = null;
      if (!(await accediUnaVolta(browser))) {
        segnala(etichetta, "dopo l'uscita non è stato possibile riaprire la sessione del cancello");
      }
      break;
    }

    // `domcontentloaded` e non `networkidle`: fra un clic e l'altro serve un DOM fresco,
    // non l'assenza di traffico. Con `networkidle` su pagine dinamiche il giro completo
    // passava da minuti a decine di minuti, e un cancello che nessuno ha il tempo di
    // eseguire smette di essere un cancello.
    if (tab.url() !== url) await tab.goto(url, { waitUntil: "domcontentloaded" });
    else await tab.reload({ waitUntil: "domcontentloaded" });
    await tab.waitForLoadState("load");

    if (pagina.autenticata && new URL(tab.url()).pathname.startsWith("/accedi")) {
      segnala(etichetta, `dopo «${descrizione}» la sessione è caduta senza che si sia usciti`);
      break;
    }
  }

  if (scomparsi > 0) {
    console.log(`      ${scomparsi} comandi spariti per effetto di clic precedenti (atteso)`);
  }

  await contesto.close();
  const esclusi = await tab.locator(SELETTORE_ESCLUSI).count();
  console.log(
    `  ok  ${etichetta}  (${quantiAzionabili} azionabili, ${interni.length} collegamenti${
      esclusi > 0 ? `, ${esclusi} esclusi` : ""
    })`,
  );
}

/**
 * Risolve i percorsi dinamici leggendo il portafoglio.
 *
 * L'identificativo dell'azienda è un UUID generato al seed: scriverlo nell'inventario
 * significherebbe un cancello che si rompe alla prima riseminatura. Lo si chiede
 * all'applicazione, e se non c'è nulla da aprire il cancello lo dice invece di saltare
 * la pagina.
 */
async function risolviDinamiche(browser, pagine) {
  if (!pagine.some((p) => p.dinamica)) return pagine;

  const contesto = await browser.newContext({ locale: "it-IT" });
  let primaAzienda = null;
  if (await apriSessione(contesto, "risoluzione dei percorsi dinamici")) {
    const tab = await contesto.newPage();
    await tab.goto(new URL("/portafoglio", base).toString(), { waitUntil: "networkidle" });
    // SI PRENDE UN COLLEGAMENTO ALLA SCHEDA, NON UN COLLEGAMENTO QUALSIASI SOTTO /azienda.
    //
    // Il primo `a[href^="/azienda/"]` della pagina non è più quello della tabella: da
    // quando la barra laterale porta «Scade adesso», il primo collegamento è
    // /azienda/<id>/<dominio>, e concatenandoci /d81 il cancello chiedeva
    // /azienda/<id>/d81/d81 e si prendeva nove 404. Il difetto era nel cancello, non
    // nell'applicazione — ed è esattamente il genere di cosa per cui il cancello esiste,
    // solo vista dall'altra parte.
    const collegamenti = await tab.locator('a[href^="/azienda/"]').evaluateAll((nodi) =>
      nodi.map((n) => n.getAttribute("href")),
    );
    primaAzienda =
      collegamenti.find((h) => h && /^\/azienda\/[^/]+$/.test(h)) ??
      // Ripiego: se esistono solo collegamenti profondi, si tronca al primo segmento.
      collegamenti.find((h) => h)?.split("/").slice(0, 3).join("/") ??
      null;
  }
  await contesto.close();

  if (!primaAzienda) {
    segnala(
      "/azienda/:prima",
      "nessuna azienda nel portafoglio: la scheda azienda non è verificabile. Esegui `pnpm db:seed-demo`.",
    );
    return pagine.filter((p) => !p.dinamica);
  }
  // `:prima` diventa l'identificativo trovato; il resto del percorso si conserva, così
  // /azienda/:prima/d81 punta all'assessment della stessa azienda.
  return pagine.map((p) =>
    p.dinamica ? { ...p, percorso: p.percorso.replace("/azienda/:prima", primaAzienda) } : p,
  );
}

/**
 * Riaccende i moduli che il cancello ha spento cliccando.
 *
 * IL CANCELLO CLICCA TUTTO, ed è il suo valore: è così che si scopre che un comando è
 * rotto. Ma sulla scheda azienda quei comandi includono gli interruttori dei moduli, e un
 * clic li spegne davvero — non è una finta, è il prodotto. Il risultato era che le pagine
 * verificate DOPO trovavano un'istanza diversa da quella che dovevano verificare:
 * l'assessment rendeva «il modulo non è attivo» e il cancello diceva ok.
 *
 * Non si risolve smettendo di cliccare, che significherebbe non verificare più gli
 * interruttori. Si risolve rimettendo le cose com'erano alla fine, che è quello che farebbe
 * chiunque abbia usato l'istanza di qualcun altro.
 *
 * Il ripristino non è silenzioso: dice quanti ne ha riaccesi. Se il numero cresce di giro
 * in giro, qualcosa nel prodotto non riaccende più.
 */
async function ripristinaModuli(browser, pagine) {
  const scheda = pagine.find((p) => p.dinamica && /^\/azienda\/[^/]+$/.test(p.percorso));
  if (!scheda) return;

  const contesto = await browser.newContext({ locale: "it-IT" });
  if (!(await apriSessione(contesto, "ripristino dei moduli"))) {
    await contesto.close();
    return;
  }
  const tab = await contesto.newPage();
  let riaccesi = 0;
  try {
    await tab.goto(new URL(scheda.percorso, base).toString(), { waitUntil: "networkidle" });
    // «Attiva» compare solo sui moduli spenti: se non ce ne sono, non c'è nulla da fare.
    for (let i = 0; i < 6; i++) {
      const bottone = tab.locator('button:has-text("Attiva")').first();
      if ((await bottone.count()) === 0) break;
      await bottone.click();
      await tab.waitForLoadState("networkidle");
      riaccesi++;
    }
  } catch (errore) {
    segnala(
      "ripristino dei moduli",
      `non riuscito: ${errore instanceof Error ? errore.message.split("\n")[0] : errore}`,
    );
  }
  await contesto.close();
  if (riaccesi > 0) console.log(`\n  ripristinati ${riaccesi} moduli spenti dai clic del cancello`);
}

async function main() {
  const selezionate = soloPercorso ? PAGINE.filter((p) => p.percorso === soloPercorso) : PAGINE;
  if (!selezionate.length) {
    console.error(`Nessuna pagina da verificare${soloPercorso ? ` per '${soloPercorso}'` : ""}.`);
    process.exit(1);
  }

  rmSync(SCREENSHOT, { recursive: true, force: true });
  const browser = await chromium.launch();
  if (selezionate.some((p) => p.autenticata || p.dinamica)) await accediUnaVolta(browser);
  const pagine = await risolviDinamiche(browser, selezionate);

  console.log(`Cancello visivo su ${base}`);
  console.log(`${pagine.length} pagine × ${LARGHEZZE.length} larghezze × ${TEMI.length} temi\n`);

  try {
    for (const pagina of pagine) {
      for (const misura of LARGHEZZE) {
        for (const tema of TEMI) {
          // UNA PAGINA CHE ESPLODE È UN DIFETTO, NON LA FINE DEL GIRO.
          //
          // Fino a qui un timeout di navigazione usciva come eccezione non gestita e
          // uccideva l'intero cancello: quarantotto combinazioni verificate, nessun
          // verdetto stampato, e il rapporto perso. È capitato sullo scadenzario, che è
          // la pagina più pesante del prodotto, e l'effetto è stato non sapere nulla
          // nemmeno delle pagine già passate.
          //
          // Ora l'errore diventa un difetto con il suo nome e il giro prosegue. Il
          // cancello boccia comunque — non è un modo per ignorare il problema, è un modo
          // per vederlo insieme a tutti gli altri.
          try {
            await verificaPagina(browser, pagina, misura, tema);
          } catch (errore) {
            segnala(
              `${pagina.percorso} · ${misura.nome} · ${tema}`,
              `la verifica è esplosa: ${errore instanceof Error ? errore.message.split("\n")[0] : errore}`,
            );
          }
        }
      }
    }
    await ripristinaModuli(browser, pagine);
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
