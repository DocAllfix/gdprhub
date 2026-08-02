import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { datiVarianti } from "../dati";
import { Accesso, Azienda, Cruscotto, Impostazioni, Portafoglio } from "../schede/schermate";
import { AssessmentEvoluto, ScadenzarioEvoluto } from "../schede/due-schermate";
import { InterruttoreTema } from "../schede/tema";
import { Guscio } from "../piano/guscio";
import { BarreAppaiate, BarrePerRuolo, CaricoMensile, Ciambella, TrendOnesto } from "../piano/grafici";
import { CSS_TINTE, TINTE, type Tinta } from "./tinte";
import { Ruota } from "./ruota";

export const metadata: Metadata = { title: "Altre tre tinte" };

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
  { n: 2, nome: "Cruscotto · i grafici" },
  { n: 3, nome: "Portafoglio" },
  { n: 4, nome: "Scadenzario" },
  { n: 5, nome: "Scheda azienda" },
  { n: 6, nome: "Assessment" },
  { n: 7, nome: "Impostazioni" },
  { n: 8, nome: "Accesso" },
] as const;

const SPICCHI = [
  {
    fra: "26 → 67",
    nome: "arancio bruciato",
    nota: "Troppo vicino all'ambra, ed è la zona dove stava «terra» a 78.",
  },
  {
    fra: "67 → 153",
    nome: "Oliva · 110",
    nota: "Quarantatré gradi da entrambi: lo spicchio più largo del cerchio.",
    libero: true,
  },
  {
    fra: "153 → 228",
    nome: "ottanio",
    nota: "È l'accento di sistemacommercialisti, stesso studio. Bruciato in partenza.",
  },
  { fra: "228 → 273", nome: "navy", nota: "È esattamente il colore che hai appena scartato." },
  {
    fra: "273 → 342",
    nome: "Melanzana · 307",
    nota: "Trentaquattro gradi da entrambi. Il più vicino a un vicino.",
    libero: true,
  },
  {
    fra: "342 → 26",
    nome: "bordeaux",
    nota: "Ventidue gradi dal rosso «scaduta» per parte: troppo stretto.",
  },
] as const;

function Tessera({ v, scuro, e }: { v: string; scuro?: boolean | undefined; e: string }) {
  return (
    <div
      className="flex h-12 items-end rounded-lg border border-border p-1.5"
      style={{ background: v }}
    >
      <span
        className="truncate font-mono text-[9px]"
        style={{ color: scuro ? "oklch(0.9 0 0)" : "oklch(0.35 0 0)" }}
      >
        {e}
      </span>
    </div>
  );
}

