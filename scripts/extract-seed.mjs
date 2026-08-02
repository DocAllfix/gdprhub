// Estrae i cataloghi degli adempimenti dai tre prototipi in archivio/.
//
// I prototipi sono artifact React compilati: i cataloghi vivono dentro il bundle
// minificato. Trascriverli a mano è la strada per sbagliare i conteggi (è già successo su
// un progetto gemello), quindi si estraggono e si verificano.
//
// Produce, per ogni dominio, due file distinti perché sono due cose diverse:
//   <dominio>-templates.json  → il CATALOGO: cosa va presidiato, indipendente dal cliente
//   <dominio>-demo.json       → lo STATO DI ESEMPIO: come sta messo il cliente dimostrativo
//
// Nessuna data assoluta finisce nei file: le scadenze si conservano come scostamenti in
// giorni o mesi. Una data congelata renderebbe il seed dimostrativo insensato fra un anno,
// che è esattamente il difetto del prototipo 231 (scadenze fisse al 2025-2026).
//
// Uso:  node scripts/extract-seed.mjs [--check]
//       --check  non riscrive i file, verifica soltanto che l'estrazione coincida

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ARCHIVIO = join(ROOT, "archivio");
const DESTINAZIONE = join(ROOT, "packages", "engine", "src");

// Conteggi attesi, verificati eseguendo i prototipi originali. Se l'estrazione non li
// rispetta, o il file di partenza è cambiato o l'estrattore è rotto: in entrambi i casi
// meglio fermarsi che seminare un catalogo incompleto.
const ATTESI = {
  gdpr: { totale: 42, perRuolo: { Titolare: 20, Responsabile: 10, DPO: 12 } },
  d231: { totale: 65, categorie: 10 },
  d81: { totale: 64, categorie: 6 },
};

// ---------------------------------------------------------------------------------------
// Ritaglio di array letterali dentro il bundle minificato
// ---------------------------------------------------------------------------------------

/** Ritaglia l'array letterale che inizia all'indice dato, bilanciando le parentesi e ignorando quelle nelle stringhe. */
function ritagliaArray(sorgente, inizio) {
  let profondita = 0;
  let apice = null; // ' " ` quando siamo dentro una stringa
  let fuga = false;

  for (let i = inizio; i < sorgente.length; i++) {
    const c = sorgente[i];
    if (fuga) {
      fuga = false;
      continue;
    }
    if (c === "\\") {
      fuga = true;
      continue;
    }
    if (apice) {
      if (c === apice) apice = null;
      continue;
    }
    if (c === "'" || c === '"' || c === "`") {
      apice = c;
      continue;
    }
    if (c === "[") profondita++;
    else if (c === "]") {
      profondita--;
      if (profondita === 0) return sorgente.slice(inizio, i + 1);
    }
  }
  throw new Error("Array letterale non chiuso: estrazione impossibile.");
}

/** Trova un'ancora testuale e ritaglia l'array che la contiene, risalendo alla parentesi aperta. */
function arrayDaAncora(sorgente, ancora) {
  const pos = sorgente.indexOf(ancora);
  if (pos === -1) throw new Error(`Ancora non trovata: ${ancora.slice(0, 60)}… (il prototipo è cambiato?)`);
  const apertura = sorgente.lastIndexOf("[", pos);
  if (apertura === -1) throw new Error(`Nessuna parentesi aperta prima di: ${ancora.slice(0, 40)}…`);
  return ritagliaArray(sorgente, apertura);
}

/** Valuta un array letterale in un ambito controllato, con le variabili di supporto che gli servono. */
function valuta(letterale, supporto = {}) {
  const nomi = Object.keys(supporto);
  const valori = Object.values(supporto);
  // eslint-disable-next-line no-new-func
  return new Function(...nomi, `"use strict"; return ${letterale};`)(...valori);
}

// ---------------------------------------------------------------------------------------
// Periodicità: un modello solo per tre vocabolari diversi
// ---------------------------------------------------------------------------------------

// I tre prototipi esprimono la ricorrenza in modi incompatibili: il GDPR e il 231 con
// etichette ("Annuale", "Trimestrale"), l'81/08 con stringhe libere parsate a regex
// ("36 mesi"). Il modello unificato è uno solo, e distingue quattro nature diverse:
//   periodica   → si ripete ogni N mesi, la scadenza si DERIVA dall'ultima esecuzione
//   continua    → presidio permanente, non ha una scadenza propria
//   evento      → scatta al verificarsi di un fatto, la scadenza è esplicita
//   una_tantum  → si fa una volta sola
const PERIODICITA = {
  mensile: { tipo: "periodica", mesi: 1 },
  trimestrale: { tipo: "periodica", mesi: 3 },
  semestrale: { tipo: "periodica", mesi: 6 },
  annuale: { tipo: "periodica", mesi: 12 },
  biennale: { tipo: "periodica", mesi: 24 },
  continuo: { tipo: "continua" },
  "al verificarsi": { tipo: "evento" },
  "ad evento": { tipo: "evento" },
  "una tantum": { tipo: "una_tantum" },
};

