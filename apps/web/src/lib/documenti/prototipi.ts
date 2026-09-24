import {
  CATALOGHI,
  CLIENTI_DIMOSTRATIVI,
  DOMINI,
  ETICHETTE_DOMINIO,
  PESI,
  PRESIDI_CHIAVE,
  agenda,
  conformitaEffettiva,
  conformitaLavoro,
  COLLEGAMENTI,
  categorieDi,
  conteggi,
  costruisciDemo,
  criticiAperti,
  descriviPeriodicita,
  esposizione,
  finestre,
  formattaIt,
  piuGiorni,
  prontezza,
  risolviTutti,
  ruoliDi,
  templatePerCodice,
  type AdempimentoRisolto,
  type Dominio,
  type StatoScadenza,
  type VoceAgenda,
} from "@legisboard/engine";
import {
  COSTO_CATEGORIA,
  componi,
  costoRighe,
  distribuisci,
  esc,
  righeStimate,
  type Documento,
  type Pagina,
} from "./impaginazione";

/** Numeri in italiano: virgola decimale e punto per le migliaia, senza eccezioni. */
const num = (n: number, decimali = 0) =>
  n.toLocaleString("it-IT", { minimumFractionDigits: decimali, maximumFractionDigits: decimali });

// I QUATTRO PROTOTIPI DI DOCUMENTO.
//
// Si consegnano PRIMA che esista il generatore, perché il registro editoriale va approvato
// quando cambiarlo costa un pomeriggio e non quando è cablato in tredici sezioni.
//
// Ognuno mette alla prova un problema tipografico diverso:
//   relazione   → l'identità: copertina, frontespizio, i numeri che si spiegano
//   assessment  → la densità: 64 righe di testo legale italiano su più pagine
//   fascicolo   → il momento dell'ispezione: un modulo da spuntare, non una stampa
//   scadenzario → l'allegato operativo: tre decreti in una lista sola
//
// I dati sono quelli veri del motore sui cataloghi dimostrativi. Un documento provato su
// segnaposto non dice nulla su come reggerà «Valutazione Rischio Chimico · RSPP / Medico».

export const PROTOTIPI = ["relazione", "assessment", "fascicolo", "scadenzario"] as const;
export type Prototipo = (typeof PROTOTIPI)[number];

export function isPrototipo(s: string): s is Prototipo {
  return (PROTOTIPI as readonly string[]).includes(s);
}

/** Azienda e studio di comodo. Nel generatore vero arrivano dal database. */
const AZIENDA = {
  ragioneSociale: "Fondiaria Meccanica Verdi S.p.A.",
  sedeLegale: "Via Emilia Ponente 214, 40133 Bologna (BO)",
  piva: "02914770376",
  ateco: "25.62.00 · Lavorazione e finitura di metalli",
  addetti: 87,
} as const;

const STUDIO = {
  nome: "Studio Bertelli & Associati",
  qualifica: "Consulenza privacy · Compliance 231 · Sicurezza sul lavoro",
  professionista: "Avv. Chiara Bertelli",
  incarico: "DPO designato ai sensi dell'art. 37 GDPR",
} as const;

/** Protocollo deterministico: nei prototipi la data è fissa, così il PDF è confrontabile. */
const RIFERIMENTO = "2026-08-02";
const PROTOCOLLO = "2026/RC-0148";

const OGGI = RIFERIMENTO;

const risolti = (d: Dominio): readonly AdempimentoRisolto[] =>
  risolviTutti(costruisciDemo(CATALOGHI[d], CLIENTI_DIMOSTRATIVI[d], OGGI), OGGI);

const titoloDi = (a: { dominio: Dominio; codice: string }) =>
  templatePerCodice(a.dominio, a.codice)?.titolo ?? a.codice;

const CLASSE_SCADENZA: Readonly<Record<StatoScadenza, string>> = {
  Scaduta: "scaduta",
  "In scadenza": "imminente",
  Regolare: "regolare",
  "Da programmare": "programmare",
};

const pct = (n: number) => `${Math.round(n * 100)}%`;

