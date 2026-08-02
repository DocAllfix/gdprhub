// ALTRI TRE COLORI, E LA MAPPA DI DOVE SI POTEVA ANDARE.
//
// Le prime tre non convincono. Prima di proporne altre tre a caso, conviene guardare quanto
// spazio resta davvero, perché è meno di quanto sembra.
//
// SEI TINTE SONO OCCUPATE e non si toccano: rosso 26 «scaduta», ambra 67 «in scadenza»,
// verde 153 «regolare», indaco 273 «GDPR», prugna 342 «231», acciaio 228 «81/08». Il cerchio
// delle tinte è lungo 360, e quei sei lo tagliano in sei spicchi. Dentro ogni spicchio si
// può stare solo al centro, perché ai bordi la colonna comincia a somigliare a un segnale.
//
//   26 → 67     centro 46, arancio bruciato. Troppo vicino all'ambra, ed è la zona dove
//               stava già «terra» a 78, che non ha convinto.
//   67 → 153    centro 110, OLIVA. Quarantatré gradi da entrambi: è lo spicchio più largo
//               di tutti. Libero.
//   153 → 228   centro 190, ottanio. È l'accento di `sistemacommercialisti`, che è dello
//               stesso studio. Bruciato in partenza.
//   228 → 273   centro 250, blu-navy. È esattamente il colore appena scartato.
//   273 → 342   centro 307, MELANZANA. Trentaquattro gradi da entrambi. Libero, ed è la
//               scelta più vicina a un vicino: la prugna del 231 sta a 342.
//   342 → 26    centro 4, bordeaux. Ventidue gradi dal rosso «scaduta» per parte: è lo
//               spicchio più stretto. Un bordeaux e un rosso di stato nella stessa tabella
//               sono un rischio che non vale la pena correre.
//
// E poi c'è la risposta che non usa il cerchio: NESSUNA TINTA. Un carbone quasi acromatico
// non può competere con i sei perché non è un colore, e quello spazio è sempre libero.
//
// LA FORMA RESTA FERMA. Tutte e tre hanno gli angoli, la spaziatura e le righe di «quieto»:
// l'unica variabile è il colore, così il confronto è pulito e non si finisce a scegliere una
// tinta perché aveva gli angoli più belli.

export type Tinta = {
  id: string;
  nome: string;
  hue: string;
  frase: string;
  perche: string;
  costo: string;
  campioni: readonly { readonly e: string; readonly v: string; readonly scuro?: boolean }[];
};

export const TINTE: readonly Tinta[] = [
  {
    id: "grafite",
    nome: "Grafite",
    hue: "nessuna · croma 0,006",
    frase: "La risposta che non usa il cerchio delle tinte.",
    perche:
      "Un carbone quasi acromatico non può competere con i sei colori impegnati, perché non è un colore. È l'unica proposta che non ha bisogno di essere difesa da nessuna vicinanza, e l'unica che non invecchia: nessuno guarda un grigio nel 2031 e pensa «ah, il duemilaventisei». La regola di casa dice che un neutro puro non si usa mai, quindi la croma resta a 0,006 invece che a zero — una traccia, non una tinta.",
    costo:
      "Non ha personalità e non prova ad averla. Se il prodotto deve essere riconoscibile a colpo d'occhio, questa non lo rende riconoscibile: lo rende corretto.",
    campioni: [
      { e: "barra", v: "oklch(0.228 0.006 300)", scuro: true },
      { e: "pulsante", v: "oklch(0.235 0.006 300)", scuro: true },
      { e: "fondo", v: "oklch(0.958 0.002 300)" },
      { e: "pannello", v: "oklch(0.994 0.001 300)" },
    ],
  },
  {
    id: "oliva",
    nome: "Oliva",
    hue: "hue 110 · lo spicchio più largo",
    frase: "Quarantatré gradi da tutto.",
    perche:
      "Fra l'ambra e il verde c'è il vuoto più grande di tutto il cerchio, e al suo centro c'è un verde-oliva scurissimo. Non è il verde della conformità — quello sta a 153 e ha quattro volte la croma — è muschio, taccuino da campo, tela di rilegatura. Nel software di compliance italiano non lo usa nessuno, e regge bene la carta avorio che si porta dietro.",
    costo:
      "Il verde in questo prodotto ha già un significato, ed è «regolare». Le due tinte non si confondono a guardarle, ma va accettato che ci sia un secondo verde in pagina: se un domani si alza la croma della colonna anche di poco, comincia a dire qualcosa che non deve dire.",
    campioni: [
      { e: "barra", v: "oklch(0.272 0.03 112)", scuro: true },
      { e: "pulsante", v: "oklch(0.272 0.03 112)", scuro: true },
      { e: "fondo", v: "oklch(0.96 0.005 110)" },
      { e: "pannello", v: "oklch(0.996 0.002 110)" },
    ],
  },
  {
    id: "melanzana",
    nome: "Melanzana",
    hue: "hue 307 · fra indaco e prugna",
    frase: "La più ricca, e la più vicina a un vicino.",
    perche:
      "Fra l'indaco del GDPR e la prugna del 231 c'è uno spicchio libero, e al centro sta una melanzana profonda. È la più calda delle scure e la più insolita in un gestionale: legge come pelle e come vino, non come tecnologia. Con la carta appena rosata che si porta dietro è la più lontana dal bianco-azzurro d'ufficio.",
    costo:
      "È la scelta più vicina a un colore riservato: la prugna del 231 sta a 342, trentacinque gradi più in là. A schermo si distinguono senza sforzo — la colonna ha un terzo della croma — ma è l'unica delle tre da guardare con una pastiglia 231 accanto prima di dire sì.",
    campioni: [
      { e: "barra", v: "oklch(0.252 0.04 307)", scuro: true },
      { e: "pulsante", v: "oklch(0.252 0.04 307)", scuro: true },
      { e: "fondo", v: "oklch(0.958 0.005 307)" },
      { e: "pannello", v: "oklch(0.995 0.002 307)" },
    ],
  },
] as const;