function normalizzaPeriodicita(testo) {
  const t = String(testo).trim().toLowerCase();
  if (PERIODICITA[t]) return PERIODICITA[t];

  // Forma dell'81/08: "36 mesi", "1 mesi", e le varianti in giorni/settimane/anni.
  const numero = t.match(/(\d+)/);
  if (numero) {
    const n = parseInt(numero[1], 10);
    if (t.includes("giorn")) return { tipo: "periodica", mesi: Math.max(1, Math.round(n / 30)) };
    if (t.includes("sett")) return { tipo: "periodica", mesi: Math.max(1, Math.round(n / 4)) };
    if (t.includes("ann")) return { tipo: "periodica", mesi: n * 12 };
    return { tipo: "periodica", mesi: n };
  }
  throw new Error(`Periodicità non riconosciuta: "${testo}"`);
}

/**
 * Traduce lo stato di lavoro dei prototipi su quello del modello.
 * "In ritardo" e "Scaduto" NON sono stati: sono derivati della scadenza. Erano la causa
 * dei dati impossibili nei prototipi (controlli marcati in ritardo con scadenza futura).
 */
function normalizzaStato(statoPrototipo) {
  switch (String(statoPrototipo).trim()) {
    case "Completata":
    case "Completato":
      return "Completata";
    case "In corso":
      return "In corso";
    case "Da fare":
    case "In ritardo":
    case "Scaduto":
      return "Da fare";
    default:
      throw new Error(`Stato non riconosciuto: "${statoPrototipo}"`);
  }
}

const codice = (prefisso, indice) => `${prefisso}${String(indice + 1).padStart(2, "0")}`;

// ---------------------------------------------------------------------------------------
// GDPR — 42 controlli, codici T/R/D già significativi (indicano il ruolo)
// ---------------------------------------------------------------------------------------

function estraiGdpr() {
  const html = readFileSync(join(ARCHIVIO, "GDPR-Compliance-Hub-V2 (1).html"), "utf8");
  // `T` nel prototipo trasforma uno scostamento in giorni in una data ISO: qui lo si
  // neutralizza restituendo lo scostamento, che è l'informazione da conservare.
  const voci = valuta(arrayDaAncora(html, 'id:"T01"'), { T: (giorni) => giorni });

  return {
    dominio: "gdpr",
    templates: voci.map((v) => ({
      dominio: "gdpr",
      codice: v.id,
      titolo: v.titolo,
      descrizione: v.descrizione,
      nota: null, // il catalogo GDPR non ha annotazioni separate
      riferimento: v.articolo,
      categoria: v.ruolo, // il GDPR non ha categorie proprie: la partizione è per ruolo
      ruolo: v.ruolo,
      periodicita: normalizzaPeriodicita(v.frequenza),
      prioritaDefault: v.priorita,
      rischioDefault: v.rischio,
    })),
    demo: voci.map((v) => ({
      codice: v.id,
      statoPrototipo: v.stato,
      stato: normalizzaStato(v.stato),
      scadenzaOffsetGiorni: v.scadenza,
      priorita: v.priorita,
      rischio: v.rischio,
    })),
  };
}

// ---------------------------------------------------------------------------------------
// D.Lgs 231/01 — 65 adempimenti in 10 categorie
// ---------------------------------------------------------------------------------------

// Le scadenze del prototipo sono date assolute fra ottobre 2025 e maggio 2026: fra un anno
// sarebbero tutte scadute e il seed dimostrativo perderebbe senso. Si convertono in
// scostamenti rispetto a una data di riferimento, dedotta dai dati stessi: il "oggi" del
// prototipo è successivo all'ultima scadenza che i suoi autori hanno marcato come mancata.
function riferimento231(voci) {
  const mancate = voci
    .filter((v) => v.stato === "Scaduto" || v.stato === "In ritardo")
    .map((v) => v.scadenza);
  if (mancate.length === 0)
    throw new Error("Nessuna scadenza mancata nel 231: impossibile dedurre il riferimento.");
  return mancate.sort().at(-1); // la più recente fra quelle già mancate
}

