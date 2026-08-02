// Verifica la disponibilità di nomi a dominio. Script autonomo: nessuna dipendenza,
// si copia in qualunque progetto.
//
// PERCHÉ NON BASTA IL DNS
// `nslookup nome.it` non risponde alla domanda "è libero?" per due motivi:
//   1. molti provider italiani DIROTTANO gli NXDOMAIN su un proprio server (qui Telecom
//      risponde 127.0.0.1 per qualunque dominio inesistente): ogni nome sembrerebbe preso;
//   2. anche con un resolver onesto, "non risolve" non significa "non registrato": un
//      dominio può essere registrato e parcheggiato senza record.
// Il DNS serve al massimo come primo filtro grossolano, mai come risposta.
//
// I DUE METODI AFFIDABILI USATI QUI
//   .it  → WHOIS sul registro, protocollo grezzo su TCP porta 43 verso whois.nic.it.
//          È la fonte autorevole: risponde `Status: AVAILABLE` oppure `Status: ok`.
//   altri→ RDAP, il successore di WHOIS in JSON su HTTPS. rdap.org inoltra al registro
//          giusto: 404 = non registrato, 200 = registrato.
//
// AVVERTENZA: "libero" è una fotografia di adesso e NON è una prenotazione. Se un nome
// serve davvero, va registrato subito presso un registrar.
//
// Uso:
//   node scripts/domini.mjs nome1 nome2 nome3
//   node scripts/domini.mjs --tld it,com,eu,app nome1 nome2
//   node scripts/domini.mjs --file nomi.txt

import { createConnection } from "node:net";
import { readFileSync } from "node:fs";

const TLD_PREDEFINITI = ["it", "com", "eu"];

// Registri con server WHOIS noto. Attenzione: ogni registro ha un formato suo, e i due
// che seguono si comportano in modo diverso proprio sul caso che ci interessa.
//   nic.it  dichiara sempre uno stato: `Status: AVAILABLE` oppure `Status: ok`.
//   EURid   dichiara `Status: AVAILABLE` solo per i liberi; per i registrati la riga di
//           stato NON c'è, e si riconosce dalla presenza dei dati di registrazione.
const WHOIS = {
  it: {
    host: "whois.nic.it",
    libero: /Status:\s*AVAILABLE/i,
    preso: /Status:\s*\S+/i,
  },
  eu: {
    host: "whois.eu",
    libero: /Status:\s*AVAILABLE/i,
    preso: /^Domain:/im,
  },
};

const pausa = (ms) => new Promise((r) => setTimeout(r, ms));

/** WHOIS grezzo: si apre una connessione sulla 43, si manda la query, si legge finché il server chiude. */
function whois(host, query, timeoutMs = 10_000) {
  return new Promise((risolvi) => {
    let risposta = "";
    const socket = createConnection(43, host);
    socket.setTimeout(timeoutMs);
    socket.on("connect", () => socket.write(query + "\r\n"));
    socket.on("data", (chunk) => (risposta += chunk));
    socket.on("end", () => risolvi(risposta));
    socket.on("timeout", () => (socket.destroy(), risolvi("")));
    socket.on("error", () => risolvi(""));
  });
}

async function viaWhois(dominio, tld) {
  const cfg = WHOIS[tld];
  const testo = await whois(cfg.host, dominio);
  if (cfg.libero.test(testo)) return "libero";
  if (cfg.preso.test(testo) || /Status:/i.test(testo)) return "preso";
  return "incerto";
}

/** RDAP: 404 = non registrato, 200 = registrato. Si riprova, perché rdap.org limita la frequenza. */
async function viaRdap(dominio, tentativi = 3) {
  for (let i = 0; i < tentativi; i++) {
    try {
      const r = await fetch(`https://rdap.org/domain/${dominio}`, { redirect: "follow" });
      if (r.status === 404) return "libero";
      if (r.status === 200) return "preso";
    } catch {
      /* rete instabile: si riprova */
    }
    await pausa(1800);
  }
  return "incerto";
}

async function verifica(nome, tld) {
  const dominio = `${nome}.${tld}`;
  return WHOIS[tld] ? viaWhois(dominio, tld) : viaRdap(dominio);
}

function argomenti() {
  const argv = process.argv.slice(2);
  let tld = TLD_PREDEFINITI;
  const nomi = [];

  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--tld") tld = (argv[++i] ?? "").split(",").filter(Boolean);
    else if (argv[i] === "--file") {
      const contenuto = readFileSync(argv[++i] ?? "", "utf8");
      nomi.push(
        ...contenuto
          .split(/\r?\n/)
          .map((r) => r.trim())
          .filter((r) => r && !r.startsWith("#")),
      );
    } else nomi.push(argv[i]);
  }
  return { tld, nomi };
}

async function main() {
  const { tld, nomi } = argomenti();
  if (nomi.length === 0) {
    console.error("Uso: node scripts/domini.mjs [--tld it,com,eu] <nome> [nome...]");
    console.error("     node scripts/domini.mjs --file nomi.txt");
    process.exit(1);
  }

  const larghezza = Math.max(12, ...nomi.map((n) => n.length)) + 2;
  console.log("nome".padEnd(larghezza) + tld.map((t) => ("." + t).padEnd(10)).join(""));
  console.log("-".repeat(larghezza + tld.length * 10));

  const liberi = [];
  for (const nome of nomi) {
    const esiti = [];
    for (const t of tld) {
      esiti.push(await verifica(nome, t));
      // Rispetto dei limiti di frequenza: nic.it e rdap.org bloccano chi insiste.
      await pausa(WHOIS[t] ? 250 : 1000);
    }
    console.log(nome.padEnd(larghezza) + esiti.map((e) => e.padEnd(10)).join(""));
    if (esiti.every((e) => e === "libero")) liberi.push(nome);
  }

  if (liberi.length) {
    console.log(`\nLiberi su tutti i TLD richiesti: ${liberi.join(", ")}`);
  }
  console.log("\nNota: 'libero' è una fotografia di adesso, non una prenotazione.");
}

await main();
