import { formattaIt } from "@gdpr/engine";
import type { Snapshot, VoceCritica } from "@/features/relazioni/snapshot";
import { componi, distribuisci, esc, type Documento, type Pagina } from "./impaginazione";

// LA RELAZIONE, costruita da uno snapshot e da nient'altro.
//
// Questa funzione non tocca il database e non chiama il motore: riceve il calcolo già
// congelato. È la regola che rende il documento un atto — riaperto fra due anni deve
// mostrare i numeri di allora, e l'unico modo di garantirlo è che non abbia modo di
// leggerne altri.
//
// LA PROSA È CONDIZIONATA AI DATI, non riempita con essi. «La società presenta 36 scadenze
// mancate» è una frase che un foglio di calcolo sa produrre; «trentasei adempimenti
// risultano scaduti, di cui dodici su presidi che il registro dà per chiusi» è una frase
// che dice qualcosa. Dove il dato cambia il significato, cambia anche la frase.

const NUMERI = [
  "nessun",
  "un",
  "due",
  "tre",
  "quattro",
  "cinque",
  "sei",
  "sette",
  "otto",
  "nove",
  "dieci",
];
/** Sotto dieci si scrive in lettere: è come si scrive un atto, non un cruscotto. */
const inLettere = (n: number) => (n <= 10 ? (NUMERI[n] ?? String(n)) : String(n));

const pct = (q: { percentuale: number | null; numeratore: number; applicabili: number }) =>
  q.percentuale === null ? "—" : `${q.percentuale}%`;

const denom = (q: { numeratore: number; applicabili: number }) => `${q.numeratore}/${q.applicabili}`;

/**
 * Quante righe della tabella fitta entrano in una pagina.
 *
 * Una riga occupa due linee: il titolo porta sotto il riferimento normativo, la scadenza
 * porta sotto lo stato. Con l'occhiello in testa, la prima pagina ne regge meno.
 */
const CAPIENZA_PRIMA = 20;
const CAPIENZA_SEGUENTI = 29;

const CLASSE_SCADENZA: Record<string, string> = {
  Scaduta: "st-scaduta",
  "In scadenza": "st-imminente",
  Regolare: "st-regolare",
  "Da programmare": "st-programmare",
};

// ============================================================================================
// Pagine
// ============================================================================================

function copertina(s: Snapshot, studio: string, numero: number, impronta: string): string {
  const moduli = s.moduli
    .filter((m) => m.attivo)
    .map((m) => `${m.etichetta.breve} · ${m.etichetta.norma}`);
  return `
  <div class="carta-intestata">
    <span class="studio">${esc(studio)}</span>
    <span class="qualifica">Suite Compliance · relazione di conformità</span>
  </div>

  <p class="tipo-atto">${s.ambito === "suite" ? "Relazione integrata di conformità" : "Relazione di conformità"}</p>
  <h1 class="titolo-atto">${
    s.ambito === "suite"
      ? "Stato degli adempimenti sui tre decreti"
      : `Stato degli adempimenti · ${esc(s.moduli[0]?.etichetta.esteso ?? "")}`
  }</h1>
  <p class="sottotitolo-atto">${esc(s.azienda.nome)}</p>

  <div class="specchietto">
    <dl>
      <dt>Ente destinatario</dt><dd>${esc(s.azienda.nome)}</dd>
      ${s.azienda.sede ? `<dt>Sede</dt><dd>${esc(s.azienda.sede)}</dd>` : ""}
      ${s.azienda.partitaIva ? `<dt>Partita IVA</dt><dd class="mono">${esc(s.azienda.partitaIva)}</dd>` : ""}
      ${s.azienda.settore ? `<dt>Attività prevalente</dt><dd>${esc(s.azienda.settore)}</dd>` : ""}
      <dt>Moduli in perimetro</dt><dd>${moduli.map(esc).join("<br>")}</dd>
      <dt>Data di riferimento</dt><dd class="mono">${formattaIt(s.dataRiferimento)}</dd>
    </dl>
  </div>

  <div class="emissione">
    <div><b>Protocollo</b>n. ${numero} del ${formattaIt(s.dataRiferimento)}</div>
    <div><b>Adempimenti in perimetro</b>${s.complessivo.totale}<br>conformità effettiva ${pct(
      s.complessivo.conformitaEffettiva,
    )} (${denom(s.complessivo.conformitaEffettiva)})</div>
    <div><b>Impronta del contenuto</b>SHA-256<br><span class="mono">${esc(impronta.slice(0, 32))}…</span></div>
  </div>`;
}