function giorniTraIso(da, a) {
  const ms = Date.parse(a + "T00:00:00Z") - Date.parse(da + "T00:00:00Z");
  return Math.round(ms / 86_400_000);
}

function estrai231() {
  const html = readFileSync(join(ARCHIVIO, "231-Compliance-Manager-Odv (1).html"), "utf8");

  const categorie = valuta(arrayDaAncora(html, '"Costituzione e Funzionamento OdV"'));
  const letterale = arrayDaAncora(html, '{id:"1",categoria:');
  // Le categorie sono referenziate come `NOMEVAR[0]`: si ricava il nome dal letterale stesso.
  const nomeVar = letterale.match(/categoria:([A-Za-z_$][\w$]*)\[/)?.[1];
  if (!nomeVar) throw new Error("Nome della variabile delle categorie non individuato nel 231.");
  const voci = valuta(letterale, { [nomeVar]: categorie });

  const rif = riferimento231(voci);

  return {
    dominio: "d231",
    riferimentoDedotto: rif,
    templates: voci.map((v, i) => ({
      dominio: "d231",
      codice: codice("M", i), // M = Modello 231
      titolo: v.attivita,
      // Il prototipo 231 non ha un campo descrizione: l'attività si descrive da sé, e la
      // nota resta una nota. Conflaterle produceva descrizioni di tre caratteri ("PVC").
      descrizione: v.attivita,
      nota: v.note?.trim() || null,
      riferimento: "D.Lgs 231/01",
      categoria: v.categoria,
      ruolo: v.responsabile,
      periodicita: normalizzaPeriodicita(v.frequenza),
      prioritaDefault: v.priorita,
      rischioDefault: null, // il prototipo 231 non ha un campo rischio
    })),
    demo: voci.map((v, i) => ({
      codice: codice("M", i),
      statoPrototipo: v.stato,
      stato: normalizzaStato(v.stato),
      scadenzaOffsetGiorni: giorniTraIso(rif, v.scadenza),
      priorita: v.priorita,
      rischio: null,
    })),
  };
}

// ---------------------------------------------------------------------------------------
// D.Lgs 81/08 — 64 adempimenti in 6 categorie
// ---------------------------------------------------------------------------------------

// È l'unico dei tre prototipi che modella davvero la ricorrenza: scadenza e stato si
// DERIVANO da ultima esecuzione + periodicità. È la semantica che il modello unificato
// adotta per tutti e tre i domini.
//
// Il seed dimostrativo del prototipo genera l'ultima esecuzione con una regola
// deterministica sull'indice (i % 7, i % 5, i % 3) per ottenere un misto realistico di
// regolari, in scadenza e scaduti. La si riproduce fedelmente, ma come scostamento.
function ultimaEsecuzioneDemo(indice, mesiPeriodicita) {
  const W = mesiPeriodicita ?? 12;
  if (indice % 7 === 0) return null; // mai eseguito → "Da programmare"
  if (indice % 5 === 0) return { mesiFa: W + 2 + Math.floor(indice / 10), piuGiorni: 0 };
  if (indice % 3 === 0) return { mesiFa: W, piuGiorni: 18 + (indice % 10) };
  return { mesiFa: Math.max(1, W - 4) + (indice % 3), piuGiorni: 0 };
}

function estrai81() {
  const html = readFileSync(join(ARCHIVIO, "81-08 compliance.html"), "utf8");
  const voci = valuta(arrayDaAncora(html, '{categoria:"Documenti Obbligatori"'));

  return {
    dominio: "d81",
    templates: voci.map((v, i) => ({
      dominio: "d81",
      codice: codice("S", i), // S = Sicurezza sul lavoro
      titolo: v.attivita,
      descrizione: v.descrizione,
      nota: v.note?.trim() || null,
      riferimento: v.riferimento,
      categoria: v.categoria,
      ruolo: v.responsabile,
      periodicita: normalizzaPeriodicita(v.frequenza),
      prioritaDefault: v.priorita,
      rischioDefault: null, // il prototipo 81/08 non ha un campo rischio
    })),
    demo: voci.map((v, i) => {
      const p = normalizzaPeriodicita(v.frequenza);
      const ultima = ultimaEsecuzioneDemo(i, p.mesi);
      return {
        codice: codice("S", i),
        // Nell'81/08 lo stato di lavoro non esiste: c'è solo l'ultima esecuzione, e tutto
        // il resto si deriva. Chi non l'ha mai eseguito è "Da fare", gli altri "Completata"
        // rispetto al ciclo precedente.
        stato: ultima ? "Completata" : "Da fare",
        ultimaEsecuzione: ultima,
        priorita: v.priorita,
        rischio: null,
      };
    }),
  };
}

// ---------------------------------------------------------------------------------------
// Verifiche
// ---------------------------------------------------------------------------------------

function verifica(estratto) {
  const { dominio, templates } = estratto;
  const atteso = ATTESI[dominio];
  const errori = [];

  if (templates.length !== atteso.totale) {
    errori.push(`${dominio}: ${templates.length} adempimenti, attesi ${atteso.totale}`);
  }

  if (atteso.perRuolo) {
    for (const [ruolo, n] of Object.entries(atteso.perRuolo)) {
      const trovati = templates.filter((t) => t.ruolo === ruolo).length;
      if (trovati !== n) errori.push(`${dominio}: ruolo ${ruolo} ha ${trovati}, attesi ${n}`);
    }
  }

  if (atteso.categorie) {
    const n = new Set(templates.map((t) => t.categoria)).size;
    if (n !== atteso.categorie) errori.push(`${dominio}: ${n} categorie, attese ${atteso.categorie}`);
  }

  const codici = templates.map((t) => t.codice);
  const duplicati = [...new Set(codici.filter((c, i) => codici.indexOf(c) !== i))];
  if (duplicati.length) errori.push(`${dominio}: codici duplicati ${duplicati.join(", ")}`);

  for (const t of templates) {
    for (const campo of ["codice", "titolo", "descrizione", "riferimento", "categoria", "ruolo"]) {
      if (!String(t[campo] ?? "").trim()) errori.push(`${dominio} ${t.codice}: campo '${campo}' vuoto`);
    }
    if (!t.periodicita?.tipo) errori.push(`${dominio} ${t.codice}: periodicità non normalizzata`);
  }

  if (errori.length) throw new Error(`Estrazione incoerente:\n  - ${errori.join("\n  - ")}`);
}

function riassunto(estratto) {
  const { dominio, templates, demo } = estratto;
  const perCategoria = {};
  for (const t of templates) perCategoria[t.categoria] = (perCategoria[t.categoria] ?? 0) + 1;
  const perTipo = {};
  for (const t of templates) perTipo[t.periodicita.tipo] = (perTipo[t.periodicita.tipo] ?? 0) + 1;
  const perStato = {};
  for (const d of demo) perStato[d.stato] = (perStato[d.stato] ?? 0) + 1;

  console.log(`\n  ${dominio.toUpperCase()} — ${templates.length} adempimenti`);
  console.log(
    `    categorie   ${Object.keys(perCategoria).length}: ${Object.entries(perCategoria)
      .map(([k, n]) => `${k} ${n}`)
      .join(" · ")}`,
  );
  console.log(
    `    periodicità ${Object.entries(perTipo)
      .map(([k, n]) => `${k} ${n}`)
      .join(" · ")}`,
  );
  console.log(
    `    stati demo  ${Object.entries(perStato)
      .map(([k, n]) => `${k} ${n}`)
      .join(" · ")}`,
  );
  if (estratto.riferimentoDedotto)
    console.log(`    riferimento dedotto per gli scostamenti: ${estratto.riferimentoDedotto}`);
}

// ---------------------------------------------------------------------------------------

function main() {
  const soloVerifica = process.argv.includes("--check");
  const estratti = [estraiGdpr(), estrai231(), estrai81()];
  estratti.forEach(verifica);

  const scrivi = (nome, dati) => {
    const percorso = join(DESTINAZIONE, nome);
    const contenuto = JSON.stringify(dati, null, 2) + "\n";
    if (soloVerifica) {
      if (!existsSync(percorso)) throw new Error(`${nome} non esiste: esegui senza --check.`);
      if (readFileSync(percorso, "utf8") !== contenuto) {
        throw new Error(`${nome} non coincide con l'estrazione dai prototipi.`);
      }
      return;
    }
    mkdirSync(DESTINAZIONE, { recursive: true });
    writeFileSync(percorso, contenuto);
  };

  for (const e of estratti) {
    scrivi(join(e.dominio, `${e.dominio}-templates.json`), e.templates);
    scrivi(join(e.dominio, `${e.dominio}-demo.json`), {
      fonte: `Prototipo ${e.dominio}`,
      ...(e.riferimentoDedotto ? { riferimentoDedotto: e.riferimentoDedotto } : {}),
      controlli: e.demo,
    });
  }

  const totale = estratti.reduce((n, e) => n + e.templates.length, 0);
  console.log(
    soloVerifica ? "Verifica cataloghi: OK" : "Cataloghi estratti in packages/engine/src/<dominio>/",
  );
  estratti.forEach(riassunto);
  console.log(`\n  TOTALE: ${totale} adempimenti sui tre domini`);
}

main();
