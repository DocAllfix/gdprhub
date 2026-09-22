import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { relazioniDi } from "@/features/relazioni/dati";
import { ElencoRelazioni } from "@/components/relazioni/elenco";

export const metadata: Metadata = { title: "Relazioni" };
export const dynamic = "force-dynamic";

// LE RELAZIONI DI UN'AZIENDA.
//
// È l'ultimo anello: tutto il resto del prodotto serve a produrre questa pagina. Un
// consulente non vende un cruscotto, vende il documento che porta all'ispezione — e il
// cruscotto è ciò che gli permette di firmarlo sapendo cosa c'è scritto dentro.

export default async function PaginaRelazioni({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const dati = await relazioniDi(id);
  if (!dati) notFound();

  const { azienda, elenco, ctx } = dati;
  const pubblicate = elenco.filter((r) => r.stato === "pubblicata").length;

  return (
    <div className="mx-auto max-w-[1100px] px-6 py-6">
      <Link
        href={`/azienda/${id}`}
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        {azienda.nome}
      </Link>

      <header className="mt-3">
        <p className="text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">Relazioni</p>
        <h1 className="titolo mt-1.5 text-titolo">
          {elenco.length === 0
            ? "Nessuna relazione emessa"
            : `${elenco.length} ${elenco.length === 1 ? "relazione" : "relazioni"}${
                pubblicate > 0 ? `, ${pubblicate} pubblicate` : ""
              }`}
        </h1>
        <p className="mt-1.5 max-w-prose text-sm text-muted-foreground">
          Ogni relazione congela il calcolo del giorno in cui è stata generata. Se i dati cambiano il
          documento non cambia: se ne genera uno nuovo, e i due restano entrambi con il proprio numero. È così
          che funziona un protocollo, ed è la ragione per cui la relazione vale qualcosa davanti a
          un&apos;autorità.
        </p>
      </header>

      <div className="mt-6">
        <ElencoRelazioni aziendaId={id} elenco={elenco} modificabile={ctx.ruolo !== "viewer"} />
      </div>
    </div>
  );
}