function oggettoEMetodo(s: Snapshot): string {
  const attivi = s.moduli.filter((m) => m.attivo);
  return `<div class="griglia">
    <div class="margine"><span class="num">1</span>Oggetto</div>
    <div>
      <h2 class="sezione">Oggetto e perimetro</h2>
      <p class="occhiello">La presente relazione fotografa lo stato di conformità di
      ${esc(s.azienda.nome)} alla data del ${formattaIt(s.dataRiferimento)}, sulla base dei
      ${s.complessivo.totale} adempimenti censiti ${
        attivi.length === 1 ? "nel modulo attivo" : `nei ${inLettere(attivi.length)} moduli attivi`
      }.</p>
      <p>La rilevazione è condotta sul catalogo unificato della suite, che riconduce a un modello
      unico gli obblighi discendenti dai corpi normativi in perimetro. Gli adempimenti che due
      decreti condividono sono censiti una sola volta nel modulo che ne è titolare e letti dagli
      altri con indicazione della provenienza: non compaiono due volte e non si contano due volte.</p>
    </div>

    <div class="margine"><span class="num">2</span>Metodo</div>
    <div>
      <h3 class="paragrafo">Criteri di misurazione</h3>
      <p>Ogni adempimento è descritto da due stati distinti e non sovrapponibili. Lo
      <em>stato del lavoro</em> è dichiarato da una persona e attesta che l'attività è stata svolta.
      Lo <em>stato della scadenza</em> è calcolato dalla data di ultima esecuzione e dalla
      periodicità prevista, e attesta che l'adempimento è ancora valido.</p>
      ${
        s.complessivo.completatiEScaduti > 0
          ? `<p>La distinzione non è formale, e in questa rilevazione produce un effetto misurabile:
             <b>${s.complessivo.completatiEScaduti} adempimenti risultano completati e nondimeno
             scaduti</b>. L'attività fu svolta, il ciclo è concluso, e la conformità sostanziale è
             venuta meno pur in presenza dell'atto. Le percentuali riportate al § 3 sono calcolate
             sulla conformità effettiva, che richiede entrambe le condizioni.</p>`
          : `<p>In questa rilevazione nessun adempimento completato risulta scaduto: i cicli chiusi
             sono tutti ancora validi. Le percentuali riportate al § 3 sono comunque calcolate sulla
             conformità effettiva, che richiede entrambe le condizioni.</p>`
      }
      <div class="metodo">
        <ul>${s.metodo.map((m) => `<li>${esc(m)}</li>`).join("")}</ul>
      </div>
    </div>
  </div>`;
}

