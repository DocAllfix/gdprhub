// TRE QUIETO, E TRE RISPOSTE A UN COLORE.
//
// Il colore contestato è l'INCHIOSTRO: `oklch(0.245 0.021 262)`. Hue 262 è blu-navy, e sta
// in due posti — la colonna laterale sul tema chiaro, e ogni pulsante pieno («Salva»,
// «Aprilo», «Nuova azienda», «Accedi»). Cambiarlo nella barra e lasciarlo nei pulsanti
// darebbe una pagina con due inchiostri diversi, quindi qui si cambia in tutti e due.
//
// PERCHÉ ERA 262, e perché il committente ha ragione a non sopportarlo. Il navy scuro è il
// riflesso numero uno del software gestionale: lo hanno Linear, Vercel, mezzo settore, e
// soprattutto lo ha `sistemacommercialisti`, che è dello stesso studio e sta a hue 250. Due
// strumenti dello stesso committente non devono sembrare lo stesso strumento, e questo è
// esattamente il difetto che il navy produce.
//
// IL VINCOLO, che non si tocca. Sei colori sono già impegnati e significano qualcosa:
// rosso, ambra e verde dicono lo stato della scadenza, indaco, prugna e acciaio dicono il
// decreto. Un settimo colore che compete con quei sei rompe il sistema: in una tabella dove
// il rosso deve dire «scaduta» non ci si può permettere un rosso che dice «premi qui».
// Quindi la sostituzione deve stare fuori da quelle sei tinte, oppure non essere una tinta.
//
// Tre risposte, e sono tre risposte diverse alla stessa domanda, non tre sfumature:
//
//   NOTTE   il colore della barra diventa quello che il prodotto GIÀ È: grafite-viola, hue
//           288, la tinta in cui vive tutto il tema scuro. Non si aggiunge un colore, si
//           smette di averne due. I due temi diventano una famiglia sola.
//   CARTA   la barra scura sparisce. Niente lastra: la colonna è carta come il resto, e si
//           stacca per un filetto e per la voce attiva. Il modo più diretto di risolvere un
//           colore brutto è non averlo.
//   TERRA   una terra al posto di un blu: pietra calda, hue 78, croma bassissima. Legge come
//           cuoio e archivio invece che come tecnologia, e non confina con nessuno dei sei.
//
// Ognuna sposta TUTTA la famiglia dei neutri, non solo la barra: se si cambia la tinta della
// colonna e si lasciano i grigi a 262, la colonna sembra incollata sopra una pagina di
// qualcun altro.

export type VarianteQuieto = {
  id: string;
  nome: string;
  frase: string;
  colore: string;
  cosaCambia: string;
  costo: string;
  campioni: readonly { readonly e: string; readonly v: string; readonly scuro?: boolean }[];
};

