// TRE AFFINAMENTI SOPRA «PIANO».
//
// Piano è deciso: pannelli sollevati su fondo affondato, bordi trasparenti, angoli larghi,
// la separazione la fa lo spazio e non la linea. Restano tre nodi aperti dentro quella
// scelta, e sono tutti e tre lo stesso nodo visto da angoli diversi:
//
//   SE NON C'È LA LINEA, COSA TIENE INSIEME SESSANTAQUATTRO RIGHE?
//
// Piano paga la sua calma in righe visibili. È il difetto che ho dichiarato quando l'ho
// proposto, ed è l'unica cosa che vale la pena limare adesso: il resto della faccia è
// giusta. Tre risposte, e non sono tre gusti — sono tre compromessi diversi fra la calma e
// la densità, misurabili in righe che stanno nello schermo.
//
//   QUIETO   piano portato fino in fondo. Contrasto ancora più basso, ancora più aria,
//            nessuna linea da nessuna parte. Rinuncia alla densità e non finge il contrario.
//   STESO    la stessa faccia, ma le righe tornano. Al posto della linea, una fascia
//            alternata appena percettibile. Si recupera un terzo dello schermo.
//   INCISO   il pannello resta senza bordo, ma la linea rientra DENTRO le liste, e solo lì.
//            Struttura dove serve, e in nessun altro punto della pagina.
//
// Ognuno su entrambi i temi, con numeri propri.

export type Affinamento = {
  id: string;
  nome: string;
  frase: string;
  cosaCambia: string;
  costo: string;
  /** Numeri dichiarati: si sceglie anche su questi, non solo a occhio. */
  misure: { angolo: string; spaziatura: string; riga: string; righeIn900: string };
};

export const AFFINAMENTI: readonly Affinamento[] = [
  {
    id: "quieto",
    nome: "Quieto",
    frase: "Piano portato fino in fondo.",
    cosaCambia:
      "Il pannello si stacca dal fondo per pochissimo: due gradini di luminosità invece di quattro. Angoli larghissimi, spaziatura di ventiquattro punti, righe alte, nessuna linea in tutta la pagina. Le etichette scendono di un livello di grigio. È la versione più silenziosa possibile di ciò che hai scelto.",
    costo:
      "Rinuncia alla densità e non finge il contrario. Sulla tabella lunga si scorre parecchio, e chi lavora a scadenze scorre tutto il giorno.",
    misure: { angolo: "18px", spaziatura: "24px", riga: "13px", righeIn900: "≈14" },
  },
  {
    id: "steso",
    nome: "Steso",
    frase: "La stessa faccia, ma le righe tornano.",
    cosaCambia:
      "Al posto della linea, una fascia alternata appena percettibile: due punti di luminosità, quanto basta perché l'occhio segua la riga fino in fondo senza che compaia un reticolo. Spaziatura e angoli rientrano, righe strette. Si recupera circa un terzo dello schermo rispetto a piano.",
    costo:
      "La fascia alternata è un espediente vecchio e si vede che lo è. Se la si alza troppo diventa una tabella di venti anni fa.",
    misure: { angolo: "12px", spaziatura: "16px", riga: "7px", righeIn900: "≈21" },
  },
  {
    id: "inciso",
    nome: "Inciso",
    frase: "La linea rientra dentro le liste, e solo lì.",
    cosaCambia:
      "Il pannello resta senza bordo e continua a galleggiare, ma dentro le liste la linea torna, tenuta bassissima. E le barre degli strumenti dentro le schede diventano un pozzetto affondato invece di una fascia neutra. Struttura dove serve, in nessun altro punto della pagina.",
    costo:
      "È mezzo passo indietro verso il reticolo. Se un giorno si alzano quelle linee di un soffio, piano diventa filetto senza che nessuno l'abbia deciso.",
    misure: { angolo: "14px", spaziatura: "18px", riga: "9px", righeIn900: "≈19" },
  },
] as const;

