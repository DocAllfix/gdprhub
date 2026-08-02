import {
  ETICHETTE_DOMINIO,
  formattaIt,
  type Dominio,
  type StatoLavoro,
  type StatoScadenza,
} from "@gdpr/engine";

// Il momento firmato del prodotto: i due assi, leggibili senza legenda.
//
// LO STATO DEL LAVORO È UN'ETICHETTA. LO STATO DELLA SCADENZA È LA DATA STESSA.
//
// La scadenza non porta una pastiglia: porta la data, colorata, con i giorni residui
// accanto in cifre tabellari. Il colore vive sul dato reale, non su un'etichetta che lo
// descrive.
//
// Funziona senza legenda perché i due assi hanno FORMA diversa oltre che posizione diversa:
// una parola contro un numero. Impossibile confonderli, impossibile leggerne uno per l'altro.
// La riga «Completata · 23/06/2026 −52gg» dice a colpo d'occhio la cosa che nessun
// concorrente sa dire: l'atto è stato fatto, ed è scaduto da 52 giorni.

// --- Asse 1: il lavoro -------------------------------------------------------------------

const STILE_LAVORO: Readonly<Record<StatoLavoro, string>> = {
  // Neutre di proposito: il canale cromatico appartiene alla scadenza. Il lavoro si
  // distingue per peso e per bordo, non per colore.
  "Da fare": "border-border text-muted-foreground",
  "In corso": "border-border-strong text-foreground font-medium",
  Completata: "border-border bg-surface-sunken text-foreground",
  "Non applicabile": "border-dashed border-border text-faint-foreground",
};

export function StatoLavoroEtichetta({ stato }: { stato: StatoLavoro }) {
  return (
    <span
      className={`inline-flex items-center rounded-sm border px-1.5 py-0.5 text-xs whitespace-nowrap ${STILE_LAVORO[stato]}`}
    >
      {stato}
    </span>
  );
}

// --- Asse 2: la scadenza -----------------------------------------------------------------

const COLORE_SCADENZA: Readonly<Record<StatoScadenza, string>> = {
  Scaduta: "text-scaduta",
  "In scadenza": "text-imminente",
  Regolare: "text-regolare",
  "Da programmare": "text-programmare",
};

/** «−52gg» · «+170gg» · «oggi». Il segno porta informazione, quindi si mostra sempre. */
function residuo(giorni: number): string {
  if (giorni === 0) return "oggi";
  return giorni > 0 ? `+${giorni}gg` : `−${Math.abs(giorni)}gg`;
}

export function Scadenza({
  data,
  giorni,
  statoScadenza,
}: {
  data: string | null;
  giorni: number | null;
  statoScadenza: StatoScadenza;
}) {
  // Nessuna data da rispettare: presidio continuo, oppure mai programmato. Sono due cose
  // diverse e le distingue la colonna del lavoro, non questa.
  if (!data || giorni === null) {
    return (
      <span className="font-mono text-sm text-faint-foreground" title="Nessuna scadenza da rispettare">
        &mdash;
      </span>
    );
  }

  return (
    <span className={`inline-flex items-baseline gap-2 ${COLORE_SCADENZA[statoScadenza]}`}>
      <span className="font-mono text-sm tabular-nums">{formattaIt(data)}</span>
      <span className="text-xs tabular-nums opacity-80">{residuo(giorni)}</span>
      {/* Il colore non è mai l'unico canale: l'etichetta esiste per chi non lo distingue,
          per chi legge con uno screen reader, e per chi stampa in bianco e nero. */}
      <span className="sr-only">{statoScadenza}</span>
    </span>
  );
}

// --- Dominio: solo dove i tre convivono ---------------------------------------------------

const STILE_DOMINIO: Readonly<Record<Dominio, string>> = {
  gdpr: "bg-gdpr-surface text-gdpr",
  d231: "bg-d231-surface text-d231",
  d81: "bg-d81-surface text-d81",
};

/**
 * Pastiglia del decreto. Si usa SOLO dove i tre domini convivono: scadenzario unificato,
 * portafoglio, vista dei reati presupposto.
 *
 * Dentro il singolo modulo NON si usa: là il dominio è già dato dal contesto, e ripeterlo è
 * rumore che consuma attenzione.
 */
export function PastigliaDominio({ dominio }: { dominio: Dominio }) {
  return (
    <span
      className={`inline-flex items-center rounded-sm px-1.5 py-0.5 text-xs font-medium whitespace-nowrap ${STILE_DOMINIO[dominio]}`}
      title={ETICHETTE_DOMINIO[dominio].esteso}
    >
      {ETICHETTE_DOMINIO[dominio].breve}
    </span>
  );
}

/**
 * Codice dell'adempimento. In mono, perché è un identificatore e non testo.
 *
 * Quando l'adempimento è LETTO da un altro modulo, porta il codice del proprietario con la
 * tinta del dominio d'origine: il codice stesso dice da dove viene, senza un'icona da
 * interpretare, e il modulo lettore non lo può modificare.
 */
export function Codice({ codice, origine }: { codice: string; origine?: Dominio }) {
  if (!origine) return <span className="font-mono text-sm text-muted-foreground">{codice}</span>;
  return (
    <span
      className={`font-mono text-sm ${origine === "gdpr" ? "text-gdpr" : origine === "d231" ? "text-d231" : "text-d81"}`}
      title={`Presidiato nel modulo ${ETICHETTE_DOMINIO[origine].breve}: si aggiorna là`}
    >
      {codice}
      <span className="sr-only"> (letto dal modulo {ETICHETTE_DOMINIO[origine].breve})</span>
    </span>
  );
}

// --- Priorità -----------------------------------------------------------------------------

/**
 * La priorità non usa il canale cromatico degli stati: userebbe rosso per «Critica» e
 * competerebbe con «Scaduta». Si distingue per peso tipografico e per un punto di ampiezza
 * crescente, che resta leggibile anche in bianco e nero.
 */
export function Priorita({ priorita }: { priorita: "Critica" | "Alta" | "Media" | "Bassa" }) {
  const peso = { Critica: "font-semibold", Alta: "font-medium", Media: "", Bassa: "text-muted-foreground" }[
    priorita
  ];
  const punti = { Critica: 3, Alta: 2, Media: 1, Bassa: 0 }[priorita];
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs whitespace-nowrap ${peso}`}>
      <span aria-hidden className="inline-flex gap-0.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={`h-1 w-1 rounded-full ${i < punti ? "bg-foreground" : "bg-border-strong"}`}
          />
        ))}
      </span>
      {priorita}
    </span>
  );
}