/** La data con i giorni residui accanto, colorata e sempre accompagnata dalla parola. */
function cellaScadenza(a: AdempimentoRisolto): string {
  const c = CLASSE_SCADENZA[a.statoScadenza];
  if (!a.scadenza) return `<td class="data programmare">—</td>`;
  const g = a.giorniAllaScadenza;
  const segno = g === null ? "" : ` <span class="giorni">${g < 0 ? g : `+${g}`}gg</span>`;
  return `<td class="data ${c}">${formattaIt(a.scadenza)}${segno}</td>`;
}

// ============================================================================================
// 1 · Relazione integrata di conformità
// ============================================================================================

function copertina(): string {
  const moduli = DOMINI.map((d) => `${ETICHETTE_DOMINIO[d].breve} · ${ETICHETTE_DOMINIO[d].norma}`);
  return `
  <div class="carta-intestata">
    <span class="studio">${esc(STUDIO.nome)}</span>
    <span class="qualifica">${esc(STUDIO.qualifica)}</span>
  </div>

  <p class="tipo-atto">Relazione integrata di conformità</p>
  <h1 class="titolo-atto">Stato degli adempimenti sui tre decreti</h1>
  <p class="sottotitolo-atto">${esc(AZIENDA.ragioneSociale)}</p>

  <div class="specchietto">
    <dl>
      <dt>Ente destinatario</dt><dd>${esc(AZIENDA.ragioneSociale)}</dd>
      <dt>Sede legale</dt><dd>${esc(AZIENDA.sedeLegale)}</dd>
      <dt>Partita IVA</dt><dd class="mono">${AZIENDA.piva}</dd>
      <dt>Attività prevalente</dt><dd>${esc(AZIENDA.ateco)}</dd>
      <dt>Moduli in perimetro</dt><dd>${moduli.map(esc).join("<br>")}</dd>
      <dt>Data di riferimento</dt><dd class="mono">${formattaIt(RIFERIMENTO)}</dd>
    </dl>
  </div>

  <div class="emissione">
    <div><b>Protocollo</b>${PROTOCOLLO}</div>
    <div><b>Redatta da</b>${esc(STUDIO.professionista)}<br>${esc(STUDIO.incarico)}</div>
    <div><b>Impronta del documento</b>SHA-256 apposta<br>all'atto della pubblicazione</div>
  </div>`;
}