export const CSS_PIANO = `
[data-piano] {
  font-family: var(--f-geist), ui-sans-serif, system-ui, sans-serif;
  --font-sans: var(--f-geist);
  --font-mono: var(--f-geist-mono);
  --font-serif: var(--f-geist-mono);
}
[data-piano] .cifra,
[data-piano] .titolo {
  font-family: var(--f-geist-mono), ui-monospace, monospace;
  font-weight: 500;
  letter-spacing: -0.045em;
}
/* Il fondo di piano: bordi trasparenti, etichette in tondo. Non cambia nei tre. */
[data-piano] [data-pezzo="scheda"] { border-color: transparent; }
[data-piano] h3 {
  text-transform: none;
  letter-spacing: 0;
  font-size: 0.75rem;
  font-weight: 500;
  font-family: var(--f-geist), ui-sans-serif, system-ui, sans-serif;
}

/* ----------------------------------------------------------------- QUIETO -- */
[data-piano="quieto"] {
  --radius-sm: 0.5rem;
  --radius: 0.625rem;
  --radius-lg: 0.875rem;
  --radius-xl: 1.125rem;
}
[data-piano="quieto"] [data-pezzo="scheda"].p-4 { padding: 1.5rem; }
[data-piano="quieto"] [data-pezzo="incasso"] { padding: 0.625rem 0.875rem; }
[data-piano="quieto"] .divide-y > li,
[data-piano="quieto"] .divide-y > tr > td { padding-top: 0.8125rem; padding-bottom: 0.8125rem; }
[data-piano="quieto"] .divide-border-subtle > * { border-color: transparent; }
[data-piano="quieto"] [data-pezzo="scheda"] > .border-b:first-child { border-bottom-color: transparent; }
[data-piano="quieto"] h3 { color: var(--faint-foreground); }
:root[data-theme="dark"] [data-piano="quieto"] {
  --background: oklch(0.152 0.015 288);
  --surface: oklch(0.192 0.017 288);
  --surface-sunken: oklch(0.172 0.016 288);
  --surface-raised: oklch(0.226 0.018 288);
  --border: oklch(0.235 0.014 288);
  --border-strong: oklch(0.3 0.015 288);
  --border-subtle: oklch(0.212 0.013 288);
  /* La colonna quasi non si stacca dal fondo: coerente con tutto il resto dello schema. */
  --sidebar: oklch(0.132 0.014 288);
  --sidebar-border: oklch(0.205 0.012 288);
  --sidebar-selected: oklch(0.218 0.02 292);
  --sidebar-muted: oklch(0.615 0.011 288);
}
:root[data-theme="light"] [data-piano="quieto"] {
  --background: oklch(0.955 0.004 262);
  --surface: oklch(0.992 0.0015 262);
  --surface-sunken: oklch(0.966 0.004 262);
  --surface-raised: oklch(0.978 0.003 262);
  --border: oklch(0.93 0.004 262);
  --border-strong: oklch(0.875 0.005 262);
  --border-subtle: oklch(0.948 0.003 262);
  /* Sulla carta la colonna resta inchiostro — è la decisione che fa la faccia del
     prodotto — ma qui è l'inchiostro più tenue dei tre. */
  --sidebar: oklch(0.278 0.017 262);
  --sidebar-border: oklch(0.36 0.014 262);
  --sidebar-selected: oklch(0.35 0.024 262);
  --sidebar-muted: oklch(0.7 0.011 262);
}

/* ------------------------------------------------------------------ STESO -- */
[data-piano="steso"] {
  --radius-sm: 0.3125rem;
  --radius: 0.4375rem;
  --radius-lg: 0.5625rem;
  --radius-xl: 0.75rem;
}
[data-piano="steso"] [data-pezzo="scheda"].p-4 { padding: 1rem; }
[data-piano="steso"] .divide-y > li,
[data-piano="steso"] .divide-y > tr > td { padding-top: 0.4375rem; padding-bottom: 0.4375rem; }
[data-piano="steso"] .divide-border-subtle > * { border-color: transparent; }
/* LA FASCIA ALTERNATA al posto della linea: due punti di luminosità, quanto basta
   perché l'occhio segua la riga fino in fondo senza che compaia un reticolo. */
[data-piano="steso"] .divide-y > li:nth-child(even),
[data-piano="steso"] .divide-y > tr:nth-child(even) { background: var(--zebra); }
:root[data-theme="dark"] [data-piano="steso"] {
  --background: oklch(0.138 0.014 288);
  --surface: oklch(0.212 0.018 288);
  --surface-sunken: oklch(0.168 0.016 288);
  --surface-raised: oklch(0.258 0.019 288);
  --border: oklch(0.25 0.015 288);
  --border-strong: oklch(0.33 0.016 288);
  --border-subtle: oklch(0.233 0.014 288);
  --zebra: oklch(0.232 0.018 288);
  --sidebar: oklch(0.112 0.013 288);
  --sidebar-border: oklch(0.226 0.012 288);
  --sidebar-selected: oklch(0.236 0.022 292);
  --sidebar-muted: oklch(0.63 0.012 288);
}
:root[data-theme="light"] [data-piano="steso"] {
  --background: oklch(0.94 0.005 262);
  --surface: oklch(0.998 0.001 262);
  --surface-sunken: oklch(0.956 0.004 262);
  --surface-raised: oklch(0.972 0.003 262);
  --border: oklch(0.918 0.004 262);
  --border-strong: oklch(0.855 0.006 262);
  --border-subtle: oklch(0.938 0.003 262);
  --zebra: oklch(0.978 0.003 262);
  --sidebar: oklch(0.225 0.019 262);
  --sidebar-border: oklch(0.31 0.016 262);
  --sidebar-selected: oklch(0.3 0.026 262);
  --sidebar-muted: oklch(0.66 0.012 262);
}
:root[data-theme="light"] [data-piano="steso"] [data-pezzo="scheda"] {
  box-shadow: 0 1px 2px oklch(0.24 0.018 262 / 0.06);
}

/* ----------------------------------------------------------------- INCISO -- */
[data-piano="inciso"] {
  --radius-sm: 0.375rem;
  --radius: 0.5rem;
  --radius-lg: 0.6875rem;
  --radius-xl: 0.875rem;
}
[data-piano="inciso"] [data-pezzo="scheda"].p-4 { padding: 1.125rem; }
[data-piano="inciso"] .divide-y > li,
[data-piano="inciso"] .divide-y > tr > td { padding-top: 0.5625rem; padding-bottom: 0.5625rem; }
/* La linea rientra, ma tenuta bassissima e SOLO dentro le liste. */
[data-piano="inciso"] .divide-border-subtle > * { border-color: var(--filo); }
/* Le barre degli strumenti dentro le schede diventano un pozzetto affondato. */
[data-piano="inciso"] [data-pezzo="scheda"] > .border-b:first-child {
  background: var(--surface-sunken);
  border-bottom-color: transparent;
}
:root[data-theme="dark"] [data-piano="inciso"] {
  --background: oklch(0.136 0.014 288);
  --surface: oklch(0.218 0.018 288);
  --surface-sunken: oklch(0.184 0.017 288);
  --surface-raised: oklch(0.262 0.019 288);
  --border: oklch(0.256 0.015 288);
  --border-strong: oklch(0.335 0.016 288);
  --border-subtle: oklch(0.24 0.014 288);
  --filo: oklch(0.262 0.015 288);
  /* La colonna più profonda dei tre: lo schema ha già più struttura, e la barra la porta. */
  --sidebar: oklch(0.102 0.013 288);
  --sidebar-border: oklch(0.238 0.012 288);
  --sidebar-selected: oklch(0.248 0.023 292);
  --sidebar-muted: oklch(0.645 0.012 288);
}
:root[data-theme="light"] [data-piano="inciso"] {
  --background: oklch(0.938 0.005 262);
  --surface: oklch(0.999 0.001 262);
  --surface-sunken: oklch(0.958 0.004 262);
  --surface-raised: oklch(0.974 0.003 262);
  --border: oklch(0.915 0.004 262);
  --border-strong: oklch(0.85 0.006 262);
  --border-subtle: oklch(0.936 0.003 262);
  --filo: oklch(0.945 0.003 262);
  --sidebar: oklch(0.192 0.02 262);
  --sidebar-border: oklch(0.285 0.017 262);
  --sidebar-selected: oklch(0.275 0.028 262);
  --sidebar-muted: oklch(0.645 0.013 262);
}
:root[data-theme="light"] [data-piano="inciso"] [data-pezzo="scheda"] {
  box-shadow: 0 1px 2px oklch(0.24 0.018 262 / 0.05), 0 3px 10px oklch(0.24 0.018 262 / 0.05);
}
`;
