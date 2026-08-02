import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { datiVarianti } from "../dati";
import { Accesso, Azienda, Cruscotto, Impostazioni, Portafoglio } from "../schede/schermate";
import { AssessmentEvoluto, ScadenzarioEvoluto } from "../schede/due-schermate";
import { InterruttoreTema } from "../schede/tema";
import { CSS_SCHEMI, SCHEMI, type Schema } from "./schemi";

export const metadata: Metadata = { title: "Geist · tre schemi di design" };

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

const SCHERMATE = [
  { n: 1, nome: "Cruscotto" },
  { n: 2, nome: "Portafoglio" },
  { n: 3, nome: "Scadenzario" },
  { n: 4, nome: "Scheda azienda" },
  { n: 5, nome: "Assessment" },
  { n: 6, nome: "Impostazioni" },
  { n: 7, nome: "Accesso" },
] as const;

function Anteprima({ s }: { s: Schema }) {
  const d = datiVarianti();
  return (
    <div>
      <div className="sticky top-0 z-10 -mx-6 mb-5 border-y border-border-strong bg-background/95 px-6 py-3 backdrop-blur">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 className="titolo text-2xl">{s.nome}</h2>
          <p className="text-sm text-muted-foreground">{s.frase}</p>
        </div>
        <div className="mt-1.5 grid max-w-4xl gap-x-6 gap-y-1 text-xs leading-relaxed md:grid-cols-2">
          <p className="text-muted-foreground">{s.perche}</p>
          <p className="text-faint-foreground">
            <b className="text-muted-foreground">Contro.</b> {s.contro}
          </p>
        </div>
      </div>

      <div data-schema={s.id} className="space-y-8 rounded-xl bg-background p-5">
        {SCHERMATE.map((x) => (
          <section key={x.n}>
            <div className="mb-3 flex items-baseline gap-2 border-b border-border pb-1.5">
              <span className="cifra text-sm text-faint-foreground">{x.n}</span>
              <h3 className="text-[11px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
                {x.nome}
              </h3>
            </div>
            {x.n === 1 ? (
              <Cruscotto d={d} />
            ) : x.n === 2 ? (
              <Portafoglio d={d} />
            ) : x.n === 3 ? (
              <ScadenzarioEvoluto d={d} />
            ) : x.n === 4 ? (
              <Azienda d={d} />
            ) : x.n === 5 ? (
              <AssessmentEvoluto d={d} />
            ) : x.n === 6 ? (
              <Impostazioni d={d} />
            ) : (
              <Accesso />
            )}
          </section>
        ))}
      </div>
    </div>
  );
}

export default function PaginaGeist() {
  return (
    <main className={`${geist.variable} ${geistMono.variable} mx-auto max-w-[1600px] px-6 py-8`}>
      <style dangerouslySetInnerHTML={{ __html: CSS_SCHEMI }} />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <nav className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-faint-foreground">Vai a</span>
          {SCHEMI.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="rounded-lg border border-border bg-surface px-2.5 py-1 hover:bg-surface-raised"
            >
              {s.nome}
            </a>
          ))}
        </nav>
        <InterruttoreTema />
      </div>

      <header className="max-w-3xl">
        <p className="text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">
          Geist · tre schemi
        </p>
        <h1 className="titolo mt-2 text-3xl">Come si stacca un pannello dal fondo</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Il carattere è deciso. Con la tipografia ferma resta da decidere la cosa più grossa, e non è una
          sfumatura di gusto: come si stacca un pannello dal fondo. Ci sono tre risposte, e si comportano
          diversamente là dove conta, cioè in una tabella da sessantaquattro righe. Ognuna è qui su tutte e
          sette le schermate, e ognuna è definita su entrambi i temi con numeri propri: il chiaro non è lo
          scuro invertito.
        </p>
      </header>

      <ul className="mt-6 grid gap-3 md:grid-cols-3">
        {SCHEMI.map((s) => (
          <li key={s.id} className="rounded-xl border border-border bg-surface p-3.5">
            <p className="text-[11px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
              {s.nome}
            </p>
            <p className="mt-1 text-sm leading-snug">{s.frase}</p>
          </li>
        ))}
      </ul>

      <div className="mt-10 space-y-16">
        {SCHEMI.map((s) => (
          <div key={s.id} id={s.id} className="scroll-mt-4">
            <Anteprima s={s} />
          </div>
        ))}
      </div>

      <footer className="mt-16 border-t border-border pt-5 text-xs leading-relaxed text-muted-foreground">
        Dimmi quale schema e in quale tema. Si può anche prendere il corpo di uno e la testata di un altro:
        sono variabili, non pacchetti chiusi.
      </footer>
    </main>
  );
}