function oggettoEMetodo(): string {
  const totale = DOMINI.reduce((n, d) => n + CATALOGHI[d].length, 0);
  return `<div class="griglia">
    <div class="margine"><span class="num">1</span>Oggetto</div>
    <div>
      <h2 class="sezione">Oggetto e perimetro</h2>
      <p class="occhiello">La presente relazione fotografa lo stato di conformità di
      ${esc(AZIENDA.ragioneSociale)} alla data del ${formattaIt(RIFERIMENTO)}, sulla base dei
      ${totale} adempimenti censiti nei tre moduli attivi.</p>
      <p>La rilevazione è stata condotta sul catalogo unificato della suite, che riconduce a un
      modello unico gli obblighi discendenti dal Regolamento UE 2016/679, dal D.Lgs 231/2001 e dal
      D.Lgs 81/2008. Gli adempimenti che i tre corpi normativi condividono, segnatamente il
      documento di valutazione dei rischi, la nomina del responsabile del servizio di prevenzione e
      protezione e i flussi informativi in materia di infortuni, sono censiti una sola volta nel
      modulo che ne è titolare e letti dagli altri, con indicazione della provenienza.</p>
    </div>

    <div class="margine"><span class="num">2</span>Metodo</div>
    <div>
      <h3 class="paragrafo">Criteri di misurazione</h3>
      <p>Ogni adempimento è descritto da due stati distinti e non sovrapponibili. Lo
      <em>stato del lavoro</em> è dichiarato da una persona e attesta che l'attività è stata svolta.
      Lo <em>stato della scadenza</em> è calcolato dalla data di ultima esecuzione e dalla
      periodicità prevista, e attesta che l'adempimento è ancora valido.</p>
      <p>La distinzione non è formale. Un documento redatto quattro anni fa, su un obbligo a
      periodicità triennale, risulta <em>completato</em> e nondimeno <em>scaduto</em>: la
      conformità sostanziale è venuta meno pur in presenza dell'attività. Le percentuali riportate
      al § 3 sono calcolate sulla conformità effettiva, che richiede entrambe le condizioni.</p>

      <div class="metodo">
        <h4>Definizioni adottate</h4>
        <p><b>Conformità di lavoro</b> · adempimenti completati / adempimenti applicabili.</p>
        <p><b>Conformità effettiva</b> · adempimenti completati <em>e</em> non scaduti /
        adempimenti applicabili. È la misura riportata in copertina di ciascun modulo.</p>
        <p><b>Applicabili</b> · il totale al netto degli adempimenti dichiarati non applicabili,
        ciascuno dei quali richiede una motivazione scritta agli atti.</p>
        <p><b>In scadenza</b> · scadenza compresa fra la data di riferimento e i 30 giorni
        successivi.</p>
        <p><b>Da programmare</b> · adempimento periodico per il quale non risulta agli atti
        alcuna data di ultima esecuzione. Non è una scadenza mancata: è un presidio mai avviato,
        e nella lettura di un organo accertatore pesa di più.</p>
      </div>
    </div>

    <div class="margine"><span class="num">2.1</span>Perimetro</div>
    <div><h3 class="paragrafo">Composizione del catalogo</h3></div>
    <div class="larga">
      <table>
        <thead><tr>
          <th>Modulo</th><th>Norma di riferimento</th><th>Materia</th>
          <th class="num">Adempimenti</th><th class="num">Categorie</th><th class="num">Ruoli</th>
        </tr></thead>
        <tbody>${DOMINI.map(
          (d) => `<tr>
          <td><span class="dominio ${d}">${ETICHETTE_DOMINIO[d].breve}</span></td>
          <td>${esc(ETICHETTE_DOMINIO[d].norma)}</td>
          <td>${esc(ETICHETTE_DOMINIO[d].esteso)}</td>
          <td class="num">${CATALOGHI[d].length}</td>
          <td class="num">${categorieDi(d).length}</td>
          <td class="num">${ruoliDi(d).length}</td>
        </tr>`,
        ).join("")}</tbody>
      </table>
    </div>
  </div>`;
}

