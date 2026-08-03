import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { datiSimulatore } from "@/features/simulatore/dati";
import { Simulatore } from "@/components/simulatore/pannello";

export const metadata: Metadata = { title: "Simulatore" };
export const dynamic = "force-dynamic";

// IL SIMULATORE, come schermata a sé.
//
// Non è un pannello dentro il cruscotto, e la ragione è che si usa in un momento diverso: il
// cruscotto si guarda per sapere come si sta, il simulatore si apre quando si deve decidere
// cosa fare — spesso davanti a qualcun altro, con un budget da chiedere. Mescolarli
// significherebbe avere una schermata che risponde a due domande e nessuna delle due bene.

export default async function PaginaSimulatore({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const dati = await datiSimulatore(id);
  if (!dati) notFound();

  const { azienda, candidati, partenza } = dati;

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
        <p className="text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
          Simulatore
        </p>
        <h1 className="titolo mt-1.5 text-[1.7rem]">Da dove conviene cominciare</h1>
        <p className="mt-1.5 max-w-prose text-sm text-muted-foreground">
          «Ci sono trentanove adempimenti scaduti» è una constatazione, e chi la ascolta la sapeva
          già. «Con questi cinque interventi l&apos;esposizione scende da {partenza.esposizione} a
          quarantotto» è una frase su cui si decide un budget. Questa schermata serve a costruire
          la seconda.
        </p>
      </header>

      <div className="mt-6">
        <Simulatore aziendaId={id} candidati={candidati} partenza={partenza} />
      </div>
    </div>
  );
}
