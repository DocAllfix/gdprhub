import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download } from "lucide-react";
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

      <div className="mt-6">
        <ElencoRegistro
          aziendaId={id}
          def={def}
          voci={voci}
          legami={legami}
          modificabile={ctx.ruolo !== "viewer"}
        />
      </div>
    </div>
  );
}