function sintesi(): string {
  const perDominio = DOMINI.map((d) => {
    const a = risolti(d);
    return {
      d,
      eff: conformitaEffettiva(a),
      lav: conformitaLavoro(a),
      c: conteggi(a).perScadenza,
      critici: criticiAperti(a).length,
    };
  });

  const tutti = DOMINI.flatMap(risolti);
  const complessiva = conformitaEffettiva(tutti);
  const esp = esposizione(tutti);

  const righe = perDominio
    .map(
      (r) => `<tr>
      <td><span class="dominio ${r.d}">${ETICHETTE_DOMINIO[r.d].breve}</span></td>
      <td>${esc(ETICHETTE_DOMINIO[r.d].norma)}</td>
      <td class="num"><span class="quota">${r.eff.percentuale ?? "—"}%</span>
        <span class="denominatore">${r.eff.numeratore}/${r.eff.applicabili}</span></td>
      <td class="num"><span class="quota">${r.lav.percentuale ?? "—"}%</span>
        <span class="denominatore">${r.lav.numeratore}/${r.lav.applicabili}</span></td>
      <td class="num stato scaduta">${r.c.Scaduta}</td>
      <td class="num stato imminente">${r.c["In scadenza"]}</td>
      <td class="num">${r.critici}</td>
    </tr>`,
    )
    .join("");

  const componenti: readonly [string, number, number, string][] = [
    [
      "Rischio scoperto",
      esp.componenti.rischioScoperto,
      PESI.rischioScoperto,
      `${num(esp.dettaglio.rischioPesatoScoperto, 1)} di ${num(esp.dettaglio.rischioPesatoTotale, 1)} punti di rischio pesato`,
    ],
    [
      "Ritardo",
      esp.componenti.ritardo,
      PESI.ritardo,
      `${esp.dettaglio.scadute} scadenze mancate su ${esp.dettaglio.applicabili} applicabili`,
    ],
    [
      "Criticità",
      esp.componenti.criticita,
      PESI.criticita,
      `${esp.dettaglio.criticiDaPresidiare} adempimenti critici da presidiare`,
    ],
  ];

  const scomposizione = componenti
    .map(
      ([nome, valore, peso, spiega]) => `<tr>
        <td class="voce">${esc(nome)}</td>
        <td class="formula">${num(valore, 2)} × ${num(peso, 2)}</td>
        <td class="barra"><span style="width:${Math.max(0.5, valore * peso * 100 * 1.15)}mm"></span></td>
        <td class="num">${num(valore * peso * 100, 1)}</td>
      </tr>
      <tr class="glossa"><td></td><td colspan="3">${esc(spiega)}</td></tr>`,
    )
    .join("");

  return `<div class="griglia">
    <div class="margine"><span class="num">3</span>Sintesi</div>
    <div>
      <h2 class="sezione">Sintesi direzionale</h2>
      <p class="occhiello">Alla data di riferimento la conformità effettiva complessiva è pari al
      ${complessiva.percentuale}%, su ${complessiva.applicabili} adempimenti applicabili.</p>
    </div>

    <div class="larga">
      <table class="prospetto">
        <thead><tr>
          <th>Modulo</th><th>Norma</th>
          <th class="num">Conformità effettiva</th><th class="num">Conformità di lavoro</th>
          <th class="num">Scadute</th><th class="num">In scadenza</th><th class="num">Critici aperti</th>
        </tr></thead>
        <tbody>${righe}</tbody>
        <tfoot><tr>
          <td colspan="2">Complessivo sui moduli attivi</td>
          <td class="num">${complessiva.percentuale}% <span class="denominatore">${complessiva.numeratore}/${complessiva.applicabili}</span></td>
          <td colspan="4"></td>
        </tr></tfoot>
      </table>
      <p class="nota" style="margin-top:2.5mm">Il complessivo è calcolato sull'insieme unito dei tre
      cataloghi e non come media delle tre percentuali: una media pondererebbe allo stesso modo un
      modulo da 42 adempimenti e uno da 65, e basterebbe disattivare un modulo per migliorare il
      risultato.</p>
    </div>

    <div class="margine"><span class="num">3.1</span>Indice</div>
    <div>
      <h3 class="paragrafo">Indice di esposizione · ${esp.indice} su 100 · esposizione ${esc(esp.giudizio.toLowerCase())}</h3>
      <p>L'indice non è una stima in denaro e non va inteso come tale. È una misura relativa di
      quanto rischio resta scoperto, composta da tre quote con pesi dichiarati.</p>
      <div class="scomposizione">
        <table><tbody>${scomposizione}
          <tr class="somma"><td class="voce">Indice</td><td class="formula">somma × 100</td><td></td>
          <td class="num">${esp.indice}</td></tr>
        </tbody></table>
      </div>
    </div>

    <div class="margine"><span class="num">3.2</span>Letture<br>condivise</div>
    <div>
      <h3 class="paragrafo">Adempimenti a lettura condivisa · primi 4 di ${COLLEGAMENTI.length}</h3>
      <p>Censiti una sola volta nel modulo titolare, concorrono alla conformità di più decreti:
      chiudere il presidio all'origine aggiorna anche la lettura degli altri. Ciascun collegamento
      dichiara la norma che lo giustifica: senza riferimento è un'assunzione, non un collegamento.</p>
    </div>
    <div class="larga">
      <table>
        <thead><tr>
          <th>Origine</th><th>Cod.</th><th>Presidio</th>
          <th>Letto da</th><th>Cod.</th><th>Riferimento</th>
        </tr></thead>
        <tbody>${COLLEGAMENTI.slice(0, 4)
          .map(
            (c) => `<tr>
          <td><span class="dominio ${c.da.dominio}">${ETICHETTE_DOMINIO[c.da.dominio].breve}</span></td>
          <td class="codice">${c.da.codice}</td>
          <td>${esc(titoloDi(c.da))}</td>
          <td><span class="dominio ${c.a.dominio}">${ETICHETTE_DOMINIO[c.a.dominio].breve}</span></td>
          <td class="codice">${c.a.codice}</td>
          <td>${esc(c.riferimento)}</td>
        </tr>`,
          )
          .join("")}</tbody>
      </table>
    </div>
  </div>`;
}