export const VARIANTI: readonly VarianteQuieto[] = [
  {
    id: "notte",
    nome: "Quieto · Notte",
    frase: "La barra prende la tinta che il prodotto già è.",
    colore: "Grafite-viola, hue 288",
    cosaCambia:
      "Nessun colore nuovo: hue 288 è la tinta in cui vive già tutto il tema scuro, e qui sale anche sul chiaro. La colonna diventa grafite-viola profondo, i pulsanti pieni la seguono, i grigi della pagina si allineano alla stessa tinta. I due temi smettono di essere due prodotti e diventano uno. Con la colonna che non urla più, il contenuto può permettersi mezzo gradino di stacco in più.",
    costo:
      "Resta una colonna scura, e la colonna scura accanto al foglio chiaro è un gesto che si vede in giro. Cambia la tinta, non la mossa.",
    campioni: [
      { e: "barra", v: "oklch(0.235 0.026 288)", scuro: true },
      { e: "pulsante", v: "oklch(0.235 0.026 288)", scuro: true },
      { e: "fondo", v: "oklch(0.958 0.004 288)" },
      { e: "pannello", v: "oklch(0.993 0.0015 288)" },
    ],
  },
  {
    id: "carta",
    nome: "Quieto · Carta",
    frase: "La lastra scura sparisce del tutto.",
    colore: "Nessuno: la colonna è carta",
    cosaCambia:
      "Il modo più diretto di risolvere un colore che non piace è non averlo. La colonna diventa carta come il resto della pagina e si stacca per un filetto e per la voce attiva, che qui è l'unico segno pieno dello schermo e quindi si vede benissimo. È anche l'unica delle tre che esce dal riflesso «colonna scura accanto a foglio chiaro», che hanno Linear, Vercel e sistemacommercialisti. Angoli a venti: tutto è un campo unico e morbido.",
    costo:
      "La colonna scura è ciò che fa leggere una schermata come strumento professionale invece che come abbozzo. Toglierla è la scelta più coraggiosa delle tre ed è quella che può sembrare non finita. E l'inchiostro non sparisce davvero: i pulsanti pieni restano scuri, solo neutri invece che blu.",
    campioni: [
      { e: "barra", v: "oklch(0.978 0.003 288)" },
      { e: "voce attiva", v: "oklch(0.925 0.006 288)" },
      { e: "pulsante", v: "oklch(0.245 0.006 288)", scuro: true },
      { e: "fondo", v: "oklch(0.956 0.003 288)" },
    ],
  },
  {
    id: "terra",
    nome: "Quieto · Terra",
    frase: "Una terra al posto di un blu.",
    colore: "Pietra calda, hue 78",
    cosaCambia:
      "Stessa struttura di oggi, tinta opposta: pietra calda a croma bassissima, che legge come cuoio e archivio invece che come tecnologia. Tutta la famiglia dei neutri si sposta con lei, quindi la carta è avorio e non bianco-azzurro. È la più lontana dai vicini: nel software di compliance italiano il caldo non lo usa nessuno. Angoli a sedici, perché il caldo già ammorbidisce e non serve raddoppiare.",
    costo:
      "Hue 78 confina con l'ambra, che è riservata a «in scadenza». Le due tinte pure non si confondono — l'ambra sta a croma 0,135 e la pietra a 0,022, sono due mondi — ma guarda la matrice del rischio: le celle sono rosso mescolato al fondo della pagina, e con un fondo caldo diventano terracotta. Il rosso continua a essere il segnale, ma è l'unica delle tre in cui va verificato accanto a una pastiglia ambra prima di dire sì.",
    campioni: [
      { e: "barra", v: "oklch(0.268 0.022 78)", scuro: true },
      { e: "pulsante", v: "oklch(0.268 0.022 78)", scuro: true },
      { e: "fondo", v: "oklch(0.960 0.005 85)" },
      { e: "pannello", v: "oklch(0.996 0.002 85)" },
    ],
  },
] as const;

