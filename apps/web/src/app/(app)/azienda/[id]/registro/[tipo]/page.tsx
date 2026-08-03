import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download, Link2 } from "lucide-react";
import { legamiDa, registroPerTipo } from "@gdpr/engine";
import { registroDi } from "@/features/registri/dati";
import { ElencoRegistro } from "@/components/registri/elenco";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ tipo: string }> }): Promise<Metadata> {
  const { tipo } = await params;
  return { title: registroPerTipo(tipo)?.nome ?? "Registro" };
}

// UNA PAGINA PER UNDICI REGISTRI.
//
// Il tipo sta nell'indirizzo e la definizione arriva dal motore: campi, norma, termine e
// scopo si leggono da lì. Undici pagine scritte a mano sarebbero undici posti in cui il
// testo di una norma resta indietro rispetto al motore, e la norma è l'unica cosa che qui
// non può essere approssimativa.

export default async function PaginaRegistro({ params }: { params: Promise<{ id: string; tipo: string }> }) {
  const { id, tipo } = await params;
  const dati = await registroDi(id, tipo);
  if (!dati) notFound();

  const { azienda, def, voci, ctx, moduliAttivi } = dati;
  const legami = legamiDa(tipo, moduliAttivi);

  return (
    <div className="mx-auto max-w-[1100px] px-6 py-6">
      <Link
        href={`/azienda/${id}`}
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        {azienda.nome}
      </Link>

      <header className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">Registro</p>
          <h1 className="titolo mt-1.5 text-[1.7rem]">{def.nome}</h1>
        </div>
        {/* L'art. 30.3 chiede il registro «in forma scritta, anche in formato elettronico»:
            tenerlo e non saperlo consegnare sarebbe metà lavoro. Il cancello visivo salta
            questo collegamento perché è uno scaricamento, non una navigazione. */}
        <a
          href={`/azienda/${id}/registro/${tipo}/esporta`}
          data-cancello="salta"
          className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-xs hover:bg-accent"
        >
          <Download className="size-3.5" aria-hidden />
          Esporta
        </a>
      </header>

      {/* IL FATTO È UNO, I DECRETI SONO DUE.
          Il prototipo del committente annotava «Coordinamento DPO-OdV 72h» a margine di
          una riga: una nota su un foglio, che non avvisa nessuno. Qui l'avviso compare
          dove serve e solo se l'altro modulo è attivo — su un'azienda senza modello 231
          sarebbe rumore su un obbligo che quell'azienda non ha. Non apre niente da sé:
          un atto che nessuno ha scritto, con una data che nessuno ha deciso, sarebbe
          magia, e il gesto resta di chi ne risponde. */}
      {legami.length > 0 ? (
        <div className="mt-5 space-y-2">
          {legami.map((l) => {
            const dove = registroPerTipo(l.a);
            return (
              <div key={l.a} className="pannello flex flex-wrap items-start gap-3 p-4">
                <Link2 className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-relaxed">{l.avviso}</p>
                  <p className="mt-1 font-mono text-[10px] text-faint-foreground">{l.norma}</p>
                </div>
                <Link
                  href={`/azienda/${id}/registro/${l.a}`}
                  className="shrink-0 rounded-md border border-border px-3 py-1.5 text-xs hover:bg-accent"
                >
                  {dove?.nome ?? l.a}
                </Link>
              </div>
            );
          })}
        </div>
      ) : null}

      <div className="mt-6">
        <ElencoRegistro aziendaId={id} def={def} voci={voci} modificabile={ctx.ruolo !== "viewer"} />
      </div>
    </div>
  );
}
