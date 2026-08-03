import type { Metadata } from "next";
import { datiVarianti } from "../dati";
import { Accesso, Azienda, Cruscotto, Impostazioni, Portafoglio } from "../schede/schermate";
import { AssessmentEvoluto, ScadenzarioEvoluto } from "../schede/due-schermate";
import { InterruttoreTema } from "../schede/tema";
import { CLASSI_FONT, CSS_REGISTRI, REGISTRI, type Registro } from "./registri";

export const metadata: Metadata = { title: "Tre registri tipografici" };

const SCHERMATE = [
  { n: 1, nome: "Cruscotto" },
  { n: 2, nome: "Portafoglio" },
  { n: 3, nome: "Scadenzario" },
  { n: 4, nome: "Scheda azienda" },
  { n: 5, nome: "Assessment" },
  { n: 6, nome: "Impostazioni" },
  { n: 7, nome: "Accesso" },
] as const;

/** Il campionario: i tre caratteri sui tre usi che il prodotto fa davvero di loro. */
function Campionario({ r }: { r: Registro }) {
  return (
    <div className="grid gap-4 rounded-xl border border-border bg-surface p-4 sm:grid-cols-3">
      <div>
        <p className="text-[10px] tracking-[0.09em] text-faint-foreground uppercase">
          Cifra · {r.caratteri[2]}
        </p>
        <p className="cifra mt-1 text-[2.6rem] leading-none">44%</p>
        <p className="mt-1.5 text-xs text-muted-foreground">Il numero grande al centro di ogni scheda.</p>
      </div>
      <div>
        <p className="text-[10px] tracking-[0.09em] text-faint-foreground uppercase">
          Testo · {r.caratteri[0]}
        </p>
        <p className="mt-1.5 text-sm leading-snug">Valutazione dei rischi e aggiornamento del documento</p>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Datore di Lavoro · 12 mesi · priorità critica
        </p>
      </div>
      <div>
        <p className="text-[10px] tracking-[0.09em] text-faint-foreground uppercase">
          Codici · {r.caratteri[1]}
        </p>
        <p className="mt-1.5 font-mono text-sm tabular-nums">S16 · 31/03/2026 · −412 gg</p>
        <p className="mt-1 font-mono text-[11px] text-muted-foreground tabular-nums">
          0123456789 · 21/64 · +7
        </p>
      </div>
    </div>
  );
}

function Anteprima({ r }: { r: Registro }) {
  const d = datiVarianti();
  return (
    <section data-registro={r.id} style={r.vars as React.CSSProperties} className="scroll-mt-4">
      <div className="sticky top-0 z-10 -mx-6 mb-5 border-y border-border-strong bg-background/95 px-6 py-3 backdrop-blur">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 className="titolo text-2xl">{r.nome}</h2>
          <p className="font-mono text-xs text-muted-foreground">{r.sottotitolo}</p>
        </div>
        <div className="mt-1.5 grid max-w-4xl gap-x-6 gap-y-1 text-xs leading-relaxed md:grid-cols-2">
          <p className="text-muted-foreground">{r.perche}</p>
          <p className="text-faint-foreground">
            <b className="text-muted-foreground">Contro.</b> {r.contro}
          </p>
        </div>
      </div>

      <Campionario r={r} />

      <div className="mt-6 space-y-8">
        {SCHERMATE.map((s) => (
          <div key={s.n}>
            <div className="mb-3 flex items-baseline gap-2 border-b border-border pb-1.5">
              <span className="cifra text-sm text-faint-foreground">{s.n}</span>
              <h3 className="text-[11px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
                {s.nome}
              </h3>
            </div>
            {s.n === 1 ? (
              <Cruscotto d={d} />
            ) : s.n === 2 ? (
              <Portafoglio d={d} />
            ) : s.n === 3 ? (
              <ScadenzarioEvoluto d={d} />
            ) : s.n === 4 ? (
              <Azienda d={d} />
            ) : s.n === 5 ? (
              <AssessmentEvoluto d={d} />
            ) : s.n === 6 ? (
              <Impostazioni d={d} />
            ) : (
              <Accesso />
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

export default function PaginaTipografia() {
  return (
    <main className={`${CLASSI_FONT} mx-auto max-w-[1600px] px-6 py-8`}>
      <style dangerouslySetInnerHTML={{ __html: CSS_REGISTRI }} />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <nav className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-faint-foreground">Vai a</span>
          {REGISTRI.map((r) => (
            <a
              key={r.id}
              href={`#${r.id}`}
              className="rounded-lg border border-border bg-surface px-2.5 py-1 hover:bg-surface-raised"
            >
              {r.nome}
            </a>
          ))}
        </nav>
        <InterruttoreTema />
      </div>

      <header className="max-w-3xl">
        <p className="text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">
          Stesso impianto · tre voci
        </p>
        <h1 className="titolo mt-2 text-3xl">Tre registri tipografici, in scuro e in chiaro</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          L&apos;impianto non cambia: griglia asimmetrica, tre livelli di profondità, il decreto come punto,
          il colore riservato allo stato. Cambia la voce, e con lei le tre cose che dalla voce dipendono
          davvero: il raggio degli angoli, il trattamento delle etichette e la forma della cifra. Sono le
          stesse sette schermate sugli stessi dati, tre volte. Scegli guardando.
        </p>
      </header>

      <div className="mt-8 space-y-16">
        {REGISTRI.map((r) => (
          <div key={r.id} id={r.id}>
            <Anteprima r={r} />
          </div>
        ))}
      </div>

      <footer className="mt-16 border-t border-border pt-5 text-xs leading-relaxed text-muted-foreground">
        Dimmi quale, e in quale tema l&apos;hai guardato. Poi lo porto sul prodotto vero in un colpo solo: i
        caratteri stanno in un file, e le tre variabili che cambiano con loro stanno in dieci righe di foglio
        di stile.
      </footer>
    </main>
  );
}
