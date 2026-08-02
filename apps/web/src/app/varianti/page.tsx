import type { Metadata } from "next";
import { datiVarianti } from "./dati";
import { VarianteEditoriale, VarianteSchede, VarianteTerminale } from "./varianti";

export const metadata: Metadata = { title: "Tre direzioni di design" };

// Vetrina di scelta. Tre direzioni sugli STESSI numeri, una sotto l'altra.
//
// Serve a decidere guardando invece che descrivendo: il committente apre un link, scorre, e
// dice un numero. Poi quella direzione si propaga a tutte le schermate.
//
// Non è dietro l'accesso e non tocca il database: i dati vengono dal motore, così la pagina
// si apre subito e da qualunque dispositivo. È una pagina di lavoro, e sparisce quando la
// scelta è fatta.

const DIREZIONI = [
  {
    n: 1,
    nome: "Terminale",
    riferimenti: "Bloomberg · Datadog · Retool",
    idea: "Massima densità. Tutto monospaziato, griglia di filetti, spigoli vivi, nessun riquadro: la struttura la fanno le linee. Sei aziende e diciotto letture stanno in mezzo schermo.",
    perche:
      "Chi guarda quaranta clienti sei ore al giorno smette di leggere e comincia a scansionare. Questa è la densità massima prima che diventi illeggibile.",
    contro: "Chi apre per la prima volta è sopraffatto, e non perdona errori di allineamento.",
  },
  {
    n: 2,
    nome: "Schede",
    riferimenti: "Attio · Linear · Height",
    idea: "Pannelli sollevati con spazio interno generoso, angoli tondi, gerarchia fatta di superfici invece che di linee. Ogni cosa ha il suo contenitore.",
    perche:
      "È il linguaggio che oggi legge come «prodotto moderno e curato». Regge bene il primo sguardo e si spiega da solo.",
    contro:
      "Costa spazio: le stesse sei aziende occupano il doppio, e su quaranta clienti si scorre parecchio.",
  },
  {
    n: 3,
    nome: "Editoriale",
    riferimenti: "Stripe · registro catastale · la nostra perizia",
    idea: "Cifre grandi in serif, filetti al posto delle scatole, doppia riga in testa come una carta intestata. La pagina somiglia al documento che il consulente consegna.",
    perche:
      "È l'unica delle tre che nessun concorrente ha, e lega la schermata alla perizia: stesso carattere, stesso ritmo. L'autorevolezza sta nella tipografia.",
    contro: "Meno «software» e più «documento». Se il committente vuole sembrare un'app, questa non lo è.",
  },
] as const;

export default function PaginaVarianti() {
  const d = datiVarianti();

  return (
    <main className="mx-auto max-w-[1500px] px-6 py-10">
      <header className="max-w-3xl">
        <p className="text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">
          Scelta di direzione
        </p>
        <h1 className="titolo mt-2 text-3xl">Tre modi di mettere in scena gli stessi numeri</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Sono gli stessi dati dell&apos;applicazione vera: 17%, 0%, 44%, esposizione 71. Cambia solo il
          disegno, così il confronto è fra le direzioni e non fra i contenuti. Scorri, guarda, e dimmi un
          numero: quella direzione la porto su tutte le schermate.
        </p>
      </header>

      <div className="mt-10 space-y-14">
        {DIREZIONI.map((x) => (
          <section key={x.n}>
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b border-border-strong pb-2.5">
              <span className="cifra text-2xl text-muted-foreground">{x.n}</span>
              <h2 className="titolo text-xl">{x.nome}</h2>
              <span className="font-mono text-[11px] text-faint-foreground">{x.riferimenti}</span>
            </div>
            <div className="mt-3 grid gap-x-8 gap-y-1.5 text-xs leading-relaxed md:grid-cols-3">
              <p className="text-muted-foreground">{x.idea}</p>
              <p className="text-muted-foreground">
                <b className="text-foreground">Perché sceglierla. </b>
                {x.perche}
              </p>
              <p className="text-muted-foreground">
                <b className="text-foreground">Cosa ci perdi. </b>
                {x.contro}
              </p>
            </div>

            <div className="mt-5 overflow-hidden rounded-lg border border-border">
              {x.n === 1 ? (
                <VarianteTerminale d={d} />
              ) : x.n === 2 ? (
                <div className="bg-background p-5">
                  <VarianteSchede d={d} />
                </div>
              ) : (
                <VarianteEditoriale d={d} />
              )}
            </div>
          </section>
        ))}
      </div>

      <footer className="mt-14 border-t border-border pt-5 text-xs text-muted-foreground">
        Si può anche prendere il meglio di due: la densità della prima con la testata della terza, per
        esempio. Dimmi cosa funziona e cosa no, non serve che scegliere una intera.
      </footer>
    </main>
  );
}
