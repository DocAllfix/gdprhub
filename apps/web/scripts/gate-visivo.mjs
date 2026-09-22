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
//   node scripts/gate-visivo.mjs                      → contro http://localhost:3100
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
// LOCALHOST E NON 127.0.0.1, e non è indifferente.
//
// Next 16 in sviluppo blocca per impostazione predefinita le richieste alle proprie risorse
// di sviluppo che arrivano da un'origine diversa da quella con cui il server si presenta —
// e il server si presenta come `localhost`. Aperta su 127.0.0.1, la pagina scarica tutti gli
// script con 200 ma il WebSocket dell'aggiornamento a caldo viene respinto, e React NON SI
// IDRATA MAI: l'HTML c'è, i gestori degli eventi no.
//
// Il risultato era il peggiore possibile per un cancello: cliccava ogni elemento di ogni
// pagina su HTML morto, e passava verde, perché verifica gli errori e non gli effetti.
// L'unico clic di cui controllava l'effetto era «Esci», e infatti era l'unico che falliva —
// su tutte le pagine, in tutti i giri. Trovato il 2026-09-19 inseguendo proprio quello.
//
// In produzione non succede: il blocco riguarda solo le risorse di sviluppo.
const base = argomenti.find((a) => a.startsWith("http")) ?? "http://localhost:3100";
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

/**
 * «Esci» si verifica UNA VOLTA PER GIRO, non per ogni combinazione.
 *
 * Il limitatore di frequenza concede dieci accessi al minuto a `/sign-in/email`, ed e'
 * una regola di produzione che non si allenta per far passare un collaudo. Ma ogni clic
 * su «Esci» chiude la sessione condivisa e ne impone una nuova: con sedici pagine
 * protette per sei combinazioni sarebbero novantasei accessi, e il giro si ferma al
 * decimo con una raffica di 429.
 *
 * Non si perde copertura: «Esci» e' lo stesso identico comando su ogni pagina, montato
 * dalla barra laterale. Verificarlo novantasei volte non dice novantasei cose diverse.
 *
 * ⚠️ Prima della migrazione la tabella `rate_limit` non esisteva e il limitatore falliva
 * in silenzio: il cancello faceva novantasei accessi senza che nessuno se ne accorgesse.
 * Applicata la migrazione, il limitatore ha cominciato a funzionare e ha bocciato il giro.
 * Non era una regressione: era la prima volta che quel vincolo veniva davvero applicato.
 */
