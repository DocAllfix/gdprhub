import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ArrowLeft, ShieldCheck } from "lucide-react";
import { DOMINI, ETICHETTE_DOMINIO, coperturaReati, templatePerCodice } from "@legisboard/engine";
import { azienda } from "@/features/portafoglio/dati";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Reati presupposto" };

// LA MAPPA DEI REATI PRESUPPOSTO.
//
// Un OdV non ragiona per attività, ragiona per reati. La domanda che si fa in riunione non
// è «quante attività sono aperte»: è «il rischio di corruzione è presidiato?». Un elenco di
// sessantacinque adempimenti non risponde a quella domanda, e la relazione al Consiglio si
// scrive rispondendo a quella domanda.
//
// Il catalogo delle famiglie e il calcolo della copertura stanno nel motore da tempo, con
// le proprie prove, e finivano nel database col seed. Non li vedeva nessuno: mancava la
// schermata, cioè l'unica parte che serviva a un OdV.
//
// NON È L'ELENCO COMPLETO degli artt. 24 – 25-duodevicies, e la pagina lo dice. Contiene le
// famiglie che i tre cataloghi presidiano davvero. Fingere una copertura totale sarebbe la
// bugia più costosa che questo prodotto possa dire, perché è esattamente quella su cui un
// ente si difenderebbe in giudizio.
//
// UN PRESIDIO «COMPLETATO MA SCADUTO» NON PRESIDIA. È la stessa regola che vale ovunque
// qui dentro: la conformità è fatta E ancora valida, e un DVR aggiornato quattro anni fa
// non esonera da nulla ai sensi dell'art. 6.

