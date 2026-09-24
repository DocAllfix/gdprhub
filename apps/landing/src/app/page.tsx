import { formattaIt } from "@gdpr/engine";
import { Codice, PastigliaDominio, Scadenza } from "@gdpr/ui/stato";
import { ArrowRight } from "lucide-react";
import { Contatti } from "@/components/contatti";
import { Intestazione } from "@/components/intestazione";
import { Mazzo } from "@/components/mazzo";
import { Matrice } from "@/components/matrice";
import { ModuloRichiesta } from "@/components/modulo-richiesta";
import { Piede } from "@/components/piede";
import { PULSANTE_PIENO, PULSANTE_VUOTO } from "@/components/pulsanti";
import { CAMPIONI, ENTRO_90, ESEMPIO_ASSESSMENT, INCROCIO, PER_DOMINIO, TOTALE } from "@/lib/dati";
import { DATI_STRUTTURATI } from "@/lib/dati-strutturati";
import { DOMANDE } from "@/lib/domande";
import { CONTATTO_POSSIBILE, INGRESSO_DEMO, RICHIESTE_ATTIVE } from "@/lib/sito";

// Statica, rigenerata ogni giorno: i dati della demo sono relativi a oggi (vedi `lib/dati.ts`).
export const revalidate = 86400;

// L'ossatura è quella di evalisdeck, scelta dal committente: eroe a due colonne, fascia numeri
// sul colore del prodotto, sezioni con un blocco di titolo e una griglia, una seconda fascia
// per i passi, domande, chiusura. Il contenuto no: ogni frase è rintracciabile nel prodotto o
// in PRODUCT.md, e ogni numero viene dal motore.

function Occhiello({ children, chiaro = false }: { children: React.ReactNode; chiaro?: boolean }) {
  return (
    <p
      className={`flex items-center gap-3 text-micro font-semibold tracking-widest uppercase ${chiaro ? "text-sidebar-muted" : "text-primary"}`}
    >
      <span className={`h-px w-8 shrink-0 ${chiaro ? "bg-sidebar-muted" : "bg-primary"}`} aria-hidden />
      {children}
    </p>
  );
}

function TitoloSezione({ id, occhiello, titolo, sotto, chiaro = false }: {
  id: string;
  occhiello: string;
  titolo: string;
  sotto?: React.ReactNode;
  chiaro?: boolean;
}) {
  return (
    <div className="affiora max-w-2xl">
      <Occhiello chiaro={chiaro}>{occhiello}</Occhiello>
      <h2 id={id} className="mt-4 text-display-sm font-semibold tracking-tight">
        {titolo}
      </h2>
      {sotto ? (
        <p className={`mt-4 leading-relaxed ${chiaro ? "text-sidebar-muted" : "text-muted-foreground"}`}>{sotto}</p>
      ) : null}
    </div>
  );
}

const PASSI = [
  {
    n: "01",
    titolo: "Segnate lo stato del lavoro",
    testo:
      "Decreto per decreto, adempimento per adempimento. La scadenza non la scrivete: si calcola dalla periodicità e dall'ultima esecuzione.",
    esempio: ESEMPIO_ASSESSMENT
      ? `${ESEMPIO_ASSESSMENT.codice} · ${ESEMPIO_ASSESSMENT.periodicita} → ${ESEMPIO_ASSESSMENT.scadenza ? formattaIt(ESEMPIO_ASSESSMENT.scadenza) : "da programmare"}`
      : null,
  },
  {
    n: "02",
    titolo: "Leggete un'agenda sola",
    testo: "Le scadenze dei tre decreti in un elenco unico, ordinato per data. Non tre calendari da tenere allineati.",
    esempio: `${ENTRO_90} scadenze nei prossimi 90 giorni · azienda d'esempio`,
  },
  {
    n: "03",
    titolo: "Preparate il fascicolo per l'ispezione",
    testo:
      "Uno per organo — Garante privacy, Ispettorato del Lavoro, ASL, Organismo di Vigilanza — con il nome dello studio in copertina e lo stato di ogni adempimento alla data.",
    esempio: "Fascicolo ispettivo · PDF",
  },
] as const;

