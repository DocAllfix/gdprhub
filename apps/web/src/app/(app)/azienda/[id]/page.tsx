import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText, SlidersHorizontal } from "lucide-react";
import {
  DOMINI,
  ETICHETTE_DOMINIO,
  agenda,
  conformitaEffettiva,
  conteggi,
  descriviPeriodicita,
  esposizione,
  templatePerCodice,
} from "@gdpr/engine";
import { azienda } from "@/features/portafoglio/dati";
import { sommarioRegistri } from "@/features/registri/dati";
import { IndiceRegistri } from "@/components/registri/indice";
import { ModuliAzienda } from "@/components/portafoglio/moduli-azienda";
import { TabellaAdempimenti, type RigaAdempimento } from "@/components/tabella-adempimenti";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const dati = await azienda(id);
  return { title: dati?.azienda.nome ?? "Azienda" };
}

export default async function PaginaAzienda({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [dati, registri] = await Promise.all([azienda(id), sommarioRegistri(id)]);
  if (!dati) notFound();

  const { azienda: a, moduliAttivi, adempimenti, censiti, ctx } = dati;
  const attivi = DOMINI.filter((d) => moduliAttivi.has(d));

  const prossime = agenda(adempimenti).slice(0, 22);
  const righe: RigaAdempimento[] = prossime.map((v) => ({
    ...v,
    titolo: templatePerCodice(v.dominio, v.codice)?.titolo ?? v.codice,
    periodicitaTesto: descriviPeriodicita(v.periodicita),
  }));

  const complessiva = adempimenti.length > 0 ? conformitaEffettiva(adempimenti) : null;
  const esp = adempimenti.length > 0 ? esposizione(adempimenti) : null;
  const c = adempimenti.length > 0 ? conteggi(adempimenti).perScadenza : null;

  return (
    <div className="mx-auto max-w-[1600px] px-6 py-8">
      <Link
        href="/portafoglio"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        Portafoglio
      </Link>

      <header className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="titolo text-[1.7rem]">{a.nome}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {[a.settore, a.sede, a.piva ? `P.IVA ${a.piva}` : null].filter(Boolean).join(" · ") ||
              "Nessun dato anagrafico registrato."}
          </p>
        </div>
        {complessiva?.percentuale !== null && complessiva !== null ? (
          <div className="text-right">
            <p className="cifra text-[2.1rem]">{complessiva.percentuale}%</p>
            <p className="text-xs text-muted-foreground">
              conformità effettiva · {complessiva.numeratore}/{complessiva.applicabili}
            </p>
            {esp ? (
              <p className="mt-0.5 text-[10px] text-faint-foreground">
                esposizione {esp.indice}/100 · {esp.giudizio.toLowerCase()}
              </p>
            ) : null}
          </div>
        ) : null}
      </header>

      {/* LE RELAZIONI STANNO QUI e non nella barra: vivono per azienda, e questo è il
          contesto in cui esistono. È anche il gesto finale del prodotto — tutto il resto
          serve a produrre il documento che il cliente porta a un'ispezione. */}
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Link
          href={`/azienda/${id}/relazioni`}
          data-tour="vai-relazioni"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
        >
          <FileText className="size-4" aria-hidden />
          Relazioni
        </Link>
        <Link
          href={`/azienda/${id}/simulatore`}
          data-tour="vai-simulatore"
          className="inline-flex items-center gap-2 rounded-md border border-border px-3.5 py-2 text-sm hover:bg-accent"
        >
          <SlidersHorizontal className="size-4" aria-hidden />
          Simulatore
        </Link>
        <p className="max-w-md text-[11px] leading-relaxed text-muted-foreground">
          Il documento che si consegna. Congela i numeri del giorno in cui è generato: se i dati cambiano non
          cambia, se ne genera uno nuovo.
        </p>
      </div>

      <section className="mt-7">
        <h2 className="mb-2.5 text-sm font-semibold tracking-tight">Moduli</h2>
        <ModuliAzienda
          aziendaId={a.id}
          attivi={attivi}
          conteggi={censiti}
          modificabile={ctx.ruolo !== "viewer"}
        />
      </section>

      {attivi.length > 0 ? (
        <section className="mt-8">
          <div className="mb-2.5 flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="text-sm font-semibold tracking-tight">Registri</h2>
            <p className="max-w-xl text-[11px] leading-relaxed text-muted-foreground">
              Gli adempimenti si fanno a scadenza; i registri raccolgono fatti che accadono quando accadono.
              Una violazione dei dati non ha una periodicità: ha 72 ore.
            </p>
          </div>
          <IndiceRegistri aziendaId={a.id} attivi={attivi} sommario={registri} />
        </section>
      ) : null}

      <section className="mt-8">
        <div className="mb-2.5 flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold tracking-tight">Prossime scadenze</h2>
          {attivi.length > 0 ? (
            <p className="text-xs text-muted-foreground">
              Assessment completo:{" "}
              {attivi.map((d, i) => (
                <span key={d}>
                  {i > 0 ? " · " : ""}
                  <Link href={`/azienda/${a.id}/${d}`} className="underline hover:text-foreground">
                    {ETICHETTE_DOMINIO[d].breve}
                  </Link>
                </span>
              ))}
            </p>
          ) : null}
          {c ? (
            <p className="text-xs">
              <span className="text-scaduta">{c.Scaduta} scadute</span>
              <span className="text-faint-foreground"> · </span>
              <span className="text-imminente">{c["In scadenza"]} in scadenza</span>
              <span className="text-faint-foreground"> · </span>
              <span className="text-regolare">{c.Regolare} regolari</span>
            </p>
          ) : null}
        </div>

        {attivi.length === 0 ? (
          <p className="rounded-md border border-dashed border-border-strong bg-surface px-6 py-10 text-center text-sm text-muted-foreground">
            Nessun modulo attivo. Attivane uno qui sopra per creare gli adempimenti del catalogo.
          </p>
        ) : righe.length === 0 ? (
          <p className="rounded-md border border-dashed border-border-strong bg-surface px-6 py-10 text-center text-sm text-muted-foreground">
            Nessun adempimento con una scadenza da presidiare. I presidi continui e quelli mai programmati non
            compaiono in agenda: appartengono all&apos;assessment, che arriva con la fase successiva.
          </p>
        ) : (
          <TabellaAdempimenti righe={righe} mostraDominio={attivi.length > 1} />
        )}
      </section>

      {attivi.length > 0 ? (
        <p className="mt-4 text-xs text-muted-foreground">
          L&apos;elenco mostra le prime {righe.length} scadenze per urgenza sui moduli attivi (
          {attivi.map((d) => ETICHETTE_DOMINIO[d].breve).join(", ")}). La vista completa con modifica dello
          stato arriva con l&apos;assessment.
        </p>
      ) : null}
    </div>
  );
}