function quadro(s: Snapshot): string {
  const righe = s.moduli
    .filter((m) => m.attivo)
    .map(
      (m) => `<tr>
      <td><b>${esc(m.etichetta.breve)}</b><span class="sotto">${esc(m.etichetta.norma)}</span></td>
      <td class="num-cella">${pct(m.conformitaEffettiva)}<span class="sotto mono">${denom(m.conformitaEffettiva)}</span></td>
      <td class="num-cella">${m.totale}</td>
      <td class="num-cella ${m.scadute > 0 ? "st-scaduta" : ""}">${m.scadute}</td>
      <td class="num-cella">${m.inScadenza}</td>
      <td class="num-cella">${m.criticiAperti}</td>
      <td class="num-cella">${m.conEvidenza}</td>
      <td class="num-cella">${m.esposizione ? m.esposizione.indice : "—"}</td>
    </tr>`,
    )
    .join("");

  const c = s.complessivo;
  return `<div class="griglia">
    <div class="margine"><span class="num">3</span>Quadro</div>
    <div>
      <h2 class="sezione">Quadro complessivo</h2>
      <p class="occhiello">La conformità effettiva sull'insieme unito è
      <b>${pct(c.conformitaEffettiva)}</b> (${denom(c.conformitaEffettiva)} adempimenti applicabili),
      con un indice di esposizione di ${c.esposizione?.indice ?? "—"} su 100${
        c.esposizione ? `, giudicato ${esc(c.esposizione.giudizio.toLowerCase())}` : ""
      }.</p>

      <table class="tabella">
        <thead><tr>
          <th>Modulo</th><th class="num-cella">Conformità</th><th class="num-cella">Adempimenti</th>
          <th class="num-cella">Scaduti</th><th class="num-cella">In scadenza</th>
          <th class="num-cella">Critici</th><th class="num-cella">Con evidenza</th>
          <th class="num-cella">Esposiz.</th>
        </tr></thead>
        <tbody>${righe}</tbody>
      </table>

      <p class="nota">La conformità complessiva è calcolata sull'insieme unito degli adempimenti, non
      come media delle percentuali dei moduli: una media peserebbe uguale un modulo da quarantadue e
      uno da sessantacinque, e disattivarne uno migliorerebbe il numero senza che nulla sia cambiato.</p>

      ${
        c.conEvidenza < c.conformitaEffettiva.numeratore
          ? `<p class="nota rilievo">Di ${c.conformitaEffettiva.numeratore} adempimenti chiusi e ancora
             validi, ${c.conEvidenza === 0 ? "nessuno porta" : `${c.conEvidenza} portano`} un documento
             allegato. ${
               c.conEvidenza === 0
                 ? "L'intero risultato poggia quindi su dichiarazioni"
                 : `I restanti ${c.conformitaEffettiva.numeratore - c.conEvidenza} restano dichiarazioni`
             }: davanti a una verifica conta la prova documentale, non la spunta.</p>`
          : ""
      }

      <h3 class="paragrafo">Dove si concentra lo scoperto</h3>
      ${prosaModuli(s)}
    </div>
  </div>`;
}

/**
 * Una frase per modulo, ordinati dal più scoperto.
 *
 * Non è riempitivo: la tabella dice quanto, questa dice CHE COSA significa. Un consulente
 * che apre la relazione davanti al consiglio ha bisogno della frase, non della riga — e la
 * frase cambia con i dati, altrimenti sarebbe un modello riempito.
 */
