// Estrae il catalogo dei controlli GDPR dal prototipo in archivio/.
//
// Il prototipo è un artifact React compilato: il seed vive dentro il bundle minificato
// come `v1=()=>[{id:"T01",...},...]`. Trascriverlo a mano è la strada per sbagliare i
// conteggi (è già successo su un progetto gemello), quindi lo si estrae e si verifica.
//
// Produce due file distinti, perché sono due cose diverse:
//   control-templates.json  → il CATALOGO: cosa va presidiato, indipendente dal cliente
//   demo-assessment.json    → lo STATO DI ESEMPIO: come sta messo il cliente del prototipo
//
// Le scadenze del prototipo sono relative al caricamento (`T(-12)` = 12 giorni fa), quindi
// si conservano come offset in giorni, non come date assolute: una data congelata nel 2026
// renderebbe il seed demo insensato l'anno prossimo.
//
// Uso:  node scripts/extract-seed.mjs [--check]
//       --check  non riscrive i file, verifica soltanto che l'estrazione coincida

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SORGENTE = join(ROOT, "archivio", "GDPR-Compliance-Hub-V2 (1).html");
const DESTINAZIONE = join(ROOT, "packages", "engine", "src", "catalog");

// Conteggi attesi, verificati eseguendo il prototipo originale. Se l'estrazione non li
// rispetta, o il file di partenza è cambiato o l'estrattore è rotto: in entrambi i casi
// meglio fermarsi che seminare un catalogo incompleto.
const ATTESI = { Titolare: 20, Responsabile: 10, DPO: 12, totale: 42 };

/** Ritaglia l'array letterale che segue `v1=()=>[`, bilanciando le parentesi e ignorando quelle nelle stringhe. */
function ritagliaArrayLetterale(sorgente) {
  const ancora = sorgente.indexOf("v1=()=>[");
  if (ancora === -1) throw new Error("Ancora `v1=()=>[` non trovata: il prototipo è cambiato.");

  const inizio = sorgente.indexOf("[", ancora);
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

/**
 * Valuta l'array. `T` nel prototipo trasforma un offset in giorni in una data ISO;
 * qui lo si neutralizza restituendo l'offset, che è l'informazione che vogliamo tenere.
 */
function valuta(letterale) {
  const T = (giorni) => giorni;
  // eslint-disable-next-line no-new-func
  return new Function("T", `"use strict"; return ${letterale};`)(T);
}

function verificaConteggi(voci) {
  const perRuolo = {};
  for (const v of voci) perRuolo[v.ruolo] = (perRuolo[v.ruolo] ?? 0) + 1;

  const errori = [];
  if (voci.length !== ATTESI.totale) errori.push(`totale ${voci.length}, attesi ${ATTESI.totale}`);
  for (const ruolo of ["Titolare", "Responsabile", "DPO"]) {
    if (perRuolo[ruolo] !== ATTESI[ruolo])
      errori.push(`${ruolo} ${perRuolo[ruolo] ?? 0}, attesi ${ATTESI[ruolo]}`);
  }

  const codici = voci.map((v) => v.id);
  const duplicati = codici.filter((c, i) => codici.indexOf(c) !== i);
  if (duplicati.length) errori.push(`codici duplicati: ${[...new Set(duplicati)].join(", ")}`);

  const campiRichiesti = [
    "id",
    "titolo",
    "descrizione",
    "articolo",
    "ruolo",
    "frequenza",
    "priorita",
    "stato",
    "rischio",
  ];
  for (const v of voci) {
    for (const campo of campiRichiesti) {
      if (v[campo] === undefined || v[campo] === "") errori.push(`${v.id}: campo '${campo}' mancante`);
    }
  }

  if (errori.length) throw new Error(`Estrazione incoerente:\n  - ${errori.join("\n  - ")}`);
  return perRuolo;
}

function main() {
  const soloVerifica = process.argv.includes("--check");
  const html = readFileSync(SORGENTE, "utf8");
  const voci = valuta(ritagliaArrayLetterale(html));
  const perRuolo = verificaConteggi(voci);

  // Il catalogo non conosce stati né scadenze: quelli nascono quando un controllo
  // viene calato su un cliente reale.
  const catalogo = voci.map((v) => ({
    codice: v.id,
    titolo: v.titolo,
    descrizione: v.descrizione,
    articolo: v.articolo,
    ruolo: v.ruolo,
    frequenza: v.frequenza,
    prioritaDefault: v.priorita,
    rischioDefault: v.rischio,
  }));

  // Lo stato del cliente di esempio, usato dai golden test del motore e dal seed demo.
  const demo = {
    cliente: "Gruppo Industriale Verdi S.p.A.",
    fonte: "Prototipo GDPR Compliance Hub v2",
    controlli: voci.map((v) => ({
      codice: v.id,
      stato: v.stato,
      scadenzaOffsetGiorni: v.scadenza,
      priorita: v.priorita,
      rischio: v.rischio,
    })),
  };

  const scrivi = (nome, dati) => {
    const percorso = join(DESTINAZIONE, nome);
    const contenuto = JSON.stringify(dati, null, 2) + "\n";
    if (soloVerifica) {
      if (!existsSync(percorso)) throw new Error(`${nome} non esiste: esegui senza --check.`);
      if (readFileSync(percorso, "utf8") !== contenuto)
        throw new Error(`${nome} non coincide con l'estrazione dal prototipo.`);
      return;
    }
    mkdirSync(DESTINAZIONE, { recursive: true });
    writeFileSync(percorso, contenuto);
  };

  scrivi("control-templates.json", catalogo);
  scrivi("demo-assessment.json", demo);

  const perStato = {};
  for (const v of voci) perStato[v.stato] = (perStato[v.stato] ?? 0) + 1;

  console.log(soloVerifica ? "Verifica catalogo: OK" : "Catalogo estratto in packages/engine/src/catalog/");
  console.log(
    `  controlli: ${voci.length}  (${Object.entries(perRuolo)
      .map(([k, n]) => `${k} ${n}`)
      .join(" · ")})`,
  );
  console.log(
    `  stati demo: ${Object.entries(perStato)
      .map(([k, n]) => `${k} ${n}`)
      .join(" · ")}`,
  );
}

main();