let uscitaVerificata = false;

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
  const url = new URL(pagina.percorso, base).toString();
  const contesto = await browser.newContext({
    viewport: { width: misura.larghezza, height: misura.altezza },
    colorScheme: tema,
    locale: "it-IT",
    timezoneId: "Europe/Rome",
  });

  // TRENTA SECONDI NON BASTANO A `/design`, e il limite non era nostro: e' il valore
  // predefinito di Playwright per le navigazioni.
  //
  // `/design` e' la vetrina del sistema di design: ventidue elementi azionabili, tutti i
  // componenti sui dati veri dei tre cataloghi. In sviluppo ogni clic porta una navigazione
  // e del lavoro di compilazione su richiesta, e su questa macchina una ricarica ogni tanto
  // supera i trenta secondi.
  //
  // Il sintomo era chiaramente intermittente: al primo giro e' esplosa la combinazione
  // `mobile · dark` su `waitForLoadState`, al secondo `tablet · dark` su `reload`. Una
  // causa deterministica non cambia bersaglio.
  //
  // Alzare la pazienza NON indebolisce nessun controllo: un timeout non e' un'asserzione
  // sul prodotto, e' quanto lo strumento aspetta prima di rinunciare. Ogni verifica vera —
  // console, rete, collegamenti, fuoco, clic, interattivita' — resta identica.
  contesto.setDefaultNavigationTimeout(90_000);

  if (pagina.autenticata && !(await apriSessione(contesto, etichetta))) {
    await contesto.close();
    return;
  }

  const tab = await contesto.newPage();

  // LA SOVRAPPOSIZIONE DI SVILUPPO DI NEXT NON E' IL PRODOTTO, e in produzione non esiste.
  //
  // `<nextjs-portal>` monta la barretta degli strumenti in basso a sinistra: esattamente
  // sopra il pulsante «Esci» della barra laterale. Il cancello ci sbatteva in due modi —
  // ventisei clic su «Esci» falliti per timeout («in quel punto c'e' nextjs-portal») e
  // ottantasei «focus non visibile», perche' l'attraversamento da tastiera ci finisce
  // dentro e quell'elemento non ha un anello di fuoco nostro da mostrare.
  //
  // Nasconderlo non nasconde un difetto: non fa parte di cio' che riceve il cliente. Se un
  // giorno il prodotto avesse un elemento con quel nome, questa riga andrebbe rivista.
  // `addInitScript` e non `addStyleTag`: il secondo aggiunge lo stile al documento CORRENTE,
  // e la navigazione che segue se lo porta via. Questo gira prima degli script di ogni
  // pagina, e si attacca a <html> perche' <body> potrebbe non esistere ancora.
  await tab.addInitScript(() => {
    // Gli script di inizializzazione girano PRIMA che il documento esista: al primo giro
    // `document.documentElement` era null e questo stesso codice sollevava un'eccezione,
    // che il cancello riportava sei volte per pagina. Si riprova finche' la radice c'e'.
    const metti = () => {
      if (!document.documentElement) {
        requestAnimationFrame(metti);
        return;
      }
      const stile = document.createElement("style");
      stile.textContent = "nextjs-portal{display:none!important}";
      document.documentElement.appendChild(stile);
    };
    metti();
  });

  // LO STATO ATTESO PUÒ NON ESSERE 200. La pagina «non trovata» risponde 404 ed è il suo
  // mestiere: un cancello che pretende 200 da tutti non può verificarla, e resterebbe
  // l'unica schermata di confine fuori da ogni controllo. `stato` si dichiara
  // nell'inventario e vale per la navigazione, per la sorveglianza della rete e per la
  // console — il browser registra da sé un `console.error` sul proprio stato 404.
  const statoAtteso = pagina.stato ?? 200;

  // L'esenzione è STRETTA: vale solo per lo stato dichiarato da questa pagina, quindi un 404
  // su un foglio di stile o su un'immagine continua a bocciare. Un'esenzione globale su
  // «404» spegnerebbe proprio il controllo che serve di più.
  const rumoreAtteso =
    statoAtteso === 200 ? null : new RegExp(`status of ${statoAtteso}(?![0-9])`, "i");

  const messaggi = [];
  const risposteRotte = [];
  tab.on("console", (m) => {
    if (!["error", "warning"].includes(m.type())) return;
    const testo = m.text();
    if (CONSOLE_IGNORATI.some((r) => r.test(testo))) return;
    if (rumoreAtteso?.test(testo)) return;
    messaggi.push(`console.${m.type()}: ${testo}`);
  });
  tab.on("pageerror", (e) => messaggi.push(`eccezione non gestita: ${e.message}`));

  tab.on("response", (r) => {
    if (r.status() >= 400 && !(r.status() === statoAtteso && r.url() === url)) {
      risposteRotte.push(`${r.status()} ${r.url()}`);
    }
  });

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

  if (!risposta || risposta.status() !== statoAtteso) {
    segnala(
      etichetta,
      `la pagina risponde ${risposta?.status() ?? "senza risposta"}, atteso ${statoAtteso}`,
    );
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

  // --- 00. La pagina è interattiva? -------------------------------------------------------
  // IL CONTROLLO CHE MANCAVA, e la sua assenza ha reso inutili tutti gli altri.
  //
  // Un clic su un bottone che React non ha agganciato non produce errori: non produce
  // niente. Quindi un cancello che guarda solo errori, rete e console passa verde su una
  // pagina completamente inerte — ed è successo, su tutte le pagine, per un'origine sbagliata
  // (vedi il commento su `base`). Qui si pretende la prova positiva: le fibre di React
  // attaccate al DOM. Se mancano, ogni verifica che segue sarebbe una verifica finta, quindi
  // la pagina si boccia e non si prosegue.
  const interattiva = await tab
    .waitForFunction(
      // SOLO SU <html> E <body>, e non su qualunque elemento. La prima versione cercava ovunque
      // e passava verde anche sulla pagina inerte: la sovrapposizione di sviluppo di Next monta
      // una PROPRIA radice React dentro <body>, che ha le sue fibre anche quando l'app non si è
      // idratata affatto. L'app, invece, idrata il documento intero, quindi le fibre stanno su
      // <html> e <body>: sono la prova che si è agganciata lei, e non qualcun altro.
      () =>
        [document.documentElement, document.body].some((n) =>
          Object.keys(n).some((k) => k.startsWith("__reactFiber")),
        ),
      null,
      { timeout: 20_000 },
    )
    .then(() => true)
    .catch(() => false);
  if (!interattiva) {
    segnala(
      etichetta,
      "la pagina NON è interattiva: React non si è agganciato al DOM, quindi ogni clic che seguirebbe cadrebbe su HTML morto. In sviluppo, controlla che il cancello apra l'origine con cui il server si presenta (localhost, non 127.0.0.1).",
    );
    await contesto.close();
    return;
  }

  // LO SCATTO VA DOPO IL CONTROLLO DI INTERATTIVITA', e prima era prima.
  //
  // Playwright, per fare uno screenshot stabile, nasconde il cursore di testo iniettando
  // `caret-color: transparent` negli `input`. Se lo scatto avviene mentre React si sta
  // ancora idratando, quello stile entra nel DOM prima che React finisca, e React lo
  // segnala come mancata corrispondenza — «A tree hydrated but some attributes... didn't
  // match». Un difetto del banco di prova travestito da difetto del prodotto.
  //
  // Si vedeva su due combinazioni su centodue, sempre a larghezza mobile: cioe' dove la
  // pagina e' piu' lenta a idratarsi. Una corsa, non un guasto.
  //
  // Spostandolo dopo il controllo, lo scatto ritrae anche una pagina davvero viva.
  mkdirSync(SCREENSHOT, { recursive: true });
  const nomeFile = `${pagina.percorso.replace(/\W+/g, "_") || "_radice"}--${misura.nome}--${tema}.png`;
  // `caret: "initial"` disattiva la cortesia di Playwright, che per default nasconde il
    // cursore di testo iniettando `caret-color: transparent`. Quello stile finisce nel DOM e
    // React, idratando un confine di sospensione ANCORA PENDENTE, lo segnala come mancata
    // corrispondenza. Spostare lo scatto dopo il controllo di interattivita non bastava: quel
    // controllo aspetta la radice, non i confini annidati. Meglio togliere l interferenza che
    // rincorrere la corsa.
    await tab.screenshot({ path: join(SCREENSHOT, nomeFile), fullPage: true, caret: "initial" });

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
  //
  // SI VERIFICA UNA ROTTA, NON DUECENTO URL QUASI UGUALI. Lo scadenzario ha una riga per
  // adempimento e ognuna porta a `/azienda/<id>/<dominio>?q=<codice>`: sono duecentosette
  // collegamenti che differiscono solo nella stringa di ricerca, e chiederli tutti
  // significa disegnare duecentosette volte la stessa schermata. Su funzioni serverless a
  // freddo il cancello ci moriva dentro — tre esplosioni per timeout a trenta secondi, e
  // nemmeno una di quelle richieste stava verificando qualcosa di nuovo.
  //
  // Si raggruppa per FORMA del percorso: gli identificativi diventano `:id`, la stringa di
  // ricerca sparisce, e di ogni forma si prova un esemplare solo. Duecentosette richieste
  // diventano tre, e le tre rotte restano verificate esattamente come prima.
  const href = await tab.$$eval("a[href]", (as) => as.map((a) => a.getAttribute("href")).filter(Boolean));
  const interni = [...new Set(href.filter((h) => h.startsWith("/") && !h.startsWith("//")))];

  const forma = (h) =>
    h
      .split("?")[0]
      .split("/")
      .map((s) => (/^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(s) ? ":id" : s))
      .join("/");

  const campioni = new Map();
  for (const h of interni) if (!campioni.has(forma(h))) campioni.set(forma(h), h);

  for (const h of campioni.values()) {
    // Il tempo concesso è generoso: una funzione serverless a freddo su una schermata da
    // centosettantuno adempimenti non risponde in trenta secondi, e bocciarla per questo
    // sarebbe misurare l'infrastruttura invece del collegamento.
    // SI RIPROVA UNA VOLTA PRIMA DI ACCUSARE, e la ragione e' misurata.
    //
    // Su tre giri completi consecutivi e' comparso esattamente un timeout per giro, ogni
    // volta su un bersaglio diverso e su un'operazione diversa: `/design mobile dark` su
    // `waitForLoadState`, `/design tablet dark` su `reload`, `/impostazioni mobile dark`
    // su questo collegamento a `/cruscotto`. Una causa deterministica non cambia bersaglio.
    //
    // E le pagine, interrogate direttamente, rispondono tutte sotto il secondo — cruscotto
    // compreso, che e' la piu' pesante. Il timeout non misurava la pagina: misurava la
    // contesa del momento, con browser, compilazione su richiesta e banca dati in coda.
    //
    // Una sola riprova distingue l'intermittenza dal guasto senza indebolire niente: un
    // collegamento davvero rotto fallisce anche la seconda volta. Non si riprova sugli
    // stati >= 400, che sono risposte vere e non vanno mai ignorate.
    const chiedi = () =>
      tab.request
        .get(new URL(h, base).toString(), { failOnStatusCode: false, timeout: 90_000 })
        .catch(() => null);
    let r = await chiedi();
    if (r === null) r = await chiedi();
    if (r === null) segnala(etichetta, `collegamento senza risposta entro 90 s, due volte: ${h}`);
    else if (r.status() >= 400) segnala(etichetta, `collegamento rotto: ${h} risponde ${r.status()}`);
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
  const uscita = uscitaVerificata ? undefined : bersagli.find((b) => b.tour === "esci");
  const esci = bersagli.find((b) => b.tour === "esci");
  const senzaUscita = esci ? bersagli.filter((b) => b !== esci) : bersagli;
  const ordinati = uscita ? [...senzaUscita, uscita] : senzaUscita;
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

    // SI CHIUDE CIÒ CHE UN CLIC PRECEDENTE HA APERTO.
    //
    // Un pannello a scomparsa stende un velo a tutto schermo, e da quel momento ogni clic
    // successivo finisce sul velo invece che sul comando: la spazzata riporta decine di
    // «clic fallito» su elementi che funzionano benissimo. È capitato sulla pagina delle
    // relazioni a larghezza tablet, dove il cassetto della navigazione resta aperto e
    // copre il pulsante che l'ha aperto.
    //
    // Il velo è già un comando di chiusura nel prodotto — si preme fuori per chiudere — e
    // premerlo qui è esattamente ciò che farebbe una persona.
    const velo = tab.locator(".fixed.inset-0[aria-label^='Chiudi']");
    if ((await velo.count()) > 0 && (await velo.first().isVisible())) {
      // SI CHIUDE CON ESC, non cliccando il velo.
      //
      // Il velo è largo quanto il viewport, e Playwright clicca il CENTRO di un elemento:
      // su un telefono da 390 px il centro cade a x=195, dentro i 224 px del cassetto che
      // sta sopra di esso. La verifica di raggiungibilità falliva, il `catch` la
      // silenziava, e il cassetto restava aperto a coprire il pulsante che l'aveva
      // aperto: quattro «clic fallito» su un pulsante che funziona benissimo, sempre e
      // solo sotto `lg`. Ho creduto per due giri che fosse una questione di tempi.
      //
      // Esc è la via d'uscita che il prodotto offre a chi non usa il puntatore, e usarla
      // qui la verifica a ogni pagina invece di darla per buona una volta sola.
      await tab.keyboard.press("Escape");
      await velo
        .first()
        .waitFor({ state: "hidden", timeout: 3_000 })
        .catch(() => {});
    }

    // SI TOGLIE IL FUOCO PRIMA DI CLICCARE, perché qui si sta impersonando un puntatore.
    //
    // «Salta al contenuto» è `sr-only` finché non riceve il fuoco, e allora si piazza in
    // alto a sinistra — sopra il pulsante del menu del telefono, che sta nello stesso
    // angolo. Chi clicca col dito non ha mai un collegamento di salto acceso; il cancello
    // sì, perché il clic precedente gliel'ha lasciato addosso, e da lì in poi il menu è
    // coperto da un elemento che per un utente vero non c'è.
    //
    // La navigazione da tastiera si verifica a parte, con la propria passata: lì il fuoco
    // è l'oggetto della prova, qui è un residuo.
    await tab.evaluate(() => {
      const attivo = document.activeElement;
      if (attivo instanceof HTMLElement) attivo.blur();
    });

    const primaConsole = messaggi.length;
    const primaRete = risposteRotte.length;
    let cliccato = false;
    try {
      // UN RITENTATIVO SOLO, e per una ragione precisa.
      //
      // Su una schermata che si ridisegna dopo un'azione precedente — la scheda azienda
      // riscrive i moduli quando se ne commuta uno — il nodo puntato dal localizzatore
      // sparisce e ricompare, e il clic scade aspettando che stia fermo. Non è un comando
      // rotto: è un comando colto a metà di un ridisegno, e una persona semplicemente
      // ricliccherebbe.
      //
      // Il secondo tentativo NON allunga il tempo: se il comando fosse davvero
      // irraggiungibile — coperto, disabilitato, fuori campo — fallirebbe di nuovo, e il
      // difetto resta. Un ritentativo a oltranza sarebbe il modo di non accorgersi mai di
      // niente.
      try {
        await elemento.first().click({ timeout: 5_000, trial: false });
      } catch (primoErrore) {
        if (!/Timeout/.test(primoErrore.message)) throw primoErrore;
        await tab.waitForTimeout(500);
        await elemento.first().click({ timeout: 5_000, trial: false });
      }
      cliccato = true;
      await tab.waitForTimeout(200);
    } catch (e) {
      // QUANDO UN CLIC FALLISCE, SI DICE COSA C'ERA SOPRA.
      //
      // «Timeout 5000ms exceeded» non è una diagnosi: è la constatazione che qualcosa
      // impediva il clic, e lascia a chi legge il compito di indovinare cosa. Ho perso tre
      // giri a ipotizzare tempi di animazione per un pulsante coperto da un pannello.
      // Un'informazione sola — quale elemento occupa quel punto — chiude la domanda subito.
      let coperto = "";
      try {
        const riquadro = await elemento.first().boundingBox();
        if (riquadro) {
          coperto = await tab.evaluate(
            ([x, y]) => {
              const sopra = document.elementFromPoint(x, y);
              if (!sopra) return "niente";
              const classi = String(sopra.className ?? "").slice(0, 60);
              return `${sopra.tagName.toLowerCase()}${classi ? `.${classi}` : ""}`;
            },
            [riquadro.x + riquadro.width / 2, riquadro.y + riquadro.height / 2],
          );
        }
      } catch {
        coperto = "";
      }
      segnala(
        etichetta,
        `clic fallito su ${descrizione}: ${e.message.split("\n")[0]}${coperto ? ` — in quel punto c'è ${coperto}` : ""}`,
      );
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
      uscitaVerificata = true;
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
    // `ERR_ABORTED` significa che una navigazione ne ha soppiantata un'altra: capita
    // quando un clic avvia un caricamento e il ripristino della pagina parte nello stesso
    // istante. Non è un difetto del prodotto, è una corsa fra due navigazioni nostre, e si
    // risolve riprovando una volta.
    //
    // SOLO `ERR_ABORTED`, e solo una volta: qualunque altro errore resta un difetto. Un
    // ritentativo generico trasformerebbe il cancello in uno strumento che nasconde
    // l'instabilità invece di riportarla.
    const riporta = async () => {
      if (tab.url() !== url) await tab.goto(url, { waitUntil: "domcontentloaded" });
      else await tab.reload({ waitUntil: "domcontentloaded" });
    };
    try {
      await riporta();
    } catch (e) {
      if (!/ERR_ABORTED/.test(e.message)) throw e;
      await tab.waitForTimeout(400);
      await riporta();
    }
    await tab.waitForLoadState("load");

    if (pagina.autenticata && new URL(tab.url()).pathname.startsWith("/accedi")) {
      segnala(etichetta, `dopo «${descrizione}» la sessione è caduta senza che si sia usciti`);
      break;
    }
  }

  if (scomparsi > 0) {
    console.log(`      ${scomparsi} comandi spariti per effetto di clic precedenti (atteso)`);
  }

  // Si conta PRIMA di chiudere il contesto: interrogare una pagina già chiusa solleva, e
  // con il giro che ora cattura gli errori per pagina l'effetto era quarantotto difetti
  // identici e nemmeno un «ok» stampato. Il cancello funzionava; ero io a chiedergli una
  // cosa dopo avergli tolto il tavolo da sotto.
  const esclusi = await tab.locator(SELETTORE_ESCLUSI).count();
  await contesto.close();
  console.log(
    `  ok  ${etichetta}  (${quantiAzionabili} azionabili, ${interni.length} collegamenti su ${campioni.size} rotte${
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
    const collegamenti = await tab
      .locator('a[href^="/azienda/"]')
      .evaluateAll((nodi) => nodi.map((n) => n.getAttribute("href")));
    primaAzienda =
      collegamenti.find((h) => h && /^\/azienda\/[^/]+$/.test(h)) ??
      // Ripiego: se esistono solo collegamenti profondi, si tronca al primo segmento.
      collegamenti
        .find((h) => h)
        ?.split("/")
        .slice(0, 3)
        .join("/") ??
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
async function ripristinaModuli(browser, pagine, quando = "") {
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

    // `exact: true`, E NON È PEDANTERIA.
    //
    // Qui c'era `button:has-text("Attiva")`, che in Playwright è una corrispondenza per
    // SOTTOSTRINGA e insensibile alle maiuscole: pesca anche «Disattiva». La funzione che
    // doveva riaccendere i moduli spenti li spegneva, sei volte per giro, due volte per
    // corsa — una prima di cominciare e una alla fine. Il commento diceva «"Attiva"
    // compare solo sui moduli spenti», ed era vero del testo e falso del localizzatore.
    //
    // Il costo è stato diciotto difetti in un giro completo: pagine 404 perché il modulo
    // che dovevano leggere era stato appena spento dal meccanismo che serviva a evitarlo,
    // e mezz'ora spesa a cercarli nel prodotto. Lo strumento di riparazione era il guasto.
    for (let i = 0; i < 6; i++) {
      const bottone = tab.getByRole("button", { name: "Attiva", exact: true }).first();
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
  if (riaccesi > 0) console.log(`\n  ${quando}: riaccesi ${riaccesi} moduli spenti da clic del cancello`);
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

  // SI RIPRISTINA ANCHE PRIMA DI COMINCIARE, non solo alla fine, e dopo aver risolto i
  // percorsi dinamici — prima non si saprebbe su quale azienda intervenire.
  //
  // Il ripristino in coda funziona finché la corsa arriva in coda. Una corsa uccisa a metà
  // — un timeout, un Ctrl+C, una macchina che si spegne — lascia i moduli come li ha
  // trovati l'ultimo clic, e la corsa successiva parte da un'azienda mutilata: pagine che
  // rendono un ripiego, marcatori `atteso` che non si trovano, e tempo speso a cercare nel
  // prodotto un difetto che sta nel collaudo.
  //
  // È successo oggi, e per due volte di seguito ha fatto sembrare rotto ciò che non lo era.
  await ripristinaModuli(browser, pagine, "prima di cominciare");

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
    await ripristinaModuli(browser, pagine, "dopo i clic");
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
