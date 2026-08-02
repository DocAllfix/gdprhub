import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { datiVarianti } from "../dati";
import { Accesso, Azienda, Cruscotto, Impostazioni, Portafoglio } from "../schede/schermate";
import { AssessmentEvoluto, ScadenzarioEvoluto } from "../schede/due-schermate";
import { InterruttoreTema } from "../schede/tema";
import { AFFINAMENTI, CSS_PIANO, type Affinamento } from "./affinamenti";
import { Guscio } from "./guscio";
import { BarreAppaiate, BarrePerRuolo, CaricoMensile, Ciambella, TrendOnesto } from "./grafici";

export const metadata: Metadata = { title: "Piano · tre affinamenti" };

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

function Anteprima({ a }: { a: Affinamento }) {
  const d = datiVarianti();
  return (
    <div>
      <div className="sticky top-0 z-20 -mx-6 mb-5 border-y border-border-strong bg-background/95 px-6 py-3 backdrop-blur">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 className="titolo text-2xl">{a.nome}</h2>
          <p className="text-sm text-muted-foreground">{a.frase}</p>
          <span className="ml-auto flex gap-3 font-mono text-[10px] text-faint-foreground tabular-nums">
            <span>angolo {a.misure.angolo}</span>
            <span>spazio {a.misure.spaziatura}</span>
            <span>riga {a.misure.riga}</span>
            <span className="text-muted-foreground">{a.misure.righeIn900} righe in 900px</span>
          </span>
        </div>
        <div className="mt-1.5 grid max-w-4xl gap-x-6 gap-y-1 text-xs leading-relaxed md:grid-cols-2">
          <p className="text-muted-foreground">{a.cosaCambia}</p>
          <p className="text-faint-foreground">
            <b className="text-muted-foreground">Costo.</b> {a.costo}
          </p>
        </div>
      </div>

      <div data-piano={a.id} className="overflow-hidden rounded-xl">
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

export default function PaginaPiano() {
  return (
    <main className={`${geist.variable} ${geistMono.variable} mx-auto max-w-[1600px] px-6 py-8`}>
      <style dangerouslySetInnerHTML={{ __html: CSS_PIANO }} />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <nav className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-faint-foreground">Vai a</span>
          {AFFINAMENTI.map((a) => (
            <a
              key={a.id}
              href={`#${a.id}`}
              className="rounded-lg border border-border bg-surface px-2.5 py-1 hover:bg-surface-raised"
            >
              {a.nome}
            </a>
          ))}
        </nav>
        <InterruttoreTema />
      </div>

      <header className="max-w-3xl">
        <p className="text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">
          Piano · tre affinamenti
        </p>
        <h1 className="titolo mt-2 text-3xl">Se non c&apos;è la linea, cosa tiene insieme le righe?</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Piano è deciso, e la faccia è giusta. Resta un nodo solo, ed è quello che ti ho dichiarato
          quando l&apos;ho proposto: la calma si paga in righe visibili. Tre risposte, tre compromessi
          diversi fra la calma e la densità, misurabili in righe che stanno nello schermo. La barra
          laterale è dentro l&apos;anteprima e{" "}
          <b className="text-foreground">si collassa davvero: cliccala in fondo alla colonna</b> e guarda
          come cambia la proporzione. Tutto su entrambi i temi, con numeri propri per ciascuno.
        </p>
      </header>

      <section className="mt-6 rounded-xl border border-border bg-surface p-4">
        <h2 className="text-[11px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
          E i grafici, sì — la schermata 2
        </h2>
        <p className="mt-2 max-w-4xl text-xs leading-relaxed text-muted-foreground">
          I prototipi ne avevano quattro e tre erano giusti. Li ho rifatti tutti a mano in SVG, senza
          librerie: il prototipo 231 si portava dietro 641 KB di Recharts per quattro grafici, ed è una
          delle ragioni per cui era lento. La regola è una e non ammette eccezioni:{" "}
          <b className="text-foreground">
            ogni grafico risponde a una domanda che i numeri accanto non rispondono già
          </b>
          . Un grafico che ridisegna una cifra che sta due centimetri più in là è decorazione, e la
          decorazione in uno strumento di lavoro costa spazio e caricamento senza restituire niente.
        </p>
        <ul className="mt-3 grid gap-x-8 gap-y-2 text-xs leading-relaxed text-muted-foreground md:grid-cols-2">
          {[
            ["Ciambella", "«di che cosa è fatto il totale» — la proporzione fra i quattro stati."],
            [
              "Barre appaiate",
              "«dove si concentra il guasto» — due serie, perché una sola non direbbe se venti adempimenti in una categoria sono un problema o solo tanti.",
            ],
            [
              "Carico dei dodici mesi",
              "«quando mi cade addosso» — dodici colonne impilate per decreto. È il grafico che nei prototipi era FINTO, rifatto nella forma vera.",
            ],
            [
              "Per responsabile",
              "«chi è il collo di bottiglia» — nei prototipi era una torta, e una torta con nove spicchi non si legge.",
            ],
          ].map(([t, s]) => (
            <li key={t} className="flex gap-2">
              <span className="text-faint-foreground">·</span>
              <span>
                <b className="text-foreground">{t}.</b> {s}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 max-w-4xl rounded-lg bg-surface-sunken p-3 text-xs leading-relaxed text-muted-foreground">
          <b className="text-foreground">Il quarto grafico dei prototipi non l&apos;ho rifatto, e ti dico
          perché.</b>{" "}
          Il «trend compliance» a sei mesi era generato da{" "}
          <code className="font-mono text-[11px] text-faint-foreground">62 + i*5 + random()*3</code>: la
          curva saliva sempre perché era scritto che salisse. Un numero inventato dentro una relazione che
          un ispettore può leggere non è un difetto estetico. Il trend vero si disegna dallo storico
          append-only, e finché non c&apos;è storico la scheda dice che non c&apos;è. Al suo posto ho messo
          la domanda che si può rispondere dal primo giorno, ed è anche la più utile delle due: non «come
          sono andato», ma «quando arriva il lavoro».
        </p>
      </section>

      <div className="mt-10 space-y-16">
        {AFFINAMENTI.map((a) => (
          <div key={a.id} id={a.id} className="scroll-mt-4">
            <Anteprima a={a} />
          </div>
        ))}
      </div>

      <footer className="mt-16 border-t border-border pt-5 text-xs leading-relaxed text-muted-foreground">
        Dimmi quale dei tre, in quale tema, e se la barra ti convince aperta o ridotta come stato normale.
        Poi lo porto sul prodotto vero: schermate reali, dati dal database, e i grafici dentro il cruscotto.
      </footer>
    </main>
  );
}
