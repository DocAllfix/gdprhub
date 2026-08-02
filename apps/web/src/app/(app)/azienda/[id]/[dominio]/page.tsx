import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import { DOMINI, ETICHETTE_DOMINIO, type Dominio } from "@gdpr/engine";
import { assessmentDi } from "@/features/assessment/dati";
import { TabellaAssessment } from "@/components/assessment/tabella";

export const dynamic = "force-dynamic";

const eDominio = (v: string): v is Dominio => (DOMINI as readonly string[]).includes(v);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; dominio: string }>;
}): Promise<Metadata> {
  const { dominio } = await params;
  return { title: eDominio(dominio) ? `Assessment ${ETICHETTE_DOMINIO[dominio].breve}` : "Assessment" };
}

export default async function PaginaAssessment({
  params,
}: {
  params: Promise<{ id: string; dominio: string }>;
}) {
  const { id, dominio } = await params;
  if (!eDominio(dominio)) notFound();

  const dati = await assessmentDi(id, dominio);
  if (!dati) notFound();

  const { azienda, attivo, righe, ctx } = dati;
  const etichetta = ETICHETTE_DOMINIO[dominio];

  return (
    <div className="mx-auto max-w-[1600px] px-6 py-6">
      <Link
        href={`/azienda/${id}`}
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        {azienda.nome}
      </Link>

      <header className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
            {etichetta.norma}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{etichetta.esteso}</h1>
        </div>
        {"misure" in dati && dati.misure ? (
          <div className="flex flex-wrap items-end gap-6 text-right">
            <Cifra
              valore={
                dati.misure.effettiva.percentuale === null ? "—" : `${dati.misure.effettiva.percentuale}%`
              }
              etichetta="conformità effettiva"
              nota={`${dati.misure.effettiva.numeratore}/${dati.misure.effettiva.applicabili}`}
            />
            <Cifra
              valore={dati.misure.lavoro.percentuale === null ? "—" : `${dati.misure.lavoro.percentuale}%`}
              etichetta="conformità di lavoro"
              nota={`${dati.misure.lavoro.numeratore}/${dati.misure.lavoro.applicabili}`}
            />
            <Cifra
              valore={String(dati.misure.scadenze.Scaduta)}
              etichetta="scadute"
              nota={`${dati.misure.scadenze["In scadenza"]} in scadenza`}
              tinta={dati.misure.scadenze.Scaduta > 0 ? "text-scaduta" : undefined}
            />
            <Cifra
              valore={`${dati.misure.esposizione.indice}`}
              etichetta="esposizione"
              nota={dati.misure.esposizione.giudizio.toLowerCase()}
            />
          </div>
        ) : null}
      </header>

      <p className="mt-2 max-w-prose text-sm text-muted-foreground">
        Lo stato del lavoro lo decidi tu; lo stato della scadenza lo decide la data. Un adempimento può essere{" "}
        <em>completato</em> e nondimeno <em>scaduto</em>: è la situazione più frequente e la più pericolosa.
      </p>

      <div className="mt-5">
        {!attivo ? (
          <p className="rounded-md border border-dashed border-border-strong bg-surface px-6 py-10 text-center text-sm text-muted-foreground">
            Il modulo {etichetta.breve} non è attivo per questa azienda.{" "}
            <Link href={`/azienda/${id}`} className="underline">
              Attivalo dalla scheda
            </Link>{" "}
            per vedere e lavorare i suoi adempimenti.
          </p>
        ) : righe.length === 0 ? (
          <p className="rounded-md border border-dashed border-border-strong bg-surface px-6 py-10 text-center text-sm text-muted-foreground">
            Nessun adempimento censito per questo modulo.
          </p>
        ) : (
          // `useSearchParams` richiede un confine di sospensione: senza, la pagina
          // rinuncerebbe alla generazione statica di tutto ciò che le sta sopra.
          <Suspense fallback={<p className="text-sm text-muted-foreground">Caricamento…</p>}>
            <TabellaAssessment righe={righe} modificabile={ctx.ruolo !== "viewer"} />
          </Suspense>
        )}
      </div>
    </div>
  );
}

function Cifra({
  valore,
  etichetta,
  nota,
  tinta,
}: {
  valore: string;
  etichetta: string;
  nota: string;
  tinta?: string | undefined;
}) {
  return (
    <div>
      <p className={`text-xl font-semibold tracking-tight tabular-nums ${tinta ?? ""}`}>{valore}</p>
      <p className="text-[10px] text-muted-foreground">{etichetta}</p>
      <p className="font-mono text-[10px] text-faint-foreground">{nota}</p>
    </div>
  );
}
