import { formattaIt } from "@legisboard/engine";
import { Codice, PastigliaDominio, Scadenza } from "@legisboard/ui/stato";
import { ArrowRight } from "lucide-react";
import { Confronto } from "@/components/confronto";
import { Contatti } from "@/components/contatti";
import { Intestazione } from "@/components/intestazione";
import { Mappa } from "@/components/mappa";
import { Matrice } from "@/components/matrice";
import { Mazzo } from "@/components/mazzo";
import { ModuloRichiesta } from "@/components/modulo-richiesta";
import { Piede } from "@/components/piede";
import { PULSANTE_PIENO, PULSANTE_PIENO_SU_OLIVA, PULSANTE_VUOTO_SU_OLIVA } from "@/components/pulsanti";
import { ENTRO_90, ESEMPIO_ASSESSMENT, INCROCIO, TOTALE } from "@/lib/dati";
import { DATI_STRUTTURATI } from "@/lib/dati-strutturati";
import { DOMANDE } from "@/lib/domande";
import { CONTATTO_POSSIBILE, INGRESSO_DEMO, RICHIESTE_ATTIVE } from "@/lib/sito";

// Statica, rigenerata ogni giorno: i dati della demo sono relativi a oggi (vedi `lib/dati.ts`).
export const revalidate = 86400;

// LA SECONDA VERSIONE _(2026-09-24)_, dopo il giudizio del committente: «troppo basic».
//
// La diagnosi, fatta confrontando la pagina con evalisdeck.it ed evalisacademy.it alla stessa
// larghezza: un titolo in Geist semibold che non aveva carattere, un mazzo di tre carte bianche
// su avorio senza un punto dove l'occhio si fermasse, e lo STESSO riquadro bianco bordato
// ripetuto in ogni sezione. Sembrava un modello perché era costruita come un modello.
//
// Le mosse, tutte dentro il sistema scelto (Geist, oliva 110, «quieto»):
// - l'eroe è oliva scura, il colore della barra del prodotto: i fogli del mazzo diventano carta
//   su un sottomano verde. Nessuno nel settore usa questo colore; il riflesso sarebbe il blu;
// - il titolo in Geist extrabold, grande, stretto: lo stesso carattere, con il peso che mancava;
// - la fascia «numero grande, etichetta piccola» è sparita: al suo posto il catalogo reso
//   visibile, 171 caselle, con in rosso le completate e scadute;
// - un prima e dopo che vende la tesi in due secondi;
// - niente griglie di riquadri gemelli: numerali grandi per i passi, una scheda tecnica per la
//   distribuzione, e una chiusura oliva che fa coppia con l'eroe.
//
// Scartato di proposito, e scritto perché non ritorni: l'impianto «editoriale» con colonne
// separate da filetti ed etichette in mono. È la corsia estetica più satura del momento, e
// il riferimento ci sta già dentro.

function Occhiello({ children, su = "chiaro" }: { children: React.ReactNode; su?: "chiaro" | "oliva" }) {
  const colore = su === "oliva" ? "text-sidebar-accento" : "text-primary";
  const riga = su === "oliva" ? "bg-sidebar-accento" : "bg-primary";
  return (
    <p className={`flex items-center gap-3 text-micro font-semibold tracking-widest uppercase ${colore}`}>
      <span className={`h-px w-8 shrink-0 ${riga}`} aria-hidden />
      {children}
    </p>
  );
}

