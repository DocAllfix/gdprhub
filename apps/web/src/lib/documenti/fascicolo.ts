import { formattaIt } from "@legisboard/engine";
import type { Snapshot, VoceCritica } from "@/features/relazioni/snapshot";
import { componi, distribuisci, esc, type Documento, type Pagina } from "./impaginazione";

// IL FASCICOLO ISPETTIVO.
//
// Non è la relazione filtrata: è un documento diverso, perché serve a una persona diversa in
// una situazione diversa.
//
// La RELAZIONE la legge un consiglio di amministrazione e risponde a «come stiamo». Il
// FASCICOLO lo legge un ispettore seduto in azienda, e risponde a «mostrami». La differenza
// pratica è che il fascicolo non argomenta: elenca, dichiara la fonte, e lascia lo spazio
// per spuntare. Chi lo consulta non vuole essere convinto, vuole verificare.
//
// TRE COSE CHE LA RELAZIONE NON HA, e che qui sono il documento.
//
//   LA CASELLA SI STAMPA VUOTA. È l'ispettore a spuntarla, e per questo il foglio è un
//   verbale e non la stampa di una schermata. Precompilarla significherebbe dirgli cosa
//   pensare di ciò che non ha ancora guardato.
//
//   OGNI VOCE PORTA L'ARTICOLO, non la categoria interna. Un ispettore del lavoro non cerca
//   «Documenti Obbligatori», cerca l'art. 17 comma 1 lettera a: l'ordinamento è per norma,
//   perché è così che è organizzata la sua testa e il suo verbale.
//
//   LA COLONNA DELL'EVIDENZA DICE SE IL DOCUMENTO ESISTE, non se l'attività è stata svolta.
//   Sono due domande diverse e in un'ispezione conta la prima: «risulta fatto» senza carta
//   è esattamente ciò che un verbale annota come non dimostrato.

/** Chi viene a controllare, e cosa guarda. */
export const ORGANI = {
  garante: {
    nome: "Garante per la protezione dei dati personali",
    breve: "Garante privacy",
    ambito: "gdpr" as const,
    riferimento: "Reg. UE 2016/679 · D.Lgs 196/2003 come modificato dal D.Lgs 101/2018",
    poteri:
      "Accesso ai dati e ai documenti, ispezioni e verifiche presso la sede del titolare, richiesta di informazioni ai sensi dell'art. 58 del Regolamento.",
  },
  ispettorato: {
    nome: "Ispettorato Nazionale del Lavoro",
    breve: "Ispettorato del Lavoro",
    ambito: "d81" as const,
    riferimento: "D.Lgs 81/2008 · D.Lgs 149/2015",
    poteri:
      "Vigilanza sull'applicazione della normativa in materia di salute e sicurezza, accesso ai luoghi di lavoro e alla documentazione obbligatoria.",
  },
  asl: {
    nome: "Azienda Sanitaria Locale · Servizio Prevenzione e Sicurezza",
    breve: "ASL",
    ambito: "d81" as const,
    riferimento: "D.Lgs 81/2008 · L. 833/1978",
    poteri:
      "Vigilanza igienico-sanitaria sui luoghi di lavoro, verifica della sorveglianza sanitaria e delle misure di prevenzione.",
  },
  giudiziaria: {
    nome: "Autorità giudiziaria · Organismo di Vigilanza",
    breve: "Autorità giudiziaria / OdV",
    ambito: "d231" as const,
    riferimento: "D.Lgs 231/2001",
    poteri:
      "Verifica dell'adozione e dell'efficace attuazione del modello organizzativo ai fini dell'esimente di cui agli artt. 6 e 7.",
  },
} as const;

export type ChiaveOrgano = keyof typeof ORGANI;

export const isOrgano = (s: string): s is ChiaveOrgano => s in ORGANI;

const CLASSE_SCADENZA: Record<string, string> = {
  Scaduta: "st-scaduta",
  "In scadenza": "st-imminente",
  Regolare: "st-regolare",
  "Da programmare": "st-programmare",
};

// ============================================================================================

