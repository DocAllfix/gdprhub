import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, Newsreader } from "next/font/google";
import { PRODOTTO } from "@/lib/brand";
import "./globals.css";
import { cn } from "@/lib/utils";

// IBM Plex: cifre tabellari eccellenti, regge le dimensioni piccole senza impastarsi, e
// porta un carattere istituzionale che legge come documento e non come app.
// Il mono non è un vezzo: sui codici degli adempimenti (T01, M47, S16) distingue
// l'identificatore dal testo e allinea le colonne.
const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

// IL SERIF ENTRA NELL'INTERFACCIA, e non solo nel documento.
//
// È la firma tipografica del prodotto e il suo distacco più netto dai vicini:
// `sistemacommercialisti` è tutto Plex Sans, Linear e Vercel sono grotteschi puri. Un
// titolo e una cifra in Newsreader su fondo grafite si riconoscono a colpo d'occhio, e
// legano la schermata alla perizia che ne esce: è lo stesso carattere della copertina.
//
// Solo titoli e cifre grandi. Sotto i 16px il serif si impasta e la tabella deve restare
// Plex: la densità viene prima della firma.
const newsreader = Newsreader({
  variable: "--font-serif",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: PRODOTTO.nome, template: `%s · ${PRODOTTO.nome}` },
  description: PRODOTTO.descrizione,
  // Le istanze cliente non devono finire nei motori di ricerca. Sulla vetrina
  // l'intestazione si toglie dal proxy, non da qui.
  robots: { index: false, follow: false },
};

// Stampa il tema sulla radice PRIMA del disegno: senza, la pagina lampeggia in chiaro per
// un istante prima di diventare scura. Gira sincrono e non dipende da React.
//
// LO SCURO È IL PREDEFINITO, e non «perché gli strumenti stanno bene scuri». È la casa del
// prodotto: la scala di superfici, i filetti e i tre colori di stato sono progettati lì, e
// il chiaro è la traduzione. Chi lo sceglie esplicitamente lo ottiene, e la scelta vince
// sempre sulla preferenza di sistema in entrambe le direzioni.
//
// Il documento PDF resta carta chiara: strumento scuro, perizia chiara. Il contrasto fra i
// due registri è deliberato ed è il lusso del prodotto.
const SCRIPT_TEMA = `
(function () {
  try {
    var scelto = localStorage.getItem("tema");
    document.documentElement.setAttribute("data-theme", scelto === "light" ? "light" : "dark");
  } catch (e) {
    document.documentElement.setAttribute("data-theme", "dark");
  }
})();
`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="it"
      className={cn("h-full", plexSans.variable, plexMono.variable, "font-sans", newsreader.variable)}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA }} />
      </head>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