function Mappa() {
  return (
    <section className="mt-6 rounded-xl border border-border bg-surface p-5">
      <h2 className="text-[11px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
        Quanto spazio resta davvero
      </h2>
      <p className="mt-2 max-w-4xl text-xs leading-relaxed text-muted-foreground">
        Prima di proporne altre tre a caso conviene guardare la mappa, perché lo spazio è meno di quanto
        sembra. <b className="text-foreground">Sei tinte sono occupate e significano qualcosa</b>: tagliano
        il cerchio in sei spicchi, e dentro ogni spicchio si può stare solo al centro — ai bordi la colonna
        comincia a somigliare a un segnale.
      </p>

      <div className="mt-4 flex flex-wrap items-start gap-6">
        <Ruota />
        <ul className="min-w-72 flex-1 space-y-1.5">
          {SPICCHI.map((s) => {
            const libero = "libero" in s && s.libero;
            return (
              <li
                key={s.fra}
                className={`flex gap-3 rounded-lg px-3 py-2 text-xs ${libero ? "bg-surface-sunken" : ""}`}
              >
                <span className="w-16 shrink-0 font-mono text-[10px] text-faint-foreground tabular-nums">
                  {s.fra}
                </span>
                <span className="min-w-0">
                  <b className={libero ? "text-foreground" : "text-muted-foreground"}>{s.nome}</b>
                  <span className="ml-1.5 text-muted-foreground">{s.nota}</span>
                </span>
              </li>
            );
          })}
          <li className="flex gap-3 rounded-lg bg-surface-sunken px-3 py-2 text-xs">
            <span className="w-16 shrink-0 font-mono text-[10px] text-faint-foreground">fuori</span>
            <span className="min-w-0">
              <b className="text-foreground">Grafite</b>
              <span className="ml-1.5 text-muted-foreground">
                Un carbone quasi acromatico non compete con i sei perché non è un colore. Quello spazio è
                sempre libero.
              </span>
            </span>
          </li>
        </ul>
      </div>

      <div className="mt-5 grid gap-4 border-t border-border pt-4 md:grid-cols-3">
        {TINTE.map((t) => (
          <div key={t.id} className="rounded-lg bg-surface-sunken p-3">
            <p className="mb-2 text-[11px] font-medium">
              {t.nome} · <span className="font-mono text-[10px] text-muted-foreground">{t.hue}</span>
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {t.campioni.map((c) => (
                <Tessera key={c.e} v={c.v} scuro={c.scuro} e={c.e} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Grafici({ d }: { d: ReturnType<typeof datiVarianti> }) {
  return (
    <div className="grid gap-3 lg:grid-cols-3">
      <CaricoMensile d={d} />
      <Ciambella d={d} />
      <BarreAppaiate d={d} />
      <BarrePerRuolo d={d} />
      <TrendOnesto />
    </div>
  );
}

function Anteprima({ t }: { t: Tinta }) {
  const d = datiVarianti();
  return (
    <div>
      <div className="-mx-6 mb-5 border-y border-border-strong bg-surface px-6 py-3">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 className="titolo text-2xl">{t.nome}</h2>
          <p className="text-sm text-muted-foreground">{t.frase}</p>
          <span className="ml-auto font-mono text-[10px] text-faint-foreground">{t.hue}</span>
        </div>
        <div className="mt-1.5 grid max-w-4xl gap-x-6 gap-y-1 text-xs leading-relaxed md:grid-cols-2">
          <p className="text-muted-foreground">{t.perche}</p>
          <p className="text-faint-foreground">
            <b className="text-muted-foreground">Costo.</b> {t.costo}
          </p>
        </div>
      </div>

      <div data-tinta={t.id} className="overflow-clip rounded-xl">
        <Guscio>
          <div className="space-y-8">
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
                  <Grafici d={d} />
                ) : x.n === 3 ? (
                  <Portafoglio d={d} />
                ) : x.n === 4 ? (
                  <ScadenzarioEvoluto d={d} />
                ) : x.n === 5 ? (
                  <Azienda d={d} />
                ) : x.n === 6 ? (
                  <AssessmentEvoluto d={d} />
                ) : x.n === 7 ? (
                  <Impostazioni d={d} />
                ) : (
                  <Accesso />
                )}
              </section>
            ))}
          </div>
        </Guscio>
      </div>
    </div>
  );
}

export default function PaginaColori() {
  return (
    <main className={`${geist.variable} ${geistMono.variable} mx-auto max-w-[1600px] px-6 py-8`}>
      <style dangerouslySetInnerHTML={{ __html: CSS_TINTE }} />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <nav className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-faint-foreground">Vai a</span>
          {TINTE.map((t) => (
            <a
              key={t.id}
              href={`#${t.id}`}
              className="rounded-lg border border-border bg-surface px-2.5 py-1 hover:bg-surface-raised"
            >
              {t.nome}
            </a>
          ))}
        </nav>
        <InterruttoreTema />
      </div>

      <header className="max-w-3xl">
        <p className="text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">
          Altre tre tinte
        </p>
        <h1 className="titolo mt-2 text-3xl">Dove si può ancora andare, e dove no</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Questa volta <b className="text-foreground">la forma resta ferma</b>: angoli, spaziatura e righe
          sono quelli di «quieto» in tutte e tre, così l&apos;unica variabile è il colore e non si finisce a
          scegliere una tinta perché aveva gli angoli più belli. Sotto, la mappa di quanto spazio resta —
          che è meno di quanto sembra, e vale la pena vederlo prima di scartare anche queste.
        </p>
      </header>

      <Mappa />

      <div className="mt-10 space-y-16">
        {TINTE.map((t) => (
          <div key={t.id} id={t.id} className="scroll-mt-4">
            <Anteprima t={t} />
          </div>
        ))}
      </div>

      <footer className="mt-16 border-t border-border pt-5 text-xs leading-relaxed text-muted-foreground">
        Se anche queste non convincono, il problema probabilmente non è la tinta ma la mossa: una colonna
        scura accanto a un foglio chiaro. In quel caso la strada è «carta» della pagina precedente, che la
        colonna scura la toglie del tutto.
      </footer>
    </main>
  );
}