// Quattro principi, ognuno verificato: PRODUCT.md §1 e §2, l'etichetta di versione del
// catalogo in Impostazioni, e la regola del proprietario in `packages/ui/src/stato.tsx`.
const PRINCIPI = [
  {
    titolo: "Due assi, sempre distinti",
    testo:
      "Lo stato del lavoro e lo stato della scadenza non si fondono mai in un campo solo. Un campo solo, su «Completata e scaduta», mente.",
  },
  {
    titolo: "Il colore è un dato",
    testo:
      "Rosso, ambra e verde dicono soltanto lo stato della scadenza. Non decorano niente: quando li vedete, significano qualcosa.",
  },
  {
    titolo: "Un catalogo con una versione",
    testo: "L'elenco degli adempimenti ha un'etichetta di versione, e ogni installazione dichiara su quale sta lavorando.",
  },
  {
    titolo: "Un proprietario per adempimento",
    testo:
      "Se un adempimento serve a più decreti, lo possiede uno solo. Gli altri lo leggono con il codice e il colore del proprietario, e non possono modificarlo.",
  },
] as const;

const DISTRIBUZIONE = [
  ["Nessuna registrazione pubblica", "Le utenze le crea lo studio, per invito, con ruoli distinti."],
  ["Secondo fattore", "Codice a sei cifre da un'app di autenticazione, più codici di recupero."],
  ["Il nome dello studio in copertina", "Nella barra laterale, in copertina e a piè di pagina di ogni fascicolo."],
  ["Dove gira, si decide insieme", "Su un nostro server o su una macchina vostra, prima di cominciare."],
] as const;

