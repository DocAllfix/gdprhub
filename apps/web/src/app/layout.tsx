import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { PRODOTTO } from "@/lib/brand";
import "./globals.css";
import { cn } from "@/lib/utils";

// GEIST, e il mono fa un lavoro suo.
//
// Scelto dal committente confrontando tre registri tipografici sulle stesse schermate.
// Geist è un neo-grottesco stretto e neutro che regge la tabella da sessantaquattro righe
// senza impastarsi, e IBM Plex — la scelta precedente — è il carattere di IBM e si
// riconosce: chi l'ha già visto altrove non lo legge come nostro.
//
// IL MONO NON È DECORAZIONE, ed è il pezzo che porta la firma. Ci vanno tre cose e solo
// quelle: i codici degli adempimenti (T01, M47, S16), dove distingue l'identificatore dal
// testo e allinea le colonne; le date e i giorni residui, che sono colonne di numeri; e le
// CIFRE GRANDI al centro di ogni scheda, che in mono dicono «dato misurato» invece di
// «titolo». Le larghezze fisse fanno il resto: una colonna di numeri si allinea da sola e
// un valore che cambia non fa ballare la riga accanto.
//
// Il serif editoriale è stato provato e scartato: legava bene alla perizia stampata, ma
// portava un terzo carattere e un registro che con Geist litiga.
const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
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
      className={cn("h-full", geist.variable, geistMono.variable, "font-sans")}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA }} />
      </head>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