function prosaModuli(s: Snapshot): string {
  const attivi = [...s.moduli].filter((m) => m.attivo && m.totale > 0);
  if (attivi.length === 0) return "";
  const ordinati = attivi.sort(
    (a, b) => (a.conformitaEffettiva.percentuale ?? 101) - (b.conformitaEffettiva.percentuale ?? 101),
  );
  return ordinati
    .map((m, i) => {
      const p = m.conformitaEffettiva.percentuale;
      const posizione =
        i === 0 && ordinati.length > 1
          ? "Il modulo più scoperto è"
          : i === ordinati.length - 1 && ordinati.length > 1
            ? "Il più in ordine è"
            : "Segue";
      const scaduti =
        m.scadute === 0
          ? "nessun adempimento risulta scaduto"
          : `${m.scadute} ${m.scadute === 1 ? "adempimento risulta scaduto" : "adempimenti risultano scaduti"}`;
      const critici =
        m.criticiAperti === 0
          ? ""
          : `, e ${m.criticiAperti} ${m.criticiAperti === 1 ? "presidio critico resta aperto" : "presidi critici restano aperti"}`;
      return `<p>${posizione} <b>${esc(m.etichetta.breve)}</b> (${esc(m.etichetta.norma)}), con una
        conformità effettiva del ${p === null ? "—" : `${p}%`} su ${m.conformitaEffettiva.applicabili}
        adempimenti applicabili: ${scaduti}${critici}.
        ${
          m.esposizione && m.esposizione.indice >= 60
            ? `L'esposizione residua è di ${m.esposizione.indice} punti su 100, ${esc(m.esposizione.giudizio.toLowerCase())}.`
            : ""
        }</p>`;
    })
    .join("");
}

function tabellaVoci(voci: readonly VoceCritica[]): string {
  return `<table class="tabella fitta">
    <thead><tr>
      <th>Cod.</th><th>Adempimento</th><th>Responsabile</th>
      <th>Lavoro</th><th>Scadenza</th><th class="num-cella">Ev.</th>
    </tr></thead>
    <tbody>${voci
      .map(
        (v) => `<tr>
        <td class="mono">${esc(v.codice)}</td>
        <td>${esc(v.titolo)}<span class="sotto">${esc(v.riferimento)}</span></td>
        <td>${esc(v.ruolo)}</td>
        <td>${esc(v.stato)}</td>
        <td class="${CLASSE_SCADENZA[v.statoScadenza] ?? ""}">${
          v.scadenza ? formattaIt(v.scadenza) : "—"
        }<span class="sotto">${esc(v.statoScadenza)}</span></td>
        <td class="num-cella">${v.conEvidenza ? "sì" : "no"}</td>
      </tr>`,
      )
      .join("")}</tbody>
  </table>`;
}

function pagineCritiche(s: Snapshot): Pagina[] {
  if (s.critiche.length === 0) {
    return [
      {
        corpo: `<div class="griglia">
        <div class="margine"><span class="num">4</span>Criticità</div>
        <div>
          <h2 class="sezione">Adempimenti critici aperti</h2>
          <p class="occhiello">Nessun adempimento di priorità critica risulta aperto alla data della
          rilevazione.</p>
        </div>
      </div>`,
      },
    ];
  }

  // LA CAPIENZA È MISURATA, NON IPOTIZZATA. Il primo giro dichiarava 26 righe sulla prima
  // pagina e 40 sulle seguenti, e la tabella straripava sotto il piede: ogni riga ne occupa
  // due, perché il titolo porta sotto il riferimento normativo e la scadenza porta sotto lo
  // stato. Vale la stessa regola dell'impaginatore — il costo si dichiara, non si indovina —
  // e qui era stato indovinato.
  const blocchi = distribuisci(s.critiche, () => 1, CAPIENZA_PRIMA, CAPIENZA_SEGUENTI);
  return blocchi.map((voci, i) => ({
    corpo: `<div class="griglia">
      <div class="margine">${i === 0 ? '<span class="num">4</span>Criticità' : "segue"}</div>
      <div>
        ${
          i === 0
            ? `<h2 class="sezione">Adempimenti critici aperti</h2>
               <p class="occhiello">Sono elencati i ${s.critiche.length} adempimenti di priorità
               critica o alta su cui residua lavoro, ordinati per urgenza. La colonna «Ev.» dichiara
               se esiste un documento allegato: un adempimento chiuso senza prova resta una
               dichiarazione.</p>`
            : ""
        }
        ${tabellaVoci(voci)}
      </div>
    </div>`,
  }));
}

function pagineScadenze(s: Snapshot): Pagina[] {
  if (s.prossimeScadenze.length === 0) return [];
  const blocchi = distribuisci(s.prossimeScadenze, () => 1, CAPIENZA_PRIMA, CAPIENZA_SEGUENTI);
  return blocchi.map((voci, i) => ({
    corpo: `<div class="griglia">
      <div class="margine">${i === 0 ? '<span class="num">5</span>Scadenzario' : "segue"}</div>
      <div>
        ${
          i === 0
            ? `<h2 class="sezione">Adempimenti in scadenza</h2>
               <p class="occhiello">Le prossime ${s.prossimeScadenze.length} scadenze sui moduli in
               perimetro, in ordine cronologico. Le date non sono inserite a mano: si derivano
               dall'ultima esecuzione e dalla periodicità prevista dal catalogo.</p>`
            : ""
        }
        ${tabellaVoci(voci)}
      </div>
    </div>`,
  }));
}

function esclusioniEChiusura(s: Snapshot, studio: string): Pagina[] {
  const esclusioni =
    s.esclusioni.length === 0
      ? `<p>Nessun adempimento è stato escluso dal perimetro: la conformità è calcolata
         sull'intero catalogo dei moduli attivi.</p>`
      : `<p class="occhiello">${inLettere(s.esclusioni.length).replace(/^./, (c) => c.toUpperCase())}
         ${s.esclusioni.length === 1 ? "adempimento è stato escluso" : "adempimenti sono stati esclusi"}
         dal perimetro in quanto non applicabili. L'esclusione richiede sempre una motivazione
         scritta, che si riporta qui integralmente: un denominatore ridotto senza spiegazione non è
         verificabile.</p>
         <table class="tabella fitta">
           <thead><tr><th>Cod.</th><th>Adempimento</th><th>Motivazione dell'esclusione</th></tr></thead>
           <tbody>${s.esclusioni
             .map(
               (e) => `<tr><td class="mono">${esc(e.codice)}</td><td>${esc(e.titolo)}</td>
               <td>${esc(e.motivazione)}</td></tr>`,
             )
             .join("")}</tbody>
         </table>`;

  return [
    {
      corpo: `<div class="griglia">
      <div class="margine"><span class="num">6</span>Esclusioni</div>
      <div>
        <h2 class="sezione">Adempimenti non applicabili</h2>
        ${esclusioni}
      </div>

      <div class="margine"><span class="num">7</span>Chiusura</div>
      <div>
        <h2 class="sezione">Dichiarazione di redazione</h2>
        <p>La presente relazione è generata dalla Suite Compliance sui dati registrati
        nell'istanza di ${esc(studio)} alla data del ${formattaIt(s.dataRiferimento)}. I valori
        riportati sono congelati al momento della pubblicazione: modifiche successive agli
        adempimenti non alterano questo documento, e producono semmai una relazione nuova.</p>
        <p>Ogni percentuale riportata dichiara il proprio denominatore. Nessun valore è stimato,
        interpolato o proiettato: dove un dato non esiste, la relazione lo dice invece di
        sostituirlo con una media.</p>
        <div class="firme">
          <div><span class="riga-firma"></span>Il redattore</div>
          <div><span class="riga-firma"></span>Per l'ente destinatario</div>
        </div>
      </div>
    </div>`,
      aerata: true,
    },
  ];
}

// ============================================================================================

export function documentoRelazione(
  s: Snapshot,
  opzioni: { studio: string; numero: number; impronta: string },
): Documento {
  const pagine: Pagina[] = [
    { corpo: copertina(s, opzioni.studio, opzioni.numero, opzioni.impronta), nuda: true },
    { corpo: oggettoEMetodo(s) },
    { corpo: quadro(s) },
    ...pagineCritiche(s),
    ...pagineScadenze(s),
    ...esclusioniEChiusura(s, opzioni.studio),
  ];

  return {
    titolo: `Relazione di conformità · ${s.azienda.nome}`,
    testatina: {
      sinistra: s.ambito === "suite" ? "Relazione integrata di conformità" : "Relazione di conformità",
      destra: s.azienda.nome,
    },
    piede: { sinistra: `${opzioni.studio} · n. ${opzioni.numero} del ${formattaIt(s.dataRiferimento)}` },
    pagine,
  };
}

export function htmlRelazione(
  s: Snapshot,
  opzioni: { studio: string; numero: number; impronta: string },
): string {
  return componi(documentoRelazione(s, opzioni));
}
