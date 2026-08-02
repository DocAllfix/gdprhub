// TRE SCHEMI DI DESIGN SOPRA GEIST.
//
// Il carattere è deciso: Geist per il testo, Geist Mono per codici e cifre. Con la
// tipografia ferma resta da decidere la cosa più grossa, che è COME SI STACCA UN PANNELLO
// DAL FONDO. Ci sono tre risposte, e non sono sfumature dello stesso gusto: sono tre
// strumenti diversi che si comportano diversamente in una tabella da sessantaquattro righe.
//
//   FILETTO   il pannello non è una superficie: è una linea. Fondo unico, riquadri
//             disegnati dal solo filetto. Densità massima, zero arredamento.
//   PIANO     il filetto sparisce e lavora la superficie: pannelli sollevati su fondo
//             affondato, angoli larghi, aria. La separazione la fa lo spazio.
//   FASCIA    ogni scheda ha la sua fascia di testata piena. La pagina si legge come una
//             pila di fascicoli, ed è lo schema con più struttura visibile.
//
// Ognuno è definito su ENTRAMBI i temi, con numeri diversi: il chiaro non è lo scuro
// invertito. Nel «piano» chiaro la fascia di testata è più scura del corpo e nello scuro è
// più chiara, perché in tutti e due i casi deve leggersi come «non è il corpo».

export type Schema = {
  id: string;
  nome: string;
  frase: string;
  perche: string;
  contro: string;
};

export const SCHEMI: readonly Schema[] = [
  {
    id: "filetto",
    nome: "Filetto",
    frase: "Il pannello è una linea, non una superficie.",
    perche:
      "Un solo fondo per tutta la pagina e riquadri disegnati dal filetto. Angoli quasi vivi, righe strette, etichette in maiuscoletto spaziato. È lo schema che regge la densità meglio di tutti: nessun pixel se ne va in arredamento, e a 1440 per 900 ci stanno più righe che negli altri due.",
    contro:
      "Chiede al filetto di fare tutto. Se lo schermo è scadente o la luce è forte, i riquadri si appiattiscono e la pagina diventa un foglio unico.",
  },
  {
    id: "piano",
    nome: "Piano",
    frase: "Il filetto sparisce, lavora la superficie.",
    perche:
      "Pannelli sollevati su un fondo affondato, bordi trasparenti, angoli larghi, righe alte. La separazione la fa lo spazio e non la linea. È lo schema più calmo dei tre e quello che sopporta meglio una sessione lunga: niente reticolo davanti agli occhi per otto ore.",
    contro:
      "L'aria costa righe. Nella tabella da sessantaquattro voci se ne vedono un terzo in meno, e chi lavora a scadenze scorre di più.",
  },
  {
    id: "fascia",
    nome: "Fascia",
    frase: "Ogni scheda porta la sua testata piena.",
    perche:
      "La testata di ogni scheda diventa una fascia piena con dentro l'etichetta, e il corpo sta sotto. La pagina si legge come una pila di fascicoli, che è esattamente ciò che il consulente consegna. È lo schema con più struttura visibile e quello che si ricorda dopo averlo chiuso.",
    contro:
      "Struttura vuol dire ripetizione. Con venti schede in una pagina le fasce diventano un ritmo insistente, e vanno tenute basse o soffocano il dato.",
  },
] as const;