function rilievi(): string {
  const tutti = DOMINI.flatMap(risolti);
  const critici = agenda(tutti)
    .filter((v) => v.priorita === "Critica")
    .slice(0, 24);

  const righe = critici
    .map(
      (v) => `<tr>
      <td><span class="dominio ${v.dominio}">${ETICHETTE_DOMINIO[v.dominio].breve}</span></td>
      <td class="codice">${v.codice}</td>
      <td>${esc(titoloDi(v))}</td>
      <td>${esc(v.ruolo)}</td>
      <td><span class="stato ${CLASSE_SCADENZA[v.statoScadenza]}">${esc(v.statoScadenza)}</span></td>
      ${cellaScadenza(v)}
    </tr>`,
    )
    .join("");

  return `<div class="griglia">
    <div class="margine"><span class="num">4</span>Rilievi</div>
    <div>
      <h2 class="sezione">Rilievi a priorità critica</h2>
      <p class="occhiello">Adempimenti a priorità critica che alla data di riferimento non
      risultano presidiati, ordinati per urgenza.</p>
    </div>
    <div class="larga">
      <table>
        <thead><tr>
          <th>Modulo</th><th>Cod.</th><th>Adempimento</th><th>Responsabile</th>
          <th>Stato</th><th>Scadenza</th>
        </tr></thead>
        <tbody>${righe}</tbody>
      </table>
      <p class="nota" style="margin-top:3mm">L'elenco riporta le prime ${critici.length} posizioni per
      urgenza. Il dettaglio completo per singolo decreto è riportato negli assessment analitici
      allegati alla presente relazione.</p>
    </div>
  </div>`;
}

function documentoRelazione(): Documento {
  return {
    titolo: `Relazione integrata di conformità · ${AZIENDA.ragioneSociale}`,
    testatina: { sinistra: "Relazione integrata di conformità", destra: AZIENDA.ragioneSociale },
    piede: { sinistra: `Prot. ${PROTOCOLLO} · ${formattaIt(RIFERIMENTO)}` },
    pagine: [
      { corpo: copertina(), nuda: true },
      { corpo: oggettoEMetodo() },
      { corpo: sintesi() },
      { corpo: rilievi() },
    ],
  };
}

// ============================================================================================
// 2 · Assessment analitico di un dominio
// ============================================================================================

type VoceTabella =
  | { readonly tipo: "categoria"; readonly nome: string }
  | { readonly tipo: "riga"; readonly a: AdempimentoRisolto };