export default async function PaginaReati({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const dati = await azienda(id);
  if (!dati) notFound();

  const { azienda: a, moduliAttivi, adempimenti } = dati;
  if (!moduliAttivi.has("d231")) notFound();

  const attivi = DOMINI.filter((d) => moduliAttivi.has(d));
  const copertura = coperturaReati(adempimenti, attivi);

  // Le famiglie senza alcun presidio nei moduli attivi non si mescolano alle altre: una
  // riga «— / —» in mezzo alle percentuali si legge come uno zero, e non è uno zero.
  const misurabili = copertura.filter((c) => c.copertura !== null);
  const senzaPresidi = copertura.filter((c) => c.copertura === null);

  const scoperte = misurabili.filter((c) => (c.copertura ?? 100) < 100);
  const conInterdittive = scoperte.filter((c) => c.famiglia.interdittive).length;

  return (
    <div className="mx-auto max-w-[1100px] px-6 py-6">
      <Link
        href={`/azienda/${id}`}
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        {a.nome}
      </Link>

      <header className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <p className="text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
            D.Lgs 231/2001
          </p>
          <h1 className="titolo mt-1.5 text-titolo">Reati presupposto</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Non l&apos;elenco degli adempimenti, ma la domanda che si fa un Organismo di Vigilanza: quali
            famiglie di reato sono presidiate, e da cosa. Un presidio completato ma scaduto non presidia.
          </p>
        </div>
        <div className="text-right">
          <p className={cn("cifra text-cifra leading-none", scoperte.length > 0 && "text-scaduta")}>
            {scoperte.length}
          </p>
          <p className="text-xs text-muted-foreground">
            {scoperte.length === 1 ? "famiglia scoperta" : "famiglie scoperte"} su {misurabili.length}
          </p>
        </div>
      </header>

      {conInterdittive > 0 ? (
        <div className="pannello mt-5 flex flex-wrap items-start gap-3 p-4">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-scaduta" aria-hidden />
          <p className="min-w-0 flex-1 text-sm leading-relaxed">
            <b className="text-scaduta">
              {conInterdittive}{" "}
              {conInterdittive === 1 ? "famiglia scoperta prevede" : "famiglie scoperte prevedono"} sanzioni
              interdittive
            </b>{" "}
            ai sensi dell&apos;art. 9 comma 2: interdizione dall&apos;esercizio dell&apos;attività,
            sospensione o revoca di autorizzazioni, divieto di contrattare con la pubblica amministrazione.
            Sono le conseguenze che fermano un&apos;impresa, e pesano più della sanzione pecuniaria.
          </p>
        </div>
      ) : null}

      <ul className="mt-5 space-y-2" data-tour="reati">
        {misurabili.map((c, i) => {
          const completa = c.copertura === 100;
          return (
            <li
              key={c.famiglia.articolo}
              className="pannello entra p-4"
              style={{ animationDelay: `${Math.min(i, 6) * 45}ms` }}
            >
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                {completa ? (
                  <ShieldCheck className="size-4 shrink-0 text-regolare" aria-hidden />
                ) : (
                  <AlertTriangle className="size-4 shrink-0 text-scaduta" aria-hidden />
                )}
                <span className="font-mono text-xs text-muted-foreground">{c.famiglia.articolo}</span>
                <span className="text-sm font-medium">{c.famiglia.titolo}</span>
                {c.famiglia.interdittive ? (
                  <span className="rounded border border-border px-1.5 py-0.5 font-mono text-micro tracking-wide text-muted-foreground uppercase">
                    interdittive
                  </span>
                ) : null}
                <span className={cn("cifra ml-auto text-base", completa ? "text-regolare" : "text-scaduta")}>
                  {c.presidiInOrdine}/{c.presidiTotali}
                </span>
              </div>

              {c.famiglia.nota ? (
                <p className="mt-2 text-nota leading-relaxed text-muted-foreground">{c.famiglia.nota}</p>
              ) : null}

              {c.scoperti.length > 0 ? (
                <div className="mt-2.5 border-t border-border-subtle pt-2.5">
                  <p className="text-nota font-medium text-scaduta">
                    Presìdi non in ordine — fatti ma scaduti, o mai fatti
                  </p>
                  <ul className="mt-1.5 space-y-1">
                    {c.scoperti.map((s) => {
                      const [dominio, codice] = s.split(":") as [(typeof DOMINI)[number], string];
                      const t = templatePerCodice(dominio, codice);
                      return (
                        <li key={s} className="flex flex-wrap items-baseline gap-2 text-nota">
                          <Link
                            href={`/azienda/${id}/${dominio}?q=${codice}`}
                            className="font-mono text-muted-foreground underline hover:text-foreground"
                          >
                            {ETICHETTE_DOMINIO[dominio].breve} {codice}
                          </Link>
                          <span>{t?.titolo ?? codice}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>

      {senzaPresidi.length > 0 ? (
        <section className="mt-6">
          <h2 className="text-sm font-semibold tracking-tight">Famiglie senza presìdi censiti</h2>
          <p className="mt-1 max-w-3xl text-nota leading-relaxed text-muted-foreground">
            Nessun adempimento dei moduli attivi presidia queste famiglie. Non significa che l&apos;ente non
            ne risponda: significa che il modello, per come è censito qui, non dichiara come le presidia. È
            una domanda da portare in riunione, non un risultato.
          </p>
          <ul className="mt-2 space-y-1">
            {senzaPresidi.map((c) => (
              <li key={c.famiglia.articolo} className="flex flex-wrap items-baseline gap-2 text-nota">
                <span className="font-mono text-muted-foreground">{c.famiglia.articolo}</span>
                <span>{c.famiglia.titolo}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className="mt-6 max-w-3xl text-nota leading-relaxed text-muted-foreground">
        La mappa copre le famiglie che i cataloghi di questa suite presidiano davvero, non l&apos;intero arco
        degli artt. 24 – 25-duodevicies. Dichiarare una copertura totale sarebbe l&apos;affermazione più
        costosa che questo strumento possa fare: è esattamente quella su cui un ente si difenderebbe ai sensi
        dell&apos;art. 6.
      </p>
    </div>
  );
}