// Le regole. Stanno fuori dai layer di Tailwind, quindi vincono sulle utility senza che si
// debba alzare la specificità a mano. Gli appigli sono due attributi scritti nei pezzi
// (`data-pezzo`), non nomi di utility: quelli cambiano a ogni ritocco, gli attributi no.
export const CSS_SCHEMI = `
[data-schema] {
  font-family: var(--f-geist), ui-sans-serif, system-ui, sans-serif;
  --font-sans: var(--f-geist);
  --font-mono: var(--f-geist-mono);
  --font-serif: var(--f-geist-mono);
}
[data-schema] .cifra,
[data-schema] .titolo {
  font-family: var(--f-geist-mono), ui-monospace, monospace;
  font-weight: 500;
  letter-spacing: -0.045em;
}

/* ---------------------------------------------------------------- FILETTO -- */
[data-schema="filetto"] {
  --radius-sm: 0.125rem;
  --radius: 0.1875rem;
  --radius-lg: 0.1875rem;
  --radius-xl: 0.25rem;
}
[data-schema="filetto"] [data-pezzo="scheda"] {
  background: var(--background);
  border-color: var(--border-strong);
}
[data-schema="filetto"] [data-pezzo="scheda"][data-rilievo] {
  background: var(--surface);
}
[data-schema="filetto"] [data-pezzo="scheda"].p-4 { padding: 0.75rem; }
[data-schema="filetto"] [data-pezzo="incasso"] {
  background: transparent;
  border: 1px solid var(--border);
}
[data-schema="filetto"] .divide-y > li,
[data-schema="filetto"] .divide-y > tr > td { padding-top: 0.3125rem; padding-bottom: 0.3125rem; }
[data-schema="filetto"] .divide-border-subtle > * { border-color: var(--border); }
[data-schema="filetto"] h3 {
  text-transform: uppercase;
  letter-spacing: 0.14em;
  font-size: 0.625rem;
  font-weight: 600;
}
:root[data-theme="dark"] [data-schema="filetto"] {
  --background: oklch(0.155 0.016 288);
  --surface: oklch(0.196 0.017 288);
  --surface-sunken: oklch(0.188 0.016 288);
  --surface-raised: oklch(0.215 0.017 288);
  --border: oklch(0.29 0.014 288);
  --border-strong: oklch(0.395 0.018 288);
  --border-subtle: oklch(0.25 0.013 288);
}
:root[data-theme="light"] [data-schema="filetto"] {
  --background: oklch(0.988 0.002 262);
  --surface: oklch(0.963 0.004 262);
  --surface-sunken: oklch(0.955 0.004 262);
  --surface-raised: oklch(0.945 0.005 262);
  --border: oklch(0.885 0.005 262);
  --border-strong: oklch(0.775 0.008 262);
  --border-subtle: oklch(0.915 0.004 262);
}

/* ------------------------------------------------------------------ PIANO -- */
[data-schema="piano"] {
  --radius-sm: 0.375rem;
  --radius: 0.5rem;
  --radius-lg: 0.625rem;
  --radius-xl: 0.875rem;
}
[data-schema="piano"] [data-pezzo="scheda"] { border-color: transparent; }
[data-schema="piano"] [data-pezzo="scheda"].p-4 { padding: 1.25rem; }
[data-schema="piano"] .divide-y > li,
[data-schema="piano"] .divide-y > tr > td { padding-top: 0.6875rem; padding-bottom: 0.6875rem; }
[data-schema="piano"] .divide-border-subtle > * { border-color: transparent; }
[data-schema="piano"] h3 {
  text-transform: none;
  letter-spacing: 0;
  font-size: 0.75rem;
  font-weight: 500;
  font-family: var(--f-geist), ui-sans-serif, system-ui, sans-serif;
}
:root[data-theme="dark"] [data-schema="piano"] {
  --background: oklch(0.138 0.014 288);
  --surface: oklch(0.214 0.018 288);
  --surface-sunken: oklch(0.168 0.016 288);
  --surface-raised: oklch(0.256 0.019 288);
  --border: oklch(0.252 0.015 288);
  --border-strong: oklch(0.33 0.016 288);
  --border-subtle: oklch(0.235 0.014 288);
}
:root[data-theme="light"] [data-schema="piano"] {
  --background: oklch(0.942 0.005 262);
  --surface: oklch(0.998 0.001 262);
  --surface-sunken: oklch(0.958 0.004 262);
  --surface-raised: oklch(0.973 0.003 262);
  --border: oklch(0.92 0.004 262);
  --border-strong: oklch(0.86 0.006 262);
  --border-subtle: oklch(0.94 0.003 262);
}
/* Le ombre vivono solo nel chiaro: sul buio non c'è luce da bloccare, e usarle lo
   stesso produce l'alone sporco del tema chiaro riverniciato. */
:root[data-theme="light"] [data-schema="piano"] [data-pezzo="scheda"] {
  box-shadow: 0 1px 2px oklch(0.24 0.018 262 / 0.05), 0 2px 8px oklch(0.24 0.018 262 / 0.05);
}

/* ----------------------------------------------------------------- FASCIA -- */
[data-schema="fascia"] {
  --radius-sm: 0.25rem;
  --radius: 0.3125rem;
  --radius-lg: 0.4375rem;
  --radius-xl: 0.5rem;
}
[data-schema="fascia"] [data-pezzo="scheda"] { overflow: hidden; }
/* La testata delle schede che gestiscono la propria spaziatura. */
[data-schema="fascia"] [data-pezzo="scheda"] > .border-b:first-child {
  background: var(--fascia);
  border-bottom-color: var(--border-strong);
}
/* La testata delle schede con padding proprio: la fascia esce fino al bordo. */
[data-schema="fascia"] [data-pezzo="scheda"].p-4 > .mb-3:first-child {
  margin: -1rem -1rem 0.875rem;
  padding: 0.4375rem 1rem 0.5rem;
  background: var(--fascia);
  border-bottom: 1px solid var(--border-strong);
}
[data-schema="fascia"] h3 {
  text-transform: uppercase;
  letter-spacing: 0.11em;
  font-size: 0.625rem;
  font-weight: 600;
  color: var(--foreground);
}
:root[data-theme="dark"] [data-schema="fascia"] {
  --background: oklch(0.148 0.015 288);
  --surface: oklch(0.202 0.017 288);
  --surface-sunken: oklch(0.172 0.016 288);
  --surface-raised: oklch(0.242 0.018 288);
  --border: oklch(0.278 0.014 288);
  --border-strong: oklch(0.345 0.016 288);
  --border-subtle: oklch(0.238 0.013 288);
  /* Nello scuro la fascia è PIÙ CHIARA del corpo: legge come una linguetta. */
  --fascia: oklch(0.252 0.019 288);
}
:root[data-theme="light"] [data-schema="fascia"] {
  --background: oklch(0.955 0.005 262);
  --surface: oklch(0.995 0.0015 262);
  --surface-sunken: oklch(0.948 0.005 262);
  --surface-raised: oklch(0.975 0.003 262);
  --border: oklch(0.9 0.005 262);
  --border-strong: oklch(0.83 0.007 262);
  --border-subtle: oklch(0.932 0.004 262);
  /* Nel chiaro è PIÙ SCURA: sulla carta la linguetta è grigia. Direzione opposta,
     stessa lettura — «questa non è il corpo». */
  --fascia: oklch(0.938 0.006 262);
}
`;