function documentoAssessment(dominio: Dominio = "d81"): Documento {
  const adempimenti = risolti(dominio);
  const etichetta = ETICHETTE_DOMINIO[dominio];

  // Raggruppa per categoria mantenendo l'ordine del catalogo: è l'ordine in cui il
  // professionista conosce la materia, e riordinarlo alfabeticamente lo disorienterebbe.
  const voci: VoceTabella[] = [];
  let categoriaCorrente = "";
  for (const a of adempimenti) {
    const cat = templatePerCodice(dominio, a.codice)?.categoria ?? "Altro";
    if (cat !== categoriaCorrente) {
      voci.push({ tipo: "categoria", nome: cat });
      categoriaCorrente = cat;
    }
    voci.push({ tipo: "riga", a });
  }

  // Il costo di una riga non è uniforme: un titolo lungo va a capo. La stima parte dalla
  // larghezza reale della colonna «Adempimento» in questa tabella a sette colonne.
  const costo = (v: VoceTabella): number =>
    v.tipo === "categoria" ? COSTO_CATEGORIA : costoRighe(righeStimate(titoloDi(v.a), 32));

  const blocchi = distribuisci(voci, costo, 29, 33.5, (v) => v.tipo === "categoria");

  const rendi = (v: VoceTabella): string => {
    if (v.tipo === "categoria") return `<tr class="categoria"><td colspan="7">${esc(v.nome)}</td></tr>`;
    const a = v.a;
    return `<tr>
      <td class="codice">${a.codice}</td>
      <td>${esc(titoloDi(a))}</td>
      <td>${esc(a.ruolo)}</td>
      <td>${esc(descriviPeriodicita(a.periodicita))}</td>
      <td><span class="lavoro${a.stato === "Completata" ? " fatto" : ""}">${esc(a.stato)}</span></td>
      <td><span class="stato ${CLASSE_SCADENZA[a.statoScadenza]}">${esc(a.statoScadenza)}</span></td>
      ${cellaScadenza(a)}
    </tr>`;
  };

  const eff = conformitaEffettiva(adempimenti);
  const c = conteggi(adempimenti).perScadenza;

  const intestazioneTabella = `<thead><tr>
    <th>Cod.</th><th>Adempimento</th><th>Responsabile</th><th>Periodicità</th>
    <th>Lavoro</th><th>Stato</th><th>Scadenza</th>
  </tr></thead>`;

  const pagine: Pagina[] = blocchi.map((blocco, i) => {
    const testa =
      i === 0
        ? `<div class="griglia">
        <div class="margine"><span class="num">A</span>${esc(etichetta.norma)}</div>
        <div>
          <h2 class="sezione">Assessment analitico · ${esc(etichetta.esteso)}</h2>
          <p class="occhiello">${adempimenti.length} adempimenti censiti. Conformità effettiva
          ${eff.percentuale}% (${eff.numeratore}/${eff.applicabili}); ${c.Scaduta} scadenze mancate,
          ${c["In scadenza"]} in scadenza entro trenta giorni.</p>
        </div>
      </div>`
        : "";
    return {
      corpo: `${testa}<table>${intestazioneTabella}<tbody>${blocco.map(rendi).join("")}</tbody></table>`,
    };
  });

  return {
    titolo: `Assessment analitico ${etichetta.breve} · ${AZIENDA.ragioneSociale}`,
    testatina: { sinistra: `Assessment analitico · ${etichetta.breve}`, destra: AZIENDA.ragioneSociale },
    piede: { sinistra: `Prot. ${PROTOCOLLO} · ${formattaIt(RIFERIMENTO)}` },
    pagine,
  };
}

// ============================================================================================
// 3 · Fascicolo ispettivo
// ============================================================================================