export default function Pagina() {
  // Una costante locale resta ristretta anche dentro `map`; quella del modulo no.
  const incrocio = INCROCIO;
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(DATI_STRUTTURATI) }} />
      <Intestazione />
      <main>
        {/* ================================================================== EROE */}
        <section aria-labelledby="titolo" className="border-b">
          <div className="mx-auto grid w-full max-w-6xl items-center gap-16 px-5 py-16 md:py-24 lg:grid-cols-[1.05fr_1fr]">
            <div>
              <Occhiello>GDPR · D.Lgs 231/2001 · D.Lgs 81/2008</Occhiello>
              {/* L'LCP della pagina: testo, mai dentro un'animazione. */}
              <h1 id="titolo" className="mt-6 text-display leading-tight font-semibold tracking-tight text-balance">
                Fatto e in regola non sono la stessa cosa.
              </h1>
              <p className="mt-3 text-display-sm font-semibold tracking-tight text-primary">Legisboard li tiene separati.</p>
              <p className="mt-6 max-w-xl leading-relaxed text-muted-foreground">
                Un solo registro per i tre decreti: {TOTALE} adempimenti, e per ognuno due stati distinti — il lavoro,
                che decide una persona, e la scadenza, che decide la data. Un documento redatto a marzo e scaduto a
                settembre smette di sembrare a posto.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <a href={INGRESSO_DEMO} className={PULSANTE_PIENO}>
                  Entra nella demo <ArrowRight className="size-4" aria-hidden />
                </a>
                <a href={CONTATTO_POSSIBILE ? "#richiesta" : "#problema"} className={PULSANTE_VUOTO}>
                  {CONTATTO_POSSIBILE ? "Richiedi una presentazione" : "Guarda il problema"}
                </a>
              </div>
              <p className="mt-4 text-xs text-muted-foreground">
                Un&apos;azienda d&apos;esempio già compilata. Nessuna registrazione: si entra con un clic.
              </p>
            </div>
            <Mazzo />
          </div>
        </section>

        {/* ======================================================= FASCIA NUMERI */}
        {/* Numeri al valore finale nell'HTML: nessun contatore che parte da zero. */}
        <section aria-label="Il catalogo in numeri" className="bg-sidebar text-sidebar-foreground">
          <div className="mx-auto grid w-full max-w-6xl gap-10 px-5 py-14 md:grid-cols-[1fr_1fr_1.3fr]">
            <div>
              <p className="font-mono text-cifra-xl leading-none font-semibold tabular-nums">{TOTALE}</p>
              <p className="mt-3 text-sm font-semibold">adempimenti in un catalogo solo</p>
              <p className="mt-1 text-xs leading-relaxed text-sidebar-muted">con un&apos;etichetta di versione</p>
            </div>
            <div className="md:border-l md:border-sidebar-border md:pl-10">
              <p className="font-mono text-cifra-xl leading-none font-semibold tabular-nums">3</p>
              <p className="mt-3 text-sm font-semibold">decreti letti insieme</p>
              <p className="mt-1 text-xs leading-relaxed text-sidebar-muted">non tre strumenti affiancati</p>
            </div>
            <div className="md:border-l md:border-sidebar-border md:pl-10">
              <p className="text-micro font-semibold tracking-widest text-sidebar-muted uppercase">Riferimenti normativi</p>
              <ul className="mt-4 space-y-2.5">
                {PER_DOMINIO.map((d) => (
                  <li key={d.dominio} className="flex items-baseline justify-between gap-4 border-b border-sidebar-border pb-2.5 text-sm">
                    <span>{d.etichetta.norma}</span>
                    <span className="font-mono tabular-nums text-sidebar-muted">{d.quanti}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ============================================================ IL PROBLEMA */}
        <section id="problema" aria-labelledby="problema-titolo" className="border-b">
          {/* `min-w-0` sulle due colonne: un elemento di griglia ha `min-width: auto` e si allarga
              fino al contenuto. Senza, la tabella della matrice spingeva la colonna a 421 px su
              un telefono da 390, e il contenitore scorrevole attorno non serviva a niente. */}
          <div className="mx-auto grid w-full max-w-6xl gap-12 px-5 py-24 lg:grid-cols-[1fr_1.25fr]">
            <div className="min-w-0">
              <TitoloSezione
                id="problema-titolo"
                occhiello="Il problema"
                titolo="«Completata» e «Scaduta», nella stessa riga."
              />
              <div className="affiora mt-6 max-w-xl space-y-4 leading-relaxed text-muted-foreground">
                <p>
                  Ogni adempimento ha due stati. Lo stato del lavoro lo decide una persona: da fare, in corso,
                  completata, non applicabile. Lo stato della scadenza lo decide la data: regolare, in scadenza,
                  scaduta, da programmare.
                </p>
                <p>
                  <strong className="font-semibold text-foreground">Completata e scaduta</strong> è la situazione più
                  frequente e la più pericolosa: il documento fu redatto, il ciclo è scaduto. Uno strumento che tiene
                  un campo solo, in quel campo scrive «completata».
                </p>
                <p>Legisboard li tiene su due assi. Scegliete una cella: sono i numeri veri dell&apos;azienda d&apos;esempio.</p>
              </div>
            </div>
            <div className="affiora min-w-0">
              <Matrice />
            </div>
          </div>
        </section>

        {/* ======================================================== I TRE DECRETI */}
        <section id="decreti" aria-labelledby="decreti-titolo" className="border-b">
          <div className="mx-auto w-full max-w-6xl px-5 py-24">
            <TitoloSezione
              id="decreti-titolo"
              occhiello="I tre decreti"
              titolo="Tre decreti, un registro."
              sotto="Gli adempimenti dei tre decreti stanno nello stesso catalogo e nella stessa agenda. Dove uno serve a più decreti, lo si registra una volta sola."
            />
            {/* Una superficie sola divisa da un filetto, non tre schede uguali: DESIGN.md. */}
            <div className="affiora mt-12 grid overflow-hidden rounded-lg border bg-surface md:grid-cols-3">
              {PER_DOMINIO.map((d, i) => (
                <div key={d.dominio} className={`min-w-0 p-6 ${i > 0 ? "border-t md:border-t-0 md:border-l" : ""}`}>
                  <div className="flex items-center justify-between gap-3">
                    <PastigliaDominio dominio={d.dominio} />
                    <span className="text-xs text-muted-foreground">{d.etichetta.norma}</span>
                  </div>
                  <h3 className="mt-4 text-sm font-semibold">{d.etichetta.esteso}</h3>
                  <p className="mt-2 font-mono text-cifra leading-none tabular-nums">{d.quanti}</p>
                  <p className="text-xs text-muted-foreground">adempimenti</p>
                  <ul className="mt-5 space-y-2 border-t pt-4">
                    {CAMPIONI[d.dominio].map((c) => (
                      <li key={c.codice} className="flex gap-3 text-sm">
                        <Codice codice={c.codice} />
                        <span className="min-w-0 truncate">{c.titolo}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {incrocio ? (
              <div className="affiora mt-8 rounded-lg border bg-surface-sunken p-5">
                <p className="text-micro font-semibold tracking-widest text-muted-foreground uppercase">
                  Un adempimento, più letture
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                  <PastigliaDominio dominio={incrocio.dominio} />
                  <Codice codice={incrocio.codice} />
                  <span className="min-w-0 flex-1 truncate font-medium">{incrocio.titolo}</span>
                  <Scadenza data={incrocio.scadenza} giorni={incrocio.giorni} statoScadenza={incrocio.statoScadenza} />
                </div>
                <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-muted-foreground">
                  alimenta
                  {incrocio.usi.map((u) => (
                    <span key={`${u.dominio}:${u.codice}`} className="flex items-center gap-1.5">
                      <PastigliaDominio dominio={u.dominio} />
                      <Codice codice={u.codice} origine={incrocio.dominio} />
                    </span>
                  ))}
                </p>
              </div>
            ) : null}
          </div>
        </section>

        {/* ========================================================= COME FUNZIONA */}
        <section id="come-funziona" aria-labelledby="come-titolo" className="bg-sidebar text-sidebar-foreground">
          <div className="mx-auto w-full max-w-6xl px-5 py-24">
            <TitoloSezione
              id="come-titolo"
              occhiello="Come funziona"
              titolo="Tre gesti. Le date le calcola il motore."
              chiaro
            />
            <ol className="mt-12 grid gap-px overflow-hidden rounded-lg border border-sidebar-border bg-sidebar-border md:grid-cols-3">
              {PASSI.map((p) => (
                <li key={p.n} className="affiora flex flex-col bg-sidebar p-6">
                  <span className="font-mono text-sm text-sidebar-muted">{p.n}</span>
                  <h3 className="mt-3 font-semibold">{p.titolo}</h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-sidebar-muted">{p.testo}</p>
                  {p.esempio ? (
                    <p className="mt-5 border-t border-sidebar-border pt-3 font-mono text-xs">{p.esempio}</p>
                  ) : null}
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ============================================================ IL METODO */}
        <section id="metodo" aria-labelledby="metodo-titolo" className="border-b">
          <div className="mx-auto w-full max-w-6xl px-5 py-24">
            <TitoloSezione id="metodo-titolo" occhiello="Il metodo" titolo="Quattro regole che il prodotto non piega." />
            <ol className="mt-12 grid gap-x-12 gap-y-10 md:grid-cols-2">
              {PRINCIPI.map((p, i) => (
                <li key={p.titolo} className="affiora grid grid-cols-[auto_1fr] gap-x-5">
                  <span className="font-mono text-sm text-muted-foreground tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                  <div>
                    <h3 className="font-semibold">{p.titolo}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.testo}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ========================================================= DISTRIBUZIONE */}
        {/* Nessun prezzo: decisione del committente del 2026-09-24. */}
        <section id="distribuzione" aria-labelledby="distribuzione-titolo" className="border-b bg-surface-sunken">
          <div className="mx-auto grid w-full max-w-6xl gap-12 px-5 py-24 lg:grid-cols-[1fr_1.2fr]">
            <div>
              <TitoloSezione
                id="distribuzione-titolo"
                occhiello="Distribuzione"
                titolo="Un'installazione per studio."
                sotto="Legisboard non è un servizio a cui ci si iscrive. Ogni studio ha la propria installazione, con il proprio database, e l'accordo si fa di persona."
              />
              <div className="affiora mt-8 flex flex-wrap gap-3">
                <a href={CONTATTO_POSSIBILE ? "/?motivo=appuntamento#richiesta" : INGRESSO_DEMO} className={PULSANTE_PIENO}>
                  {CONTATTO_POSSIBILE ? "Fissa un appuntamento" : "Entra nella demo"}
                </a>
              </div>
            </div>
            <dl className="affiora grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2">
              {DISTRIBUZIONE.map(([titolo, testo]) => (
                <div key={titolo} className="bg-surface p-6">
                  <dt className="font-semibold">{titolo}</dt>
                  <dd className="mt-2 text-sm leading-relaxed text-muted-foreground">{testo}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* ============================================================== DOMANDE */}
        <section id="domande" aria-labelledby="domande-titolo" className="border-b">
          <div className="mx-auto grid w-full max-w-6xl gap-12 px-5 py-24 lg:grid-cols-[1fr_1.6fr]">
            <TitoloSezione
              id="domande-titolo"
              occhiello="Domande"
              titolo="Le risposte che chiedereste al telefono."
            />
            <div className="affiora divide-y rounded-lg border bg-surface">
              {DOMANDE.map((d) => (
                <details key={d.domanda} className="group px-5">
                  <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-4 font-medium">
                    {d.domanda}
                    <span
                      aria-hidden
                      className="font-mono text-muted-foreground motion-safe:transition-transform group-open:rotate-45"
                    >
                      +
                    </span>
                  </summary>
                  <p className="pb-5 text-sm leading-relaxed text-muted-foreground">{d.risposta}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ============================================================= RICHIESTA */}
        {RICHIESTE_ATTIVE ? <ModuloRichiesta /> : <Contatti />}

        {/* ============================================================= CHIUSURA */}
        <section aria-labelledby="chiusura-titolo">
          <div className="mx-auto flex w-full max-w-6xl flex-col items-start gap-6 px-5 py-24 md:flex-row md:items-center md:justify-between">
            <h2 id="chiusura-titolo" className="max-w-xl text-display-sm font-semibold tracking-tight text-balance">
              Il modo più rapido per capirlo è entrarci.
            </h2>
            <a href={INGRESSO_DEMO} className={PULSANTE_PIENO}>
              Entra nella demo <ArrowRight className="size-4" aria-hidden />
            </a>
          </div>
        </section>
      </main>
      <Piede />
    </>
  );
}