function TitoloSezione({ id, occhiello, titolo, sotto }: { id: string; occhiello: string; titolo: string; sotto?: string }) {
  return (
    <div className="affiora max-w-3xl">
      <Occhiello>{occhiello}</Occhiello>
      <h2 id={id} className="mt-5 text-display-sm leading-tight font-extrabold tracking-tight text-balance">
        {titolo}
      </h2>
      {sotto ? <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">{sotto}</p> : null}
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
    esempio: `${ENTRO_90} scadenze nei prossimi 90 giorni, nell'azienda d'esempio`,
  },
  {
    n: "03",
    titolo: "Preparate il fascicolo per l'ispezione",
    testo:
      "Uno per organo (Garante privacy, Ispettorato del Lavoro, ASL, Organismo di Vigilanza), con il nome dello studio in copertina e lo stato di ogni adempimento alla data.",
    esempio: "Fascicolo ispettivo in PDF",
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

const SCHEDA = [
  ["Installazione", "Dedicata allo studio, con il suo database. Non un servizio condiviso a cui ci si iscrive."],
  ["Accessi", "Le utenze le crea lo studio, per invito, con ruoli distinti. Nessuna registrazione pubblica."],
  ["Autenticazione", "Secondo fattore con un'app di autenticazione, più codici di recupero."],
  ["Intestazione", "Il nome dello studio nella barra laterale, in copertina e a piè di pagina di ogni fascicolo."],
  ["Dove gira", "Su un nostro server o su una macchina vostra: si decide insieme, prima di cominciare."],
  ["Acquisto", "Nessun listino online e nessun pagamento dal sito: ogni installazione si concorda."],
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
        <section aria-labelledby="titolo" className="relative overflow-hidden bg-sidebar text-sidebar-foreground">
          <div aria-hidden className="registro pointer-events-none absolute inset-0" />
          <div className="relative mx-auto grid w-full max-w-6xl items-center gap-16 px-5 py-20 md:py-28 lg:grid-cols-[1.1fr_1fr]">
            <div className="min-w-0">
              <Occhiello su="oliva">GDPR · D.Lgs 231/2001 · D.Lgs 81/2008</Occhiello>
              {/* L'LCP della pagina: testo, mai dentro un'animazione. */}
              <h1 id="titolo" className="mt-7 text-display leading-none font-extrabold tracking-tight text-balance">
                Fatto e in regola non sono la stessa cosa.
              </h1>
              <p className="mt-6 text-2xl font-semibold tracking-tight text-sidebar-accento">
                Legisboard li tiene separati.
              </p>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-sidebar-muted">
                Un solo registro per i tre decreti: {TOTALE} adempimenti, e per ognuno due stati distinti. Il lavoro lo
                decide una persona, la scadenza la decide la data. Un documento redatto a marzo e scaduto a settembre
                smette di sembrare a posto.
              </p>
              <div className="mt-10 flex flex-wrap items-center gap-3">
                <a href={INGRESSO_DEMO} className={PULSANTE_PIENO_SU_OLIVA}>
                  Entra nella demo <ArrowRight className="size-4" aria-hidden />
                </a>
                <a href={CONTATTO_POSSIBILE ? "#richiesta" : "#problema"} className={PULSANTE_VUOTO_SU_OLIVA}>
                  {CONTATTO_POSSIBILE ? "Richiedi una presentazione" : "Guarda il problema"}
                </a>
              </div>
              <p className="mt-5 text-sm text-sidebar-muted">
                Un&apos;azienda d&apos;esempio già compilata. Nessuna registrazione: si entra con un clic.
              </p>
            </div>
            <Mazzo />
          </div>
        </section>

        {/* ============================================================ IL PROBLEMA */}
        <section id="problema" aria-labelledby="problema-titolo">
          <div className="mx-auto w-full max-w-6xl px-5 py-24 md:py-32">
            <TitoloSezione
              id="problema-titolo"
              occhiello="Il problema"
              titolo="«Completata» e «Scaduta», nella stessa riga."
              sotto="Ogni adempimento ha due stati. Lo stato del lavoro lo decide una persona; lo stato della scadenza lo decide la data. «Completata e scaduta» è il caso più frequente e il più pericoloso: il documento fu redatto, il ciclo è scaduto."
            />
            <div className="affiora mt-14">
              <Confronto />
            </div>

            <div className="mt-24 grid gap-12 lg:grid-cols-[1fr_1.4fr]">
              <div className="affiora min-w-0">
                <h3 className="text-2xl font-extrabold tracking-tight">Provatelo sui numeri veri.</h3>
                <p className="mt-4 max-w-md leading-relaxed text-muted-foreground">
                  È la matrice dell&apos;azienda d&apos;esempio, lavoro per scadenza. Scegliete una cella: sotto compaiono
                  gli adempimenti che ci stanno dentro.
                </p>
              </div>
              <div className="affiora min-w-0">
                <Matrice />
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================ IL CATALOGO */}
        <section id="decreti" aria-labelledby="decreti-titolo" className="bg-surface-sunken">
          <div className="mx-auto w-full max-w-6xl px-5 py-24 md:py-32">
            <TitoloSezione
              id="decreti-titolo"
              occhiello="Il catalogo"
              titolo={`${TOTALE} adempimenti, un registro.`}
              sotto="I tre decreti stanno nello stesso catalogo e nella stessa agenda. Dove un adempimento serve a più decreti, lo si registra una volta sola."
            />
            <div className="affiora mt-14">
              <Mappa />
            </div>

            {incrocio ? (
              <div className="affiora mt-16 max-w-3xl">
                <h3 className="text-lg font-bold tracking-tight">Un adempimento, più letture.</h3>
                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg bg-surface p-5 text-sm">
                  <PastigliaDominio dominio={incrocio.dominio} />
                  <Codice codice={incrocio.codice} />
                  <span className="min-w-0 flex-1 truncate font-medium">{incrocio.titolo}</span>
                  <Scadenza data={incrocio.scadenza} giorni={incrocio.giorni} statoScadenza={incrocio.statoScadenza} />
                  <span className="flex w-full flex-wrap items-center gap-x-3 gap-y-2 text-xs text-muted-foreground">
                    lo leggono
                    {incrocio.usi.map((u) => (
                      <span key={`${u.dominio}:${u.codice}`} className="flex items-center gap-1.5">
                        <PastigliaDominio dominio={u.dominio} />
                        <Codice codice={u.codice} origine={incrocio.dominio} />
                      </span>
                    ))}
                    con il codice e il colore del proprietario
                  </span>
                </div>
              </div>
            ) : null}
          </div>
        </section>

        {/* ========================================================= COME FUNZIONA */}
        <section id="come-funziona" aria-labelledby="come-titolo">
          <div className="mx-auto w-full max-w-6xl px-5 py-24 md:py-32">
            <TitoloSezione id="come-titolo" occhiello="Come funziona" titolo="Tre gesti. Le date le calcola il motore." />
            <ol className="mt-16 grid gap-14 md:grid-cols-3 md:gap-10">
              {PASSI.map((p) => (
                <li key={p.n} className="affiora">
                  <span className="block text-display leading-none font-extrabold tracking-tight text-primary tabular-nums">
                    {p.n}
                  </span>
                  <h3 className="mt-6 text-xl font-bold tracking-tight">{p.titolo}</h3>
                  <p className="mt-3 leading-relaxed text-muted-foreground">{p.testo}</p>
                  {p.esempio ? <p className="mt-5 font-mono text-sm text-foreground">{p.esempio}</p> : null}
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ============================================================ IL METODO */}
        <section id="metodo" aria-labelledby="metodo-titolo" className="bg-surface-sunken">
          <div className="mx-auto grid w-full max-w-6xl gap-12 px-5 py-24 md:py-32 lg:grid-cols-[1fr_1.5fr]">
            <TitoloSezione id="metodo-titolo" occhiello="Il metodo" titolo="Quattro regole che il prodotto non piega." />
            <ol className="grid gap-x-10 gap-y-12 sm:grid-cols-2">
              {PRINCIPI.map((p, i) => (
                <li key={p.titolo} className="affiora">
                  <span className="text-sm font-bold text-primary tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                  <h3 className="mt-2 text-lg font-bold tracking-tight">{p.titolo}</h3>
                  <p className="mt-2 leading-relaxed text-muted-foreground">{p.testo}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ========================================================= DISTRIBUZIONE */}
        {/* Nessun prezzo: decisione del committente del 2026-09-24. Una scheda tecnica, non una
            griglia di riquadri: chi compra per uno studio legale vuole i dati, in fila. */}
        <section id="distribuzione" aria-labelledby="distribuzione-titolo">
          <div className="mx-auto grid w-full max-w-6xl gap-12 px-5 py-24 md:py-32 lg:grid-cols-[1fr_1.5fr]">
            <div>
              <TitoloSezione
                id="distribuzione-titolo"
                occhiello="Distribuzione"
                titolo="Un'installazione per studio."
                sotto="Legisboard non è un servizio a cui ci si iscrive. L'accordo si fa di persona."
              />
              <div className="affiora mt-8">
                <a href={CONTATTO_POSSIBILE ? "/?motivo=appuntamento#richiesta" : INGRESSO_DEMO} className={PULSANTE_PIENO}>
                  {CONTATTO_POSSIBILE ? "Fissa un appuntamento" : "Entra nella demo"}
                </a>
              </div>
            </div>
            <dl className="affiora">
              {SCHEDA.map(([voce, valore]) => (
                <div key={voce} className="grid gap-1 border-t border-border-strong py-5 sm:grid-cols-[10rem_1fr] sm:gap-6">
                  <dt className="font-bold">{voce}</dt>
                  <dd className="leading-relaxed text-muted-foreground">{valore}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* ============================================================== DOMANDE */}
        <section id="domande" aria-labelledby="domande-titolo" className="bg-surface-sunken">
          <div className="mx-auto grid w-full max-w-6xl gap-12 px-5 py-24 md:py-32 lg:grid-cols-[1fr_1.6fr]">
            <TitoloSezione id="domande-titolo" occhiello="Domande" titolo="Le risposte che chiedereste al telefono." />
            <div className="affiora divide-y divide-border-strong border-y border-border-strong">
              {DOMANDE.map((d) => (
                <details key={d.domanda} className="group">
                  <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-5 text-lg font-semibold">
                    {d.domanda}
                    <span
                      aria-hidden
                      className="text-2xl leading-none text-primary motion-safe:transition-transform group-open:rotate-45"
                    >
                      +
                    </span>
                  </summary>
                  <p className="max-w-2xl pb-6 leading-relaxed text-muted-foreground">{d.risposta}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ============================================================= RICHIESTA */}
        {RICHIESTE_ATTIVE ? <ModuloRichiesta /> : <Contatti />}

        {/* ============================================================= CHIUSURA */}
        {/* Oliva, come l'eroe: la pagina si apre e si chiude sullo stesso colore. */}
        <section aria-labelledby="chiusura-titolo" className="bg-sidebar text-sidebar-foreground">
          <div className="mx-auto flex w-full max-w-6xl flex-col items-start gap-10 px-5 py-24 md:py-32 lg:flex-row lg:items-end lg:justify-between">
            <h2 id="chiusura-titolo" className="max-w-3xl text-display leading-none font-extrabold tracking-tight text-balance">
              Il modo più rapido per capirlo è entrarci.
            </h2>
            <a href={INGRESSO_DEMO} className={PULSANTE_PIENO_SU_OLIVA}>
              Entra nella demo <ArrowRight className="size-4" aria-hidden />
            </a>
          </div>
        </section>
      </main>
      <Piede />
    </>
  );
}
