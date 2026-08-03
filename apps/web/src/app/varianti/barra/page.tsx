import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { datiVarianti } from "../dati";
import { Cruscotto } from "../schede/schermate";
import { AssessmentEvoluto, ScadenzarioEvoluto } from "../schede/due-schermate";
import { InterruttoreTema } from "../schede/tema";
import { CSS_TINTE } from "../colori/tinte";
import { GuscioVariabile } from "./gusci";

export const metadata: Metadata = { title: "Tre barre laterali" };

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

const FORME = [
  {
    id: "binario" as const,
    nome: "Binario",
    frase: "La colonna non prende i pixel che non merita.",
    perche:
      "Sessanta pixel fissi, sole icone, etichetta che esce al passaggio. Sparisce anche la preferenza da ricordare, perché non c'è più niente da aprire o chiudere: è una decisione in meno per chi usa il prodotto e uno stato in meno da salvare. I centosettanta pixel recuperati vanno alla tabella, e il contenuto prende in cambio una testata vera con briciole, ricerca e azione principale.",
    costo:
      "Un binario di sole icone è un indovinello finché non ci si passa sopra. Chi apre il prodotto due volte al mese non indovina, e cinque icone di navigazione documentale si somigliano tutte.",
  },
  {
    id: "contesto" as const,
    nome: "Contesto",
    frase: "La colonna se li guadagna.",
    perche:
      "Se la colonna prende il sedici per cento dello schermo deve restituire qualcosa. Qui porta l'azienda su cui si sta lavorando — con i tre moduli e la conformità — e le prossime scadenze vive. Il cambio cliente è il comando che un consulente usa più di ogni altro, venti volte al giorno: metterlo in un menù sepolto è la scelta sbagliata più comune in questi strumenti. Smette di essere navigazione e diventa un pannello di lavoro.",
    costo:
      "È la più larga delle tre e l'unica che continua ad avere un pulsante per ridurla. E una barra che porta dati è una barra che va tenuta aggiornata: se le tre scadenze in fondo sono stantie, l'intero pannello perde credito.",
  },
  {
    id: "testata" as const,
    nome: "Testata",
    frase: "Identità e ricerca escono dalla colonna.",
    perche:
      "Marchio, ricerca globale e utente vanno in una fascia in alto, che è dove tutti li cercano. Alla colonna resta solo la navigazione, quindi può essere stretta, chiara e silenziosa: qui è carta come il contenuto e il peso lo porta la fascia. La ricerca al centro in alto è larga il doppio di quella che sta in una colonna, e in questo prodotto la ricerca è il secondo comando dopo il cambio cliente.",
    costo:
      "Ruba una fascia in altezza a ogni schermata, e l'altezza è la dimensione scarsa su un portatile. Ed è la disposizione più vicina a un sito: la colonna chiara accanto al contenuto chiaro perde quel contrasto che fa leggere la schermata come uno strumento.",
  },
] as const;

const TINTE = [
  { id: "melanzana", nome: "Melanzana" },
  { id: "oliva", nome: "Oliva" },
] as const;