function documentoFascicolo(): Documento {
  const adempimenti = risolti("gdpr");
  const chiave = PRESIDI_CHIAVE.gdpr;
  const pr = prontezza(adempimenti, chiave);

  const voci = chiave
    .map((codice) => adempimenti.find((a) => a.codice === codice))
    .filter((a): a is AdempimentoRisolto => a !== undefined);

  // Nessuna doppia marcatura: la colonna «Validità» dice già, in parola e in colore, che il
  // presidio non regge. Aggiungere «da reperire» accanto alla casella tingeva di rosso
  // un'intera colonna per ripetere un'informazione che era già lì due centimetri prima.
  const riga = (a: AdempimentoRisolto) => {
    const data = a.scadenza ? formattaIt(a.scadenza) : "—";
    return `<div class="voce">
      <span class="cod">${a.codice}</span>
      <span class="tit">${esc(titoloDi(a))}<em>${esc(a.ruolo)} · ${esc(descriviPeriodicita(a.periodicita))}</em></span>
      <span class="dt ${CLASSE_SCADENZA[a.statoScadenza]}">${data}<br>
        <span class="stato ${CLASSE_SCADENZA[a.statoScadenza]}">${esc(a.statoScadenza)}</span></span>
      <span><span class="casella"></span></span>
    </div>`;
  };

  // Oltre ai presidi chiave, la documentazione che l'accertamento chiede in seconda battuta.
  // Il fascicolo che si consegna non contiene otto righe: contiene tutto ciò che serve.
  const supporto = adempimenti
    .filter((a) => !chiave.includes(a.codice) && a.stato !== "Non applicabile")
    .slice(0, 12);
  const supportoPrima = supporto.slice(0, 4);
  const supportoSegue = supporto.slice(4);

  const p1 = `<div class="griglia">
    <div class="margine"><span class="num">F</span>Reg. UE<br>2016/679</div>
    <div>
      <h2 class="sezione">Fascicolo ispettivo</h2>
      <p class="occhiello">Garante per la protezione dei dati personali · documentazione da
      esibire in sede di accertamento ispettivo ai sensi dell'art. 58 par. 1 lett. e) ed f) GDPR.</p>
      <p>Il presente fascicolo elenca, nell'ordine in cui vengono ordinariamente richiesti, i
      presidi documentali che ${esc(AZIENDA.ragioneSociale)} è tenuta a esibire. La colonna di
      destra è predisposta per la spunta in contraddittorio: si stampa vuota e viene compilata
      dall'incaricato dell'accertamento.</p>
      <p class="nota">Indice di prontezza alla data di riferimento: <b>${pr.indice} su 100</b> ·
      conformità ${pct(pr.componenti.conformita)}, presidi chiave in ordine
      ${pct(pr.componenti.presidiChiave)}, puntualità ${pct(pr.componenti.puntualita)}.
      ${
        pr.presidiScoperti.length > 0
          ? `Alla data odierna <b>${pr.presidiScoperti.length}</b> presidi chiave non reggerebbero un controllo: ${pr.presidiScoperti.join(", ")}.`
          : "Tutti i presidi chiave risultano in ordine."
      }</p>
    </div>
    <div class="larga" style="margin-top:4mm">
      <p class="intestazione-blocco">A · Presidi richiesti in apertura di accertamento</p>
      <div class="riscontro">
        <div class="voce intestazione">
          <span class="cod">Cod.</span><span class="tit">Presidio</span>
          <span class="dt">Validità</span><span>Esibito</span>
        </div>
        ${voci.map(riga).join("")}
      </div>

      <p class="intestazione-blocco" style="margin-top:5mm">B · Documentazione di supporto</p>
      <div class="riscontro compatta">${supportoPrima.map(riga).join("")}</div>
    </div>
  </div>`;

  const p2 = `<div class="griglia">
    <div class="margine"><span class="num">F.1</span>Supporto</div>
    <div><h3 class="paragrafo" style="margin-top:0">B · Documentazione di supporto (segue)</h3></div>
    <div class="larga">
      <div class="riscontro compatta">${supportoSegue.map(riga).join("")}</div>
    </div>

    <div class="margine"><span class="num">F.2</span>Verbale</div>
    <div>
      <h3 class="paragrafo">Annotazioni</h3>
      <p class="nota">Spazio riservato alle annotazioni dell'organo accertatore e alle
      dichiarazioni rese dal titolare del trattamento o dal suo rappresentante.</p>
      <div style="height:52mm;border-bottom:0.25pt solid var(--filo);border-top:0.25pt solid var(--filo);
        background:repeating-linear-gradient(to bottom, transparent 0 7.9mm, var(--filo-sottile) 7.9mm 8mm)">
      </div>

      <div class="firme">
        <div><span>Per l'ente · ${esc(STUDIO.incarico)}</span></div>
        <div><span>Per l'organo accertatore</span></div>
      </div>

      <p class="nota" style="margin-top:14mm">Il presente fascicolo è generato dalla suite di
      compliance alla data del ${formattaIt(RIFERIMENTO)} e riflette lo stato dei presidi a quella
      data. Non costituisce attestazione di conformità né sostituisce la documentazione originale,
      che resta conservata agli atti dell'ente.</p>
    </div>
  </div>`;

  return {
    titolo: `Fascicolo ispettivo · ${AZIENDA.ragioneSociale}`,
    testatina: { sinistra: "Fascicolo ispettivo · Garante", destra: AZIENDA.ragioneSociale },
    piede: { sinistra: `Prot. ${PROTOCOLLO} · ${formattaIt(RIFERIMENTO)}` },
    // La seconda pagina è per metà bianca di proposito: è lo spazio per le annotazioni a
    // mano dell'organo accertatore. `aerata` lo dichiara al cancello, che altrimenti la
    // boccerebbe come pagina mal riempita.
    pagine: [{ corpo: p1 }, { corpo: p2, aerata: true }],
  };
}