function copertina(s: Snapshot, organo: (typeof ORGANI)[ChiaveOrgano], studio: string): string {
  return `<div class="lastra">
    <div class="alto">
      <span class="marchio">${esc(studio)}</span>
      <span class="qualifica">Fascicolo ispettivo</span>
    </div>
    <div class="basso">
      <p class="tipo">Documentazione a corredo · ${esc(organo.riferimento)}</p>
      <h1>${esc(organo.nome)}</h1>
      <p class="ente">${esc(s.azienda.nome)}${s.azienda.sede ? ` · ${esc(s.azienda.sede)}` : ""}</p>
      <div class="riga-dati">
        <div><b>Adempimenti in perimetro</b><span class="grande">${s.complessivo.totale}</span></div>
        <div><b>Con evidenza documentale</b><span class="grande">${s.complessivo.conEvidenza}</span><br>su ${s.complessivo.conformitaEffettiva.numeratore} chiusi e validi</div>
        <div><b>Data di riferimento</b>${formattaIt(s.dataRiferimento)}<br>rilevazione a sistema</div>
      </div>
    </div>
  </div>`;
}

function premessa(s: Snapshot, organo: (typeof ORGANI)[ChiaveOrgano]): string {
  return `<div class="griglia">
    <div class="margine"><span class="num">1</span>Premessa</div>
    <div>
      <h2 class="sezione">Oggetto del fascicolo</h2>
      <p class="occhiello">Il presente fascicolo raccoglie, alla data del
      ${formattaIt(s.dataRiferimento)}, lo stato degli adempimenti di ${esc(s.azienda.nome)}
      rientranti nella competenza di ${esc(organo.breve)}, con indicazione per ciascuno della
      norma di riferimento e della disponibilità della relativa evidenza documentale.</p>

      <p>${esc(organo.poteri)}</p>

      <h3 class="paragrafo">Come si legge</h3>
      <p>Ogni voce riporta il riferimento normativo, lo stato del lavoro dichiarato dall'ente, lo
      stato della scadenza calcolato dalla data di ultima esecuzione, e se esiste un documento
      allegato a sistema. Le due colonne di stato non sono ridondanti: un adempimento può
      risultare <em>completato</em> e nondimeno <em>scaduto</em>, e in tal caso l'attività fu
      svolta ma il ciclo previsto dalla periodicità è concluso.</p>

      <p><b>La colonna «documento» dichiara l'esistenza della prova, non l'esecuzione
      dell'attività.</b> Un adempimento che risulta svolto senza documento allegato è indicato
      come tale: la distinzione è deliberata, perché in sede di verifica ciò che non è
      dimostrabile non è dimostrato.</p>

      <div class="metodo">
        <ul>
          <li>Le caselle di riscontro sono stampate vuote: sono a disposizione di chi verifica.</li>
          <li>Le scadenze non sono inserite manualmente: si derivano dall'ultima esecuzione
          registrata e dalla periodicità prevista dalla norma.</li>
          <li>Gli adempimenti dichiarati non applicabili sono elencati a parte con la relativa
          motivazione, e sono esclusi dal computo.</li>
        </ul>
      </div>
    </div>
  </div>`;
}

function tabellaRiscontro(voci: readonly VoceCritica[]): string {
  return `<table class="tabella fitta">
    <thead><tr>
      <th class="num-cella">Visto</th>
      <th>Adempimento</th>
      <th>Riferimento</th>
      <th>Lavoro</th>
      <th>Scadenza</th>
      <th class="num-cella">Documento</th>
    </tr></thead>
    <tbody>${voci
      .map(
        (v) => `<tr>
        <td class="num-cella"><span class="casella"></span></td>
        <td>${esc(v.titolo)}<span class="sotto mono">${esc(v.codice)} · ${esc(v.ruolo)}</span></td>
        <td class="mono">${esc(v.riferimento)}</td>
        <td>${esc(v.stato)}</td>
        <td class="${CLASSE_SCADENZA[v.statoScadenza] ?? ""}">${
          v.scadenza ? formattaIt(v.scadenza) : "—"
        }<span class="sotto">${esc(v.statoScadenza)}</span></td>
        <td class="num-cella">${v.conEvidenza ? "agli atti" : "<b>assente</b>"}</td>
      </tr>`,
      )
      .join("")}</tbody>
  </table>`;
}