export default function PaginaBarra() {
  const d = datiVarianti();
  const prossime = d.prossime.slice(0, 3).map((p) => ({
    azienda: p.azienda,
    titolo: p.titolo,
    giorni: p.giorni,
  }));

  return (
    <main className={`${geist.variable} ${geistMono.variable} mx-auto max-w-[1600px] px-6 py-8`}>
      <style dangerouslySetInnerHTML={{ __html: CSS_TINTE }} />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <nav className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-faint-foreground">Vai a</span>
          {FORME.map((f) => (
            <a
              key={f.id}
              href={`#${f.id}`}
              className="rounded-lg border border-border bg-surface px-2.5 py-1 hover:bg-surface-raised"
            >
              {f.nome}
            </a>
          ))}
        </nav>
        <InterruttoreTema />
      </div>

      <header className="max-w-3xl">
        <p className="text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">
          Tre barre · melanzana e oliva
        </p>
        <h1 className="titolo mt-2 text-3xl">Quanto vale quella colonna</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Quella di prima era la barra che hanno tutti: marchio in cima, cinque voci, utente in fondo, un
          pulsante per ridurla. Funziona e non dice niente, e soprattutto non risponde alla domanda vera.{" "}
          <b className="text-foreground">
            Duecentotrenta pixel su millequattrocento sono il sedici per cento dello schermo, tolti alla
            tabella per sempre.
          </b>{" "}
          Perché li merita? Tre risposte diverse, e ognuna sposta anche il resto della schermata: una barra
          non si giudica da sola.
        </p>
      </header>

      <section className="mt-6 rounded-xl border border-border bg-surface p-5">
        <h2 className="text-[11px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
          Quale preferisco, visto che me l&apos;hai chiesto
        </h2>
        <div className="mt-3 grid gap-5 lg:grid-cols-2">
          <div>
            <p className="text-sm font-medium">
              Sul colore: <b className="titolo">melanzana</b>.
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              Non per gusto, per un motivo che si può difendere. In questo prodotto{" "}
              <b className="text-foreground">il verde è già occupato</b>: dice «regolare», e lo dice in ogni
              riga di ogni tabella. Oliva è bellissima e ha quarantatré gradi di margine, ma mette un secondo
              verde in una pagina dove il primo verde è un segnale — e quella vicinanza non è un controllo da
              fare una volta, è una convivenza permanente, ovunque.
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              Melanzana confina con la prugna del 231, ma quella è una vicinanza di un tipo diverso: due cose
              distanti trentacinque gradi, con un terzo della croma, di dimensioni e luminosità opposte — una
              lastra scura larga duecento pixel contro una pastiglia di testo. È un controllo da fare una
              volta, e poi è fatto. E hue 307 non significa niente nel sistema, mentre 110 flirta con qualcosa
              che significa.
            </p>
          </div>
          <div>
            <p className="text-sm font-medium">
              Sulla barra: <b className="titolo">contesto</b>, con una riserva.
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              È l&apos;unica delle tre che <b className="text-foreground">risponde alla domanda</b> invece di
              aggirarla. Binario e testata riducono il costo della colonna; contesto le fa fruttare i pixel.
              Il cambio cliente è il comando che un consulente usa più di ogni altro — venti volte al giorno —
              e in questi strumenti sta quasi sempre in un menù sepolto: è l&apos;errore più comune del
              settore, e qui si può non farlo.
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              La riserva: la ricerca globale di «testata» è un pezzo troppo buono per perderlo, e non
              c&apos;entra niente con il resto. <b className="text-foreground">Le due si possono sommare</b> —
              colonna di contesto più la ricerca in una testata sottile sopra il contenuto — e quella, se me
              lo chiedi, è la disposizione che porterei sul prodotto vero.
            </p>
          </div>
        </div>
      </section>

      <div className="mt-10 space-y-16">
        {FORME.map((f) => (
          <div key={f.id} id={f.id} className="scroll-mt-4">
            <div className="-mx-6 mb-5 border-y border-border-strong bg-surface px-6 py-3">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h2 className="titolo text-2xl">{f.nome}</h2>
                <p className="text-sm text-muted-foreground">{f.frase}</p>
              </div>
              <div className="mt-1.5 grid max-w-4xl gap-x-6 gap-y-1 text-xs leading-relaxed md:grid-cols-2">
                <p className="text-muted-foreground">{f.perche}</p>
                <p className="text-faint-foreground">
                  <b className="text-muted-foreground">Costo.</b> {f.costo}
                </p>
              </div>
            </div>

            <div className="space-y-5">
              {TINTE.map((t) => (
                <div key={t.id}>
                  <p className="mb-2 font-mono text-[10px] tracking-[0.09em] text-faint-foreground uppercase">
                    {f.nome} · {t.nome}
                  </p>
                  <div data-tinta={t.id} className="overflow-clip rounded-xl">
                    <GuscioVariabile forma={f.id} prossime={prossime}>
                      <div className="space-y-8">
                        <Cruscotto d={d} />
                        <ScadenzarioEvoluto d={d} />
                        <AssessmentEvoluto d={d} />
                      </div>
                    </GuscioVariabile>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <footer className="mt-16 border-t border-border pt-5 text-xs leading-relaxed text-muted-foreground">
        Tre schermate per ciascuna invece di otto: qui si sta giudicando la barra, e per farlo servono un
        cruscotto, una lista lunga e una schermata di lavoro. Le altre cinque non aggiungono niente alla
        decisione.
      </footer>
    </main>
  );
}