export const CSS_QUIETO = `
[data-quieto] {
  font-family: var(--f-geist), ui-sans-serif, system-ui, sans-serif;
  --font-sans: var(--f-geist);
  --font-mono: var(--f-geist-mono);
  --font-serif: var(--f-geist-mono);
}
[data-quieto] .cifra,
[data-quieto] .titolo {
  font-family: var(--f-geist-mono), ui-monospace, monospace;
  font-weight: 500;
  letter-spacing: -0.045em;
}
/* Il fondo di «quieto»: nessuna linea da nessuna parte, tanta aria, etichette spente. */
[data-quieto] [data-pezzo="scheda"] { border-color: transparent; }
[data-quieto] [data-pezzo="scheda"].p-4 { padding: 1.5rem; }
[data-quieto] [data-pezzo="incasso"] { padding: 0.625rem 0.875rem; }
[data-quieto] .divide-y > li,
[data-quieto] .divide-y > tr > td { padding-top: 0.8125rem; padding-bottom: 0.8125rem; }
[data-quieto] .divide-border-subtle > * { border-color: transparent; }
[data-quieto] [data-pezzo="scheda"] > .border-b:first-child { border-bottom-color: transparent; }
[data-quieto] h3 {
  text-transform: none;
  letter-spacing: 0;
  font-size: 0.75rem;
  font-weight: 500;
  font-family: var(--f-geist), ui-sans-serif, system-ui, sans-serif;
  color: var(--faint-foreground);
}

/* ------------------------------------------------------------------ NOTTE -- */
[data-quieto="notte"] {
  --radius-sm: 0.5rem;
  --radius: 0.625rem;
  --radius-lg: 0.875rem;
  --radius-xl: 1.125rem;
}
:root[data-theme="dark"] [data-quieto="notte"] {
  --background: oklch(0.148 0.015 288);
  --surface: oklch(0.198 0.017 288);
  --surface-sunken: oklch(0.172 0.016 288);
  --surface-raised: oklch(0.234 0.018 288);
  --border: oklch(0.238 0.014 288);
  --border-strong: oklch(0.305 0.015 288);
  --border-subtle: oklch(0.216 0.013 288);
  --foreground: oklch(0.958 0.004 288);
  --muted-foreground: oklch(0.755 0.008 288);
  --faint-foreground: oklch(0.6 0.009 288);
  --primary: oklch(0.955 0.004 288);
  --primary-foreground: oklch(0.148 0.015 288);
  --sidebar: oklch(0.124 0.016 288);
  --sidebar-foreground: oklch(0.955 0.004 288);
  --sidebar-border: oklch(0.203 0.013 288);
  --sidebar-selected: oklch(0.222 0.022 292);
  --sidebar-muted: oklch(0.62 0.011 288);
}
:root[data-theme="light"] [data-quieto="notte"] {
  --background: oklch(0.958 0.004 288);
  --surface: oklch(0.993 0.0015 288);
  --surface-sunken: oklch(0.968 0.004 288);
  --surface-raised: oklch(0.98 0.003 288);
  --border: oklch(0.928 0.004 288);
  --border-strong: oklch(0.872 0.006 288);
  --border-subtle: oklch(0.947 0.003 288);
  --foreground: oklch(0.235 0.018 288);
  --muted-foreground: oklch(0.5 0.009 288);
  --faint-foreground: oklch(0.62 0.007 288);
  --primary: oklch(0.235 0.026 288);
  --primary-hover: oklch(0.185 0.028 288);
  --primary-foreground: oklch(0.985 0.002 288);
  --sidebar: oklch(0.235 0.026 288);
  --sidebar-foreground: oklch(0.94 0.005 288);
  --sidebar-border: oklch(0.325 0.02 288);
  --sidebar-selected: oklch(0.315 0.032 292);
  --sidebar-muted: oklch(0.68 0.014 288);
}

/* ------------------------------------------------------------------ CARTA -- */
[data-quieto="carta"] {
  --radius-sm: 0.5625rem;
  --radius: 0.75rem;
  --radius-lg: 1rem;
  --radius-xl: 1.25rem;
}
/* Senza lastra scura la colonna ha bisogno di un filetto, ed è l'unico di tutta la pagina. */
[data-quieto="carta"] aside { border-right: 1px solid var(--sidebar-border); }
:root[data-theme="dark"] [data-quieto="carta"] {
  --background: oklch(0.146 0.015 288);
  --surface: oklch(0.196 0.017 288);
  --surface-sunken: oklch(0.172 0.016 288);
  --surface-raised: oklch(0.232 0.018 288);
  --border: oklch(0.236 0.014 288);
  --border-strong: oklch(0.3 0.015 288);
  --border-subtle: oklch(0.215 0.013 288);
  --foreground: oklch(0.958 0.004 288);
  --muted-foreground: oklch(0.755 0.008 288);
  --faint-foreground: oklch(0.6 0.009 288);
  --primary: oklch(0.955 0.004 288);
  --primary-foreground: oklch(0.146 0.015 288);
  /* Sul buio «carta» non vuol dire chiara: vuol dire che la colonna è una superficie come
     le altre invece di una lastra a parte. Sta un gradino sotto il pannello, non sei. */
  --sidebar: oklch(0.172 0.016 288);
  --sidebar-foreground: oklch(0.95 0.004 288);
  --sidebar-border: oklch(0.245 0.014 288);
  --sidebar-selected: oklch(0.248 0.02 292);
  --sidebar-muted: oklch(0.63 0.011 288);
}
:root[data-theme="light"] [data-quieto="carta"] {
  --background: oklch(0.956 0.003 288);
  --surface: oklch(0.995 0.0015 288);
  --surface-sunken: oklch(0.966 0.004 288);
  --surface-raised: oklch(0.979 0.003 288);
  --border: oklch(0.926 0.004 288);
  --border-strong: oklch(0.868 0.006 288);
  --border-subtle: oklch(0.945 0.003 288);
  --foreground: oklch(0.24 0.016 288);
  --muted-foreground: oklch(0.5 0.009 288);
  --faint-foreground: oklch(0.62 0.007 288);
  /* L'inchiostro non sparisce dai pulsanti: diventa neutro invece che blu. */
  --primary: oklch(0.245 0.006 288);
  --primary-hover: oklch(0.19 0.006 288);
  --primary-foreground: oklch(0.985 0.002 288);
  --sidebar: oklch(0.978 0.003 288);
  --sidebar-foreground: oklch(0.245 0.016 288);
  --sidebar-border: oklch(0.918 0.004 288);
  --sidebar-selected: oklch(0.925 0.006 288);
  --sidebar-muted: oklch(0.545 0.008 288);
}

/* ------------------------------------------------------------------ TERRA -- */
[data-quieto="terra"] {
  --radius-sm: 0.4375rem;
  --radius: 0.5625rem;
  --radius-lg: 0.75rem;
  --radius-xl: 1rem;
}
:root[data-theme="dark"] [data-quieto="terra"] {
  --background: oklch(0.152 0.01 85);
  --surface: oklch(0.2 0.011 85);
  --surface-sunken: oklch(0.175 0.01 85);
  --surface-raised: oklch(0.236 0.012 85);
  --border: oklch(0.243 0.01 85);
  --border-strong: oklch(0.31 0.012 85);
  --border-subtle: oklch(0.22 0.009 85);
  --foreground: oklch(0.958 0.004 85);
  --muted-foreground: oklch(0.757 0.008 85);
  --faint-foreground: oklch(0.605 0.009 85);
  --primary: oklch(0.955 0.005 85);
  --primary-foreground: oklch(0.152 0.01 85);
  --sidebar: oklch(0.13 0.012 78);
  --sidebar-foreground: oklch(0.955 0.005 85);
  --sidebar-border: oklch(0.213 0.012 78);
  --sidebar-selected: oklch(0.232 0.02 78);
  --sidebar-muted: oklch(0.635 0.012 85);
}
:root[data-theme="light"] [data-quieto="terra"] {
  --background: oklch(0.96 0.005 85);
  --surface: oklch(0.996 0.002 85);
  --surface-sunken: oklch(0.966 0.005 85);
  --surface-raised: oklch(0.98 0.004 85);
  --border: oklch(0.918 0.006 85);
  --border-strong: oklch(0.858 0.008 85);
  --border-subtle: oklch(0.94 0.005 85);
  --foreground: oklch(0.245 0.014 85);
  --muted-foreground: oklch(0.505 0.01 85);
  --faint-foreground: oklch(0.625 0.008 85);
  --primary: oklch(0.268 0.022 78);
  --primary-hover: oklch(0.215 0.024 78);
  --primary-foreground: oklch(0.985 0.003 85);
  --sidebar: oklch(0.268 0.022 78);
  --sidebar-foreground: oklch(0.945 0.006 85);
  --sidebar-border: oklch(0.352 0.018 78);
  --sidebar-selected: oklch(0.345 0.028 78);
  --sidebar-muted: oklch(0.7 0.014 85);
}
`;