// ============================================================================================
// 4 · Scadenzario operativo
// ============================================================================================

function documentoScadenzario(): Documento {
  const tutti = DOMINI.flatMap(risolti);
  const f = finestre(tutti);

  type Voce =
    { readonly tipo: "titolo"; readonly nome: string } | { readonly tipo: "riga"; readonly v: VoceAgenda };

  const sezioni: readonly [string, readonly VoceAgenda[]][] = [
    ["Scadute · intervento immediato", f.scadute],
    ["Entro sette giorni", f.entro7],
    ["Entro trenta giorni", f.entro30],
    ["Entro novanta giorni", f.entro90],
  ];

  const voci: Voce[] = [];
  for (const [nome, elenco] of sezioni) {
    if (elenco.length === 0) continue;
    voci.push({ tipo: "titolo", nome: `${nome} · ${elenco.length}` });
    for (const v of elenco) voci.push({ tipo: "riga", v });
  }

  // La colonna «Adempimento» dello scadenzario è più larga di quella dell'assessment:
  // ha una colonna in meno da ospitare, e ci stanno una cinquantina di caratteri per riga.
  const costo = (x: Voce) =>
    x.tipo === "titolo" ? COSTO_CATEGORIA : costoRighe(righeStimate(titoloDi(x.v), 50));
  const blocchi = distribuisci(voci, costo, 31, 35, (x) => x.tipo === "titolo");

  const rendi = (x: Voce): string => {
    if (x.tipo === "titolo") return `<tr class="categoria"><td colspan="6">${esc(x.nome)}</td></tr>`;
    const v = x.v;
    return `<tr>
      <td><span class="dominio ${v.dominio}">${ETICHETTE_DOMINIO[v.dominio].breve}</span></td>
      <td class="codice">${v.codice}</td>
      <td>${esc(titoloDi(v))}</td>
      <td>${esc(v.ruolo)}</td>
      <td>${esc(v.priorita)}</td>
      ${cellaScadenza(v)}
    </tr>`;
  };

  const totale = f.scadute.length + f.entro7.length + f.entro30.length + f.entro90.length;

  const pagine: Pagina[] = blocchi.map((blocco, i) => {
    const testa =
      i === 0
        ? `<div class="griglia">
        <div class="margine"><span class="num">S</span>Tre<br>decreti</div>
        <div>
          <h2 class="sezione">Scadenzario operativo · novanta giorni</h2>
          <p class="occhiello">${totale} adempimenti da presidiare sui tre decreti in una lista
          sola: ${f.scadute.length} già scaduti e ${totale - f.scadute.length} in scadenza entro il
          ${formattaIt(piuGiorni(RIFERIMENTO, 90))}.</p>
        </div>
      </div>`
        : "";
    return {
      corpo: `${testa}<table><thead><tr>
        <th>Modulo</th><th>Cod.</th><th>Adempimento</th><th>Responsabile</th><th>Priorità</th><th>Scadenza</th>
      </tr></thead><tbody>${blocco.map(rendi).join("")}</tbody></table>`,
    };
  });

  return {
    titolo: `Scadenzario operativo · ${AZIENDA.ragioneSociale}`,
    testatina: { sinistra: "Scadenzario operativo · 90 giorni", destra: AZIENDA.ragioneSociale },
    piede: { sinistra: `Prot. ${PROTOCOLLO} · ${formattaIt(RIFERIMENTO)}` },
    pagine,
  };
}

// ============================================================================================

const COSTRUTTORI: Readonly<Record<Prototipo, () => Documento>> = {
  relazione: documentoRelazione,
  assessment: () => documentoAssessment("d81"),
  fascicolo: documentoFascicolo,
  scadenzario: documentoScadenzario,
};

export function documentoPrototipo(quale: Prototipo): Documento {
  return COSTRUTTORI[quale]();
}

export function htmlPrototipo(quale: Prototipo): string {
  return componi(documentoPrototipo(quale));
}
