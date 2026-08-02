import type { Metadata } from "next";
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

      {finestre ? (
        <div
          className="mt-6 grid gap-px overflow-hidden rounded-md border border-border bg-border sm:grid-cols-2 lg:grid-cols-4"
          data-tour="indicatori-scadenzario"
        >
          <Indicatore
            valore={finestre.scadute.length}
            etichetta="già scadute"
            nota="intervento immediato"
            tinta={finestre.scadute.length > 0 ? "text-scaduta" : undefined}
          />
          <Indicatore
            valore={finestre.entro7.length}
            etichetta="entro sette giorni"
            nota="questa settimana"
            tinta={finestre.entro7.length > 0 ? "text-imminente" : undefined}
          />
          <Indicatore valore={finestre.entro30.length} etichetta="entro trenta giorni" nota="questo mese" />
          <Indicatore
            valore={finestre.entro90.length}
            etichetta="entro novanta giorni"
            nota="da programmare"
          />
        </div>
      ) : null}

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

function Indicatore({
  valore,
  etichetta,
  nota,
  tinta,
}: {
  valore: number;
  etichetta: string;
  nota: string;
  tinta?: string | undefined;
}) {
  return (
    <div className="bg-surface p-4">
      <p className={`cifra text-[1.75rem] ${tinta ?? ""}`}>{valore}</p>
      <p className="text-xs text-muted-foreground">{etichetta}</p>
      <p className="mt-1.5 text-[10px] text-faint-foreground">{nota}</p>
    </div>
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