export const CSS_TINTE = `
[data-tinta] {
  font-family: var(--f-geist), ui-sans-serif, system-ui, sans-serif;
  --font-sans: var(--f-geist);
  --font-mono: var(--f-geist-mono);
  --font-serif: var(--f-geist-mono);
  /* La forma di «quieto», identica per tutte e tre: l'unica variabile è il colore. */
  --radius-sm: 0.5rem;
  --radius: 0.625rem;
  --radius-lg: 0.875rem;
  --radius-xl: 1.125rem;
}
[data-tinta] .cifra,
[data-tinta] .titolo {
  font-family: var(--f-geist-mono), ui-monospace, monospace;
  font-weight: 500;
  letter-spacing: -0.045em;
}
[data-tinta] [data-pezzo="scheda"] { border-color: transparent; }
[data-tinta] [data-pezzo="scheda"].p-4 { padding: 1.5rem; }
[data-tinta] [data-pezzo="incasso"] { padding: 0.625rem 0.875rem; }
[data-tinta] .divide-y > li,
[data-tinta] .divide-y > tr > td { padding-top: 0.8125rem; padding-bottom: 0.8125rem; }
[data-tinta] .divide-border-subtle > * { border-color: transparent; }
[data-tinta] [data-pezzo="scheda"] > .border-b:first-child { border-bottom-color: transparent; }
[data-tinta] h3 {
  text-transform: none;
  letter-spacing: 0;
  font-size: 0.75rem;
  font-weight: 500;
  font-family: var(--f-geist), ui-sans-serif, system-ui, sans-serif;
  color: var(--faint-foreground);
}

/* ---------------------------------------------------------------- GRAFITE -- */
:root[data-theme="dark"] [data-tinta="grafite"] {
  --background: oklch(0.15 0.003 300);
  --surface: oklch(0.198 0.004 300);
  --surface-sunken: oklch(0.174 0.003 300);
  --surface-raised: oklch(0.234 0.005 300);
  --border: oklch(0.24 0.004 300);
  --border-strong: oklch(0.305 0.005 300);
  --border-subtle: oklch(0.217 0.004 300);
  --foreground: oklch(0.958 0.002 300);
  --muted-foreground: oklch(0.755 0.004 300);
  --faint-foreground: oklch(0.6 0.004 300);
  --primary: oklch(0.955 0.002 300);
  --primary-foreground: oklch(0.15 0.003 300);
  --sidebar: oklch(0.122 0.004 300);
  --sidebar-foreground: oklch(0.955 0.002 300);
  --sidebar-border: oklch(0.202 0.004 300);
  --sidebar-selected: oklch(0.222 0.006 300);
  --sidebar-muted: oklch(0.62 0.004 300);
}
:root[data-theme="light"] [data-tinta="grafite"] {
  --background: oklch(0.958 0.002 300);
  --surface: oklch(0.994 0.001 300);
  --surface-sunken: oklch(0.968 0.002 300);
  --surface-raised: oklch(0.98 0.0015 300);
  --border: oklch(0.928 0.002 300);
  --border-strong: oklch(0.87 0.003 300);
  --border-subtle: oklch(0.947 0.0015 300);
  --foreground: oklch(0.235 0.005 300);
  --muted-foreground: oklch(0.5 0.004 300);
  --faint-foreground: oklch(0.62 0.003 300);
  --primary: oklch(0.235 0.006 300);
  --primary-hover: oklch(0.185 0.006 300);
  --primary-foreground: oklch(0.985 0.001 300);
  --sidebar: oklch(0.228 0.006 300);
  --sidebar-foreground: oklch(0.94 0.002 300);
  --sidebar-border: oklch(0.318 0.005 300);
  --sidebar-selected: oklch(0.308 0.008 300);
  --sidebar-muted: oklch(0.675 0.004 300);
}

/* ------------------------------------------------------------------ OLIVA -- */
:root[data-theme="dark"] [data-tinta="oliva"] {
  --background: oklch(0.152 0.009 110);
  --surface: oklch(0.2 0.01 110);
  --surface-sunken: oklch(0.176 0.009 110);
  --surface-raised: oklch(0.236 0.011 110);
  --border: oklch(0.243 0.009 110);
  --border-strong: oklch(0.31 0.011 110);
  --border-subtle: oklch(0.22 0.008 110);
  --foreground: oklch(0.958 0.004 110);
  --muted-foreground: oklch(0.757 0.008 110);
  --faint-foreground: oklch(0.605 0.008 110);
  --primary: oklch(0.955 0.005 110);
  --primary-foreground: oklch(0.152 0.009 110);
  --sidebar: oklch(0.132 0.016 112);
  --sidebar-foreground: oklch(0.952 0.006 110);
  --sidebar-border: oklch(0.216 0.014 112);
  --sidebar-selected: oklch(0.235 0.024 112);
  --sidebar-muted: oklch(0.64 0.012 110);
}
:root[data-theme="light"] [data-tinta="oliva"] {
  --background: oklch(0.96 0.005 110);
  --surface: oklch(0.996 0.002 110);
  --surface-sunken: oklch(0.966 0.005 110);
  --surface-raised: oklch(0.98 0.004 110);
  --border: oklch(0.918 0.006 110);
  --border-strong: oklch(0.858 0.008 110);
  --border-subtle: oklch(0.94 0.005 110);
  --foreground: oklch(0.243 0.013 110);
  --muted-foreground: oklch(0.503 0.01 110);
  --faint-foreground: oklch(0.623 0.008 110);
  --primary: oklch(0.272 0.03 112);
  --primary-hover: oklch(0.218 0.032 112);
  --primary-foreground: oklch(0.985 0.004 110);
  --sidebar: oklch(0.272 0.03 112);
  --sidebar-foreground: oklch(0.945 0.006 110);
  --sidebar-border: oklch(0.355 0.024 112);
  --sidebar-selected: oklch(0.348 0.036 112);
  --sidebar-muted: oklch(0.7 0.014 110);
}

/* ------------------------------------------------------------- MELANZANA -- */
:root[data-theme="dark"] [data-tinta="melanzana"] {
  --background: oklch(0.15 0.01 307);
  --surface: oklch(0.198 0.012 307);
  --surface-sunken: oklch(0.174 0.01 307);
  --surface-raised: oklch(0.234 0.013 307);
  --border: oklch(0.241 0.011 307);
  --border-strong: oklch(0.307 0.013 307);
  --border-subtle: oklch(0.218 0.01 307);
  --foreground: oklch(0.958 0.004 307);
  --muted-foreground: oklch(0.755 0.008 307);
  --faint-foreground: oklch(0.602 0.009 307);
  --primary: oklch(0.955 0.005 307);
  --primary-foreground: oklch(0.15 0.01 307);
  --sidebar: oklch(0.128 0.02 307);
  --sidebar-foreground: oklch(0.953 0.006 307);
  --sidebar-border: oklch(0.212 0.018 307);
  --sidebar-selected: oklch(0.232 0.03 307);
  --sidebar-muted: oklch(0.635 0.013 307);
}
:root[data-theme="light"] [data-tinta="melanzana"] {
  --background: oklch(0.958 0.005 307);
  --surface: oklch(0.995 0.002 307);
  --surface-sunken: oklch(0.967 0.005 307);
  --surface-raised: oklch(0.98 0.004 307);
  --border: oklch(0.926 0.006 307);
  --border-strong: oklch(0.866 0.008 307);
  --border-subtle: oklch(0.945 0.005 307);
  --foreground: oklch(0.24 0.015 307);
  --muted-foreground: oklch(0.502 0.01 307);
  --faint-foreground: oklch(0.622 0.008 307);
  --primary: oklch(0.252 0.04 307);
  --primary-hover: oklch(0.2 0.042 307);
  --primary-foreground: oklch(0.985 0.003 307);
  --sidebar: oklch(0.252 0.04 307);
  --sidebar-foreground: oklch(0.945 0.007 307);
  --sidebar-border: oklch(0.34 0.03 307);
  --sidebar-selected: oklch(0.335 0.045 307);
  --sidebar-muted: oklch(0.695 0.016 307);
}
`;
