import {
  Geist,
  Geist_Mono,
  IBM_Plex_Mono,
  IBM_Plex_Sans,
  Instrument_Sans,
  Instrument_Serif,
  JetBrains_Mono,
  Newsreader,
} from "next/font/google";

// TRE REGISTRI TIPOGRAFICI SULLO STESSO IMPIANTO.
//
// L'impianto non cambia: griglia asimmetrica, tre livelli di profondità, il decreto come
// punto, il colore riservato allo stato. Cambia la VOCE. È la variabile che il committente
// sente senza saperla nominare, e l'unica che si sceglie guardando invece che ragionando.
//
// Con i caratteri cambiano tre cose che ne dipendono davvero, e nient'altro:
//   RAGGIO      un carattere stretto e tecnico chiede angoli stretti, un serif editoriale
//               chiede angoli larghi. Tenerlo fermo farebbe sembrare i tre lo stesso vestito.
//   ETICHETTE   maiuscoletto spaziato, minuscolo mono, o tondo pieno: è la cosa che si
//               ripete più volte nella pagina, quindi è quella che detta il tono.
//   CIFRA       il numero grande è il centro di ogni scheda. In serif è una perizia, in
//               mono è uno strumento, in serif ad alto contrasto è una rivista.

const plexSans = IBM_Plex_Sans({
  variable: "--f-plex-sans",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600"],
  display: "swap",
});
const plexMono = IBM_Plex_Mono({
  variable: "--f-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});
const newsreader = Newsreader({
  variable: "--f-newsreader",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const geist = Geist({
  variable: "--f-geist",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600"],
  display: "swap",
});
const geistMono = Geist_Mono({
  variable: "--f-geist-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const instrumentSans = Instrument_Sans({
  variable: "--f-instrument-sans",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600"],
  display: "swap",
});
const instrumentSerif = Instrument_Serif({
  variable: "--f-instrument-serif",
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
});
const jetbrains = JetBrains_Mono({
  variable: "--f-jetbrains",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const CLASSI_FONT = [
  plexSans.variable,
  plexMono.variable,
  newsreader.variable,
  geist.variable,
  geistMono.variable,
  instrumentSans.variable,
  instrumentSerif.variable,
  jetbrains.variable,
].join(" ");

export type Registro = {
  id: string;
  nome: string;
  sottotitolo: string;
  caratteri: [string, string, string];
  perche: string;
  contro: string;
  /** Valori delle variabili applicati al contenitore dell'anteprima. */
  vars: Record<string, string>;
};

export const REGISTRI: readonly Registro[] = [
  {
    id: "perizia",
    nome: "Perizia",
    sottotitolo: "IBM Plex · Newsreader",
    caratteri: ["IBM Plex Sans", "IBM Plex Mono", "Newsreader"],
    perche:
      "Il serif nella cifra lega la schermata al documento che ne esce: è lo stesso carattere della copertina della relazione. Plex ha cifre tabellari che reggono la tabella da sessantaquattro righe senza impastarsi.",
    contro:
      "Plex è il carattere di IBM e si riconosce. Chi l'ha già visto altrove non lo legge come tuo.",
    vars: {
      "--font-sans": "var(--f-plex-sans)",
      "--font-mono": "var(--f-plex-mono)",
      "--font-serif": "var(--f-newsreader)",
      "--radius-sm": "0.25rem",
      "--radius": "0.375rem",
      "--radius-lg": "0.5rem",
      "--radius-xl": "0.75rem",
    },
  },
  {
    id: "console",
    nome: "Console",
    sottotitolo: "Geist · cifre in mono",
    caratteri: ["Geist", "Geist Mono", "Geist Mono (cifre)"],
    perche:
      "Niente serif: la cifra è in mono, stretta e allineata. Angoli quasi vivi, etichette in minuscolo. È il registro dello strumento di lavoro, quello che non prova a sembrare un libro.",
    contro:
      "È anche il registro di mezzo settore. Geist è il carattere di Vercel, e la stanza in cui entri è affollata.",
    vars: {
      "--font-sans": "var(--f-geist)",
      "--font-mono": "var(--f-geist-mono)",
      "--font-serif": "var(--f-geist-mono)",
      "--radius-sm": "0.1875rem",
      "--radius": "0.25rem",
      "--radius-lg": "0.3125rem",
      "--radius-xl": "0.375rem",
    },
  },
  {
    id: "gazzetta",
    nome: "Gazzetta",
    sottotitolo: "Instrument Sans · Instrument Serif",
    caratteri: ["Instrument Sans", "JetBrains Mono", "Instrument Serif"],
    perche:
      "Il serif ad alto contrasto porta la cifra dove nessun gestionale la mette: grande, sottile, editoriale. Angoli larghi, etichette in tondo senza maiuscoletto. È il registro che si ricorda.",
    contro:
      "Instrument Serif esiste in un solo peso e sotto una certa misura sparisce. Va usato grande o non va usato.",
    vars: {
      "--font-sans": "var(--f-instrument-sans)",
      "--font-mono": "var(--f-jetbrains)",
      "--font-serif": "var(--f-instrument-serif)",
      "--radius-sm": "0.375rem",
      "--radius": "0.5rem",
      "--radius-lg": "0.75rem",
      "--radius-xl": "1rem",
    },
  },
] as const;

// Le regole che non si esprimono con una variabile. Restano fuori dai layer di Tailwind,
// quindi vincono sulle utility senza bisogno di alzare la specificità a mano.
export const CSS_REGISTRI = `
[data-registro] { font-family: var(--font-sans), ui-sans-serif, system-ui, sans-serif; }

[data-registro="console"] .cifra,
[data-registro="console"] .titolo {
  font-family: var(--font-mono), ui-monospace, monospace;
  font-weight: 500;
  letter-spacing: -0.045em;
}
[data-registro="console"] h3 {
  text-transform: lowercase;
  letter-spacing: 0.01em;
  font-weight: 500;
  font-family: var(--font-mono), ui-monospace, monospace;
}

[data-registro="gazzetta"] .cifra,
[data-registro="gazzetta"] .titolo {
  font-weight: 400;
  letter-spacing: -0.012em;
}
[data-registro="gazzetta"] h3 {
  text-transform: none;
  letter-spacing: 0;
  font-weight: 600;
  font-size: 0.75rem;
}
`;
