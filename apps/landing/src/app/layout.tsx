import type { Metadata, Viewport } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import { token } from "@/lib/colori";
import { TOTALE } from "@/lib/dati";
import { INDICIZZABILE, SITO } from "@/lib/sito";
import "./globals.css";

// I caratteri arrivano dal pacchetto npm `geist`, non da Google: la build non ha bisogno di
// rete. Il prodotto li scarica ancora da `fonts.googleapis.com` in fase di build, ed è una
// fragilità già registrata in docs/05.

const TITOLO = "Legisboard · adempimenti GDPR, 231 e 81/08 in un registro";
const DESCRIZIONE =
  `Un registro per GDPR, D.Lgs 231/2001 e D.Lgs 81/2008: ${TOTALE} adempimenti, ` +
  "con lo stato del lavoro separato dalla scadenza. Demo con un clic.";

export const metadata: Metadata = {
  metadataBase: new URL(SITO.url),
  title: TITOLO,
  description: DESCRIZIONE,
  alternates: { canonical: "/" },
  // Le anteprime di Vercel e la pagina senza dati legali restano fuori dagli indici: docs/07 §3.1.
  robots: INDICIZZABILE ? { index: true, follow: true } : { index: false, follow: false },
  openGraph: {
    type: "website",
    locale: "it_IT",
    siteName: SITO.nome,
    url: "/",
    title: TITOLO,
    description: DESCRIZIONE,
  },
  twitter: { card: "summary_large_image", title: TITOLO, description: DESCRIZIONE },
};

// Il colore della barra del browser: l'oliva del token `--primary`, convertita alla build.
export const viewport: Viewport = { themeColor: token("--primary"), colorScheme: "light" };

export default function Radice({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
