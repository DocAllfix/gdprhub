import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CATALOGHI, DOMINI, ETICHETTE_DOMINIO, TUTTI_I_TEMPLATES } from "@gdpr/engine";
import { db } from "@/lib/db";
import { sessioneCorrente } from "@/features/auth/guards";
import { PRODOTTO } from "@/lib/brand";
import { ModuloAccesso } from "./modulo";

export const metadata: Metadata = { title: "Accedi" };
export const dynamic = "force-dynamic";

export default async function PaginaAccesso() {
  const sessione = await sessioneCorrente();
  if (sessione?.user) redirect("/portafoglio");

  const studio = await db.query.organization.findFirst({ columns: { name: true } });
  const nome = studio?.name ?? PRODOTTO.nome;

  return (
    <main className="grid min-h-dvh lg:grid-cols-[1fr_460px]">
      {/* La colonna sinistra non è decorazione e non è un riempitivo: porta il doppio filetto
          della carta intestata e il perimetro reale dei tre decreti, con i conteggi veri del
          catalogo. È lo stesso gesto della copertina del documento, ed è ciò che lega i due
          registri del prodotto. Su schermo stretto sparisce: il modulo viene prima. */}
      <section className="hidden flex-col justify-between border-r border-border-strong bg-surface-sunken px-12 py-10 lg:flex">
        <div className="mx-auto w-full max-w-lg border-t-2 border-b border-foreground pt-2 pb-2.5">
          <p className="text-sm font-semibold tracking-widest uppercase">{nome}</p>
        </div>

        <div className="mx-auto w-full max-w-lg">
          <p className="text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">
            {PRODOTTO.nome}
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">Tre decreti, un registro solo</h1>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            Adempimenti, scadenze ed evidenze in una lista sola. Ogni obbligo porta due stati distinti: quello
            del lavoro, che lo decide una persona, e quello della scadenza, che lo decide la data.
          </p>

          <dl className="mt-8 border-t border-border">
            {DOMINI.map((d) => (
              <div
                key={d}
                className="flex items-baseline justify-between gap-4 border-b border-border-subtle py-2"
              >
                <dt className="text-sm">
                  <span className="font-medium">{ETICHETTE_DOMINIO[d].esteso}</span>
                  <span className="ml-2 font-mono text-[10px] text-faint-foreground">
                    {ETICHETTE_DOMINIO[d].norma}
                  </span>
                </dt>
                <dd className="font-mono text-xs tabular-nums text-muted-foreground">
                  {CATALOGHI[d].length}
                </dd>
              </div>
            ))}
            <div className="flex items-baseline justify-between gap-4 py-2">
              <dt className="text-xs tracking-[0.09em] text-muted-foreground uppercase">
                adempimenti in catalogo
              </dt>
              <dd className="font-mono text-xs font-semibold tabular-nums">{TUTTI_I_TEMPLATES.length}</dd>
            </div>
          </dl>
        </div>

        <p className="mx-auto w-full max-w-lg text-xs text-faint-foreground">
          Istanza dedicata. L&apos;accesso è riservato agli utenti abilitati dallo studio.
        </p>
      </section>

      <section className="flex flex-col justify-center px-6 py-16 sm:px-12">
        <div className="mx-auto w-full max-w-sm">
          <h2 className="text-xl font-semibold tracking-tight">Accedi</h2>
          <p className="mt-1 mb-6 text-sm text-muted-foreground">
            Non esiste registrazione: le utenze le crea l&apos;amministratore dello studio.
          </p>
          <ModuloAccesso studio={nome} />
        </div>
      </section>
    </main>
  );
}
