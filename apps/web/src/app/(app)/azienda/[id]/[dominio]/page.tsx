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
          <h1 className="titolo mt-1 text-[1.7rem]">{etichetta.esteso}</h1>
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

      {"misure" in dati && dati.misure ? (
        <DueAssi griglia={dati.misure.incrocio} />
      ) : (
        <p className="mt-2 max-w-prose text-sm text-muted-foreground">
          Lo stato del lavoro lo decidi tu; lo stato della scadenza lo decide la data.
        </p>
      )}

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

/**
 * I DUE ASSI, come matrice invece che come frase.
 *
 * Fin qui la pagina lo diceva a parole: «un adempimento può essere completato e nondimeno
 * scaduto». È vero, è la cosa più importante del modello, e nessuno la leggeva — una
 * proposizione in prosa sopra una tabella è un avviso di cortesia.
 *
 * Come matrice diventa una casella con dentro un numero. «Completata × Scaduta» smette di
 * essere un concetto e diventa dodici adempimenti su cui il registro dice «fatto» e la
 * realtà dice «scaduto». È la cella che nessuno dei tre prototipi sapeva rappresentare,
 * perché tutti e tre schiacciavano i due assi in un elenco solo di stati.
 *
 * La cella si evidenzia solo se contiene qualcosa: un rosso acceso su uno zero insegnerebbe
 * a ignorare il rosso.
 */
function DueAssi({
  griglia,
}: {
  griglia: Readonly<Record<string, Readonly<Record<string, number>>>>;
}) {
  const colonne = ["Regolare", "In scadenza", "Scaduta", "Da programmare"] as const;
  const righe = ["Completata", "In corso", "Da fare", "Non applicabile"] as const;
  const critica = griglia.Completata?.Scaduta ?? 0;

  return (
    <section className="pannello mt-4 p-5">
      <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-3">
        <div className="max-w-md">
          <h2 className="text-sm font-semibold tracking-tight">I due assi</h2>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
            Lo stato del lavoro lo decidi tu; lo stato della scadenza lo decide la data. Sono due cose
            diverse e vanno lette insieme.
          </p>
          {critica > 0 ? (
            <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
              <b className="text-scaduta">{critica}</b>{" "}
              {critica === 1 ? "adempimento risulta" : "adempimenti risultano"} <b>completat</b>
              {critica === 1 ? "o" : "i"} e nondimeno <b>scadut</b>
              {critica === 1 ? "o" : "i"}: il documento fu redatto, il ciclo è finito. È la situazione più
              frequente e la più pericolosa, perché il registro dice «fatto».
            </p>
          ) : (
            <p className="mt-2 text-[11px] leading-relaxed text-faint-foreground">
              Nessun adempimento completato risulta scaduto: i cicli chiusi sono tutti ancora validi.
            </p>
          )}
        </div>

        <table className="text-xs">
          <thead>
            <tr className="text-faint-foreground">
              <th className="pr-3 text-left font-normal" />
              {colonne.map((c) => (
                <th key={c} className="px-2 text-right text-[10px] font-normal">
                  {c.toLowerCase()}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {righe.map((r) => (
              <tr key={r}>
                <td className="pr-3 whitespace-nowrap text-muted-foreground">{r}</td>
                {colonne.map((c) => {
                  const n = griglia[r]?.[c] ?? 0;
                  const allarme = r === "Completata" && c === "Scaduta" && n > 0;
                  return (
                    <td
                      key={c}
                      className={`px-2 text-right font-mono tabular-nums ${
                        allarme
                          ? "font-semibold text-scaduta"
                          : n === 0
                            ? "text-faint-foreground"
                            : "text-foreground"
                      }`}
                    >
                      {n || "·"}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
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
      <p className={`cifra text-2xl ${tinta ?? ""}`}>{valore}</p>
      <p className="text-[10px] text-muted-foreground">{etichetta}</p>
      <p className="font-mono text-[10px] text-faint-foreground">{nota}</p>
    </div>
  );
}
