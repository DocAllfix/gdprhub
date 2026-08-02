import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, Geist } from "next/font/google";
import { PRODOTTO } from "@/lib/brand";
import "./globals.css";
import { cn } from "@/lib/utils";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

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

export const metadata: Metadata = {
  title: { default: PRODOTTO.nome, template: `%s · ${PRODOTTO.nome}` },
  description: PRODOTTO.descrizione,
  // Le istanze cliente non devono finire nei motori di ricerca. Sulla vetrina
  // l'intestazione si toglie dal proxy, non da qui.
  robots: { index: false, follow: false },
};

// Stampa il tema sulla radice PRIMA del disegno: senza, la pagina lampeggia in chiaro per
// un istante prima di diventare scura. Gira sincrono e non dipende da React.
// La scelta esplicita dell'utente vince sempre sulla preferenza di sistema, in entrambe le
// direzioni: chi ha il sistema scuro e sceglie il chiaro deve ottenere il chiaro.
const SCRIPT_TEMA = `
(function () {
  try {
    var scelto = localStorage.getItem("tema");
    var scuro = scelto ? scelto === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.setAttribute("data-theme", scuro ? "dark" : "light");
  } catch (e) {
    document.documentElement.setAttribute("data-theme", "light");
  }
})();
`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="it"
      className={cn("h-full", plexSans.variable, plexMono.variable, "font-sans", geist.variable)}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA }} />
      </head>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