function pagineElenco(s: Snapshot, organo: (typeof ORGANI)[ChiaveOrgano]): Pagina[] {
  // Ordinate per riferimento normativo: un ispettore cerca l'articolo, non la categoria
  // interna del nostro catalogo.
  const voci = [...s.critiche, ...s.prossimeScadenze]
    .filter((v, i, tutte) => tutte.findIndex((x) => x.codice === v.codice) === i)
    .sort((a, b) => a.riferimento.localeCompare(b.riferimento, "it"));

  if (voci.length === 0) {
    return [
      {
        corpo: `<div class="griglia">
        <div class="margine"><span class="num">2</span>Riscontro</div>
        <div>
          <h2 class="sezione">Elenco degli adempimenti</h2>
          <p class="occhiello">Nessun adempimento di competenza di ${esc(organo.breve)} risulta
          aperto o in scadenza alla data della rilevazione.</p>
        </div>
      </div>`,
      },
    ];
  }

  const blocchi = distribuisci(voci, () => 1, 18, 26);
  return blocchi.map((gruppo, i) => ({
    corpo: `<div class="griglia">
      <div class="margine">${i === 0 ? '<span class="num">2</span>Riscontro' : "segue"}</div>
      <div>
        ${
          i === 0
            ? `<h2 class="sezione">Elenco degli adempimenti</h2>
               <p class="occhiello">${voci.length} voci di competenza, ordinate per riferimento
               normativo. La prima colonna è a disposizione di chi verifica.</p>`
            : ""
        }
        ${tabellaRiscontro(gruppo)}
      </div>
    </div>`,
    aerata: i === blocchi.length - 1,
  }));
}

function chiusura(s: Snapshot, studio: string): Pagina {
  const esclusioni =
    s.esclusioni.length === 0
      ? `<p>Nessun adempimento è stato dichiarato non applicabile: il computo è effettuato
         sull'intero catalogo di competenza.</p>`
      : `<p class="occhiello">Gli adempimenti seguenti sono stati dichiarati non applicabili
         dall'ente, con la motivazione riportata. Sono esclusi dal computo della conformità.</p>
         <table class="tabella fitta">
           <thead><tr><th class="num-cella">Visto</th><th>Adempimento</th><th>Motivazione dichiarata</th></tr></thead>
           <tbody>${s.esclusioni
             .map(
               (e) =>
                 `<tr><td class="num-cella"><span class="casella"></span></td><td>${esc(e.titolo)}<span class="sotto mono">${esc(e.codice)}</span></td><td>${esc(e.motivazione)}</td></tr>`,
             )
             .join("")}</tbody>
         </table>`;

  return {
    corpo: `<div class="griglia">
      <div class="margine"><span class="num">3</span>Esclusioni</div>
      <div>
        <h2 class="sezione">Adempimenti dichiarati non applicabili</h2>
        ${esclusioni}
      </div>

      <div class="margine"><span class="num">4</span>Verbale</div>
      <div>
        <h2 class="sezione">Spazio per le annotazioni</h2>
        <p>Il presente fascicolo è generato dal sistema di gestione degli adempimenti in uso
        presso ${esc(studio)} e riflette i dati registrati alla data indicata. Ogni modifica
        successiva agli adempimenti non altera questo documento.</p>
        <div class="annotazioni"></div>
        <div class="firme">
          <div><span class="riga-firma"></span>Per l'ente</div>
          <div><span class="riga-firma"></span>L'incaricato della verifica</div>
        </div>
      </div>
    </div>`,
    aerata: true,
  };
}

// ============================================================================================

export function documentoFascicolo(
  s: Snapshot,
  chiave: ChiaveOrgano,
  opzioni: { studio: string },
): Documento {
  const organo = ORGANI[chiave];
  return {
    titolo: `Fascicolo ispettivo · ${organo.breve} · ${s.azienda.nome}`,
    testatina: { sinistra: `Fascicolo ispettivo · ${organo.breve}`, destra: s.azienda.nome },
    piede: { sinistra: `${opzioni.studio} · rilevazione del ${formattaIt(s.dataRiferimento)}` },
    pagine: [
      { corpo: copertina(s, organo, opzioni.studio), nuda: true, classe: "copertina" },
      { corpo: premessa(s, organo) },
      ...pagineElenco(s, organo),
      chiusura(s, opzioni.studio),
    ],
  };
}

export function htmlFascicolo(s: Snapshot, chiave: ChiaveOrgano, opzioni: { studio: string }): string {
  return componi(documentoFascicolo(s, chiave, opzioni));
}
