import type { Metadata } from "next";
import { Building2, CalendarClock, FileText, LayoutGrid, Settings } from "lucide-react";
import { datiVarianti } from "../dati";
import { Accesso, Assessment, Azienda, Cruscotto, Impostazioni, Portafoglio, Scadenzario } from "./schermate";

export const metadata: Metadata = { title: "Schede evolute · tutte le schermate" };

// Il prodotto intero nella direzione scelta, prima di riscriverlo.
//
// Vedere tutte le schermate insieme è l'unico modo per accorgersi in tempo se una direzione
// regge sul cruscotto ma crolla sulla tabella densa. Costruirle una alla volta significa
// scoprirlo alla terza, con due già riscritte.

const SCHERMATE = [
  {
    n: 1,
    nome: "Cruscotto",
    icona: LayoutGrid,
    cosa: "Griglia asimmetrica: il complessivo pesa due colonne, i moduli una. Sotto, la scheda che NOMINA il problema peggiore invece di contarlo.",
  },
  {
    n: 2,
    nome: "Portafoglio",
    icona: Building2,
    cosa: "Righe come schede basse: si sollevano al passaggio, e la densità resta.",
  },
  {
    n: 3,
    nome: "Scadenzario",
    icona: CalendarClock,
    cosa: "Le finestre come primo comando, non come filtro fra tanti. Tre decreti in una lista sola.",
  },
  {
    n: 4,
    nome: "Scheda azienda",
    icona: Building2,
    cosa: "Tre schede di modulo con l'interruttore dentro, e le prossime scadenze sotto.",
  },
  {
    n: 5,
    nome: "Assessment",
    icona: FileText,
    cosa: "La schermata di lavoro: 64 righe raggruppate per categoria, filtri in linea, stato modificabile.",
  },
  {
    n: 6,
    nome: "Impostazioni",
    icona: Settings,
    cosa: "Schede di larghezza diversa secondo il peso: il marchio è piccolo, le utenze occupano tutto.",
  },
  { n: 7, nome: "Accesso", icona: FileText, cosa: "Carta intestata a sinistra, modulo a destra." },
] as const;

export default function PaginaSchede() {
  const d = datiVarianti();

  return (
    <main className="mx-auto max-w-[1600px] px-6 py-10">
      <header className="max-w-3xl">
        <p className="text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">
          Direzione scelta · schede evolute
        </p>
        <h1 className="titolo mt-2 text-3xl">Tutte le schermate, prima di riscriverle</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Sono anteprime statiche sui dati veri del motore. Servono a vedere il prodotto intero: una direzione
          può reggere sul cruscotto e crollare sulla tabella da sessantaquattro righe, e accorgersene adesso
          costa un pomeriggio invece di tre schermate riscritte.
        </p>
      </header>

      <section className="mt-8 rounded-xl border border-border bg-surface p-5">
        <h2 className="text-[11px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
          Le sette regole applicate
        </h2>
        <ol className="mt-3 grid gap-x-8 gap-y-2 text-xs leading-relaxed text-muted-foreground md:grid-cols-2">
          {[
            [
              "La griglia non è simmetrica.",
              "Quattro riquadri identici in fila sembrano curati per dieci secondi e poi sono arredamento.",
            ],
            [
              "Dentro ogni scheda un grafico.",
              "Una scheda con solo «44% · conformità» è una didascalia con un bordo.",
            ],
            [
              "Una scheda nomina il problema.",
              "Non «12 scadute» ma la cosa peggiore, con il pulsante per andarci.",
            ],
            [
              "Tre livelli di profondità.",
              "Fondo, scheda, elemento incassato: è così che si ottiene rilievo senza ombre, che sul buio non esistono.",
            ],
            [
              "Le righe sono schede basse.",
              "Si sollevano al passaggio: densità ferma, informazione che cresce quando la cerchi.",
            ],
            [
              "Tre caratteri per tre ruoli.",
              "Cifra in serif, denominatore in mono, etichetta in sans. È la firma, e nessun concorrente ce l'ha.",
            ],
            [
              "Il decreto è un punto.",
              "Mai una fascia laterale colorata: è il tic più riconoscibile dell'interfaccia fatta a macchina.",
            ],
          ].map(([t, s], i) => (
            <li key={t} className="flex gap-2">
              <span className="font-mono text-[10px] text-faint-foreground">{i + 1}</span>
              <span>
                <b className="text-foreground">{t}</b> {s}
              </span>
            </li>
          ))}
        </ol>
      </section>

      <div className="mt-10 space-y-12">
        {SCHERMATE.map((s) => (
          <section key={s.n}>
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-border-strong pb-2">
              <span className="cifra text-xl text-muted-foreground">{s.n}</span>
              <h2 className="titolo text-lg">{s.nome}</h2>
              <p className="text-xs text-muted-foreground">{s.cosa}</p>
            </div>
            <div className="mt-4 rounded-xl bg-background p-4">
              {s.n === 1 ? (
                <Cruscotto d={d} />
              ) : s.n === 2 ? (
                <Portafoglio d={d} />
              ) : s.n === 3 ? (
                <Scadenzario d={d} />
              ) : s.n === 4 ? (
                <Azienda d={d} />
              ) : s.n === 5 ? (
                <Assessment d={d} />
              ) : s.n === 6 ? (
                <Impostazioni d={d} />
              ) : (
                <Accesso />
              )}
            </div>
          </section>
        ))}
      </div>

      <footer className="mt-14 border-t border-border pt-5 text-xs leading-relaxed text-muted-foreground">
        Dimmi cosa non regge e su quale schermata. Poi le riscrivo tutte in un colpo solo invece di
        rincorrerle una alla volta.
      </footer>
    </main>
  );
}
