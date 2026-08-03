import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CalendarClock } from "lucide-react";
import { ETICHETTE_DOMINIO } from "@gdpr/engine";
import { scadenzario } from "@/features/scadenzario/dati";
import { TabellaScadenzario } from "@/components/scadenzario/tabella";

export const metadata: Metadata = { title: "Scadenzario" };
export const dynamic = "force-dynamic";

export default async function PaginaScadenzario() {
  const { voci, senzaData, aziende, finestre } = await scadenzario();

  return (
    <div className="mx-auto max-w-[1600px] px-6 py-8">
      <header>
        <p className="text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">Scadenzario</p>
        <h1 className="titolo mt-1.5 text-[1.7rem]">Cosa scade, su tutto il portafoglio</h1>
        <p className="mt-1.5 max-w-prose text-sm text-muted-foreground">
          Una lista sola sui tre decreti e su tutte le aziende. Un consulente non pensa «oggi faccio GDPR»:
          pensa «cosa scade questa settimana». Finora doveva aprire tre strumenti e incrociare a mano.
        </p>
      </header>

      {finestre ? <FasciaOrizzonte finestre={finestre} /> : null}

      <div className="mt-6">
        {voci.length === 0 && senzaData.length === 0 ? (
          <Vuoto />
        ) : (
          // `useSearchParams` richiede un confine di sospensione.
          <Suspense fallback={<p className="text-sm text-muted-foreground">Caricamento…</p>}>
            <TabellaScadenzario voci={voci} aziende={aziende} />
          </Suspense>
        )}
      </div>

      {senzaData.length > 0 ? (
        <section className="mt-8">
          <h2 className="text-sm font-semibold tracking-tight">Senza una data · {senzaData.length}</h2>
          <p className="mt-1 mb-3 max-w-prose text-sm text-muted-foreground">
            Presidi permanenti e adempimenti mai programmati. Non appartengono a un&apos;agenda — nessuno può
            chiuderli entro una data — ma non sono nemmeno in regola: sono cose da impostare.
          </p>
          <ul className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
            {senzaData.slice(0, 24).map((v) => (
              <li
                key={`${v.aziendaId}-${v.dominio}-${v.codice}`}
                className="flex items-baseline gap-2 rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs"
              >
                <span className="font-mono text-[10px] text-faint-foreground">
                  {ETICHETTE_DOMINIO[v.dominio].breve} {v.codice}
                </span>
                <span className="min-w-0 flex-1 truncate">{v.titolo}</span>
                <span className="truncate text-[10px] text-muted-foreground">{v.azienda}</span>
              </li>
            ))}
          </ul>
          {senzaData.length > 24 ? (
            <p className="mt-2 text-xs text-faint-foreground">
              e altri {senzaData.length - 24}. L&apos;elenco completo è nell&apos;assessment di ciascun
              modulo.
            </p>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

/**
 * LA FASCIA DELL'ORIZZONTE, al posto di quattro riquadri in fila.
 *
 * Quattro riquadri identici sono quattro numeri messi vicini: per sapere se le scadute
 * sono tante bisogna leggerle tutte e dividerle a mente. Qui la fascia è un ASSE DEL
 * TEMPO — la posizione orizzontale è quando — e la LARGHEZZA di ogni finestra è quanto
 * lavoro contiene. Si legge prima di leggere: se il rosso occupa un terzo della barra,
 * un terzo del problema è già in ritardo, e lo si sa senza aver letto una cifra.
 *
 * C'è l'ancora «oggi». Senza, un asse è solo una barra colorata e nessuno sa da che parte
 * sta il passato.
 *
 * Le finestre del motore sono CUMULATIVE — «entro 30» contiene «entro 7» — e qui servono
 * incrementali, altrimenti le larghezze conterebbero due volte gli stessi adempimenti e
 * la barra mentirebbe proprio nella cosa che deve dire.
 *
 * Ogni fascia resta un collegamento: la finestra è anche il filtro dello scadenzario, e
 * chi vede il rosso largo ci clicca sopra.
 */
function FasciaOrizzonte({
  finestre,
}: {
  finestre: {
    readonly scadute: readonly unknown[];
    readonly entro7: readonly unknown[];
    readonly entro30: readonly unknown[];
    readonly entro90: readonly unknown[];
  };
}) {
  const fasce = [
    {
      e: "scadute",
      nota: "intervento immediato",
      n: finestre.scadute.length,
      k: "bg-scaduta",
      t: "text-scaduta",
      q: "scadute",
    },
    {
      e: "entro 7 giorni",
      nota: "questa settimana",
      n: finestre.entro7.length,
      k: "bg-imminente",
      t: "text-imminente",
      q: "7",
    },
    {
      e: "entro 30",
      nota: "questo mese",
      n: finestre.entro30.length - finestre.entro7.length,
      k: "bg-foreground/40",
      t: "",
      q: "30",
    },
    {
      e: "entro 90",
      nota: "da programmare",
      n: finestre.entro90.length - finestre.entro30.length,
      k: "bg-border-strong",
      t: "",
      q: "90",
    },
  ].map((f) => ({ ...f, n: Math.max(0, f.n) }));

  const totale = fasce.reduce((s, f) => s + f.n, 0);
  if (totale === 0) return null;

  return (
    <section className="pannello mt-6 p-5" data-tour="indicatori-scadenzario">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold tracking-tight">Orizzonte di novanta giorni</h2>
          <p className="mt-0.5 text-[11px] text-faint-foreground">
            La larghezza è quanto lavoro contiene ogni fascia, non quanto dura.
          </p>
        </div>
        <p className="text-[11px] text-muted-foreground">
          <span className="cifra text-lg text-foreground">{totale}</span> adempimenti da presidiare
        </p>
      </div>

      <div className="mt-4 flex overflow-clip rounded-lg">
        {fasce
          .filter((f) => f.n > 0)
          .map((f) => (
            <Link
              key={f.e}
              href={`/scadenzario?finestra=${f.q}`}
              style={{ width: `${(f.n / totale) * 100}%` }}
              className="group border-r border-surface last:border-0"
            >
              <span className={`block h-1.5 ${f.k}`} />
              <span className="block bg-surface-sunken px-2.5 py-2 group-hover:bg-surface-raised">
                <span className={`cifra block text-xl ${f.t}`}>{f.n}</span>
                <span className="block truncate text-[10px] text-muted-foreground">{f.e}</span>
              </span>
            </Link>
          ))}
      </div>

      <div className="mt-1.5 flex text-[10px] text-faint-foreground">
        <span style={{ width: `${(fasce[0]!.n / totale) * 100}%` }}>passato</span>
        <span className="relative -ml-3 text-foreground">
          <span className="mr-1 inline-block h-2 w-px bg-foreground align-middle" aria-hidden />
          oggi
        </span>
        <span className="ml-auto">+90 giorni</span>
      </div>
    </section>
  );
}

function Vuoto() {
  return (
    <div className="rounded-md border border-dashed border-border-strong bg-surface px-6 py-16 text-center">
      <CalendarClock className="mx-auto size-6 text-faint-foreground" aria-hidden />
      <h2 className="mt-3 text-sm font-semibold">Nessuna scadenza da presidiare</h2>
      <p className="mx-auto mt-1.5 max-w-md text-sm text-muted-foreground">
        Lo scadenzario si popola quando le aziende hanno moduli attivi con adempimenti censiti.
      </p>
    </div>
  );
}
