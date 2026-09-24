import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, ClipboardList, ToggleLeft } from "lucide-react";
import { Vuoto } from "@/components/ui/vuoto";
import { DOMINI, ETICHETTE_DOMINIO, type Dominio } from "@legisboard/engine";
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
  searchParams,
}: {
  params: Promise<{ id: string; dominio: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id, dominio } = await params;
  const cerca = await searchParams;
  // Solo i due assi: sono i filtri che la matrice imposta con un clic. Gli altri cambiano
  // dentro la tabella con `replaceState`, senza navigazione, e non devono rimontarla.
  const chiaveAssi = `${cerca.lavoro ?? ""}|${cerca.scadenza ?? ""}`;
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
          <h1 className="titolo mt-1 text-titolo">{etichetta.esteso}</h1>
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
          <Vuoto
            icona={ToggleLeft}
            titolo={`Il modulo ${etichetta.breve} non è attivo`}
            azione={
              <Link
                href={`/azienda/${id}`}
                className="inline-flex items-center rounded-md border border-border bg-surface px-3 py-1.5 text-sm hover:bg-accent"
              >
                Attivalo dalla scheda dell&apos;azienda
              </Link>
            }
          >
            Finché il modulo è spento, per questa azienda non esistono adempimenti{" "}
            {etichetta.breve}: attivandolo vengono creati dal catalogo, con le loro scadenze.
          </Vuoto>
        ) : righe.length === 0 ? (
          // ERA IL VUOTO PEGGIORE DEL PRODOTTO: sette parole in un riquadro tratteggiato,
          // senza dire se fosse normale né cosa fare. Un vicolo cieco.
          <Vuoto
            icona={ClipboardList}
            titolo="Nessun adempimento censito"
            azione={
              <Link
                href={`/azienda/${id}`}
                className="inline-flex items-center rounded-md border border-border bg-surface px-3 py-1.5 text-sm hover:bg-accent"
              >
                Torna alla scheda dell&apos;azienda
              </Link>
            }
          >
            Il modulo è attivo ma non contiene adempimenti: di solito vuol dire che è stato
            disattivato e riattivato, perché spegnendolo le sue righe vengono rimosse. Riattivarlo
            dalla scheda li ricrea dal catalogo.
          </Vuoto>
        ) : (
          // `useSearchParams` richiede un confine di sospensione: senza, la pagina
          // rinuncerebbe alla generazione statica di tutto ciò che le sta sopra.
          <Suspense fallback={<p className="text-sm text-muted-foreground">Caricamento…</p>}>
            {/* LA CHIAVE SERVE, e senza la matrice non filtrerebbe niente.
                `useFiltriUrl` legge l'indirizzo UNA volta, al montaggio. Un collegamento alla
                stessa pagina con una query diversa è una navigazione che NON rimonta il
                componente: la tabella resterebbe con i filtri di prima, e il clic sulla cella
                cambierebbe l'indirizzo senza cambiare le righe. La chiave sui due assi la
                rimonta proprio e solo quando la matrice li cambia. */}
            <TabellaAssessment
              key={chiaveAssi}
              righe={righe}
              modificabile={ctx.ruolo !== "viewer"}
            />
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
function DueAssi({ griglia }: { griglia: Readonly<Record<string, Readonly<Record<string, number>>>> }) {
  const colonne = ["Regolare", "In scadenza", "Scaduta", "Da programmare"] as const;
  const righe = ["Completata", "In corso", "Da fare", "Non applicabile"] as const;
  const critica = griglia.Completata?.Scaduta ?? 0;

  return (
    <section className="pannello mt-4 p-5">
      <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-3">
        <div className="max-w-md">
          <h2 className="text-sm font-semibold tracking-tight">I due assi</h2>
          <p className="mt-1 text-nota leading-relaxed text-muted-foreground">
            Lo stato del lavoro lo decidi tu; lo stato della scadenza lo decide la data. Sono due cose diverse
            e vanno lette insieme.
          </p>
          {critica > 0 ? (
            <p className="mt-2 text-nota leading-relaxed text-muted-foreground">
              <b className="text-scaduta">{critica}</b>{" "}
              {critica === 1 ? "adempimento risulta" : "adempimenti risultano"} <b>completat</b>
              {critica === 1 ? "o" : "i"} e nondimeno <b>scadut</b>
              {critica === 1 ? "o" : "i"}: il documento fu redatto, il ciclo è finito. È la situazione più
              frequente e la più pericolosa, perché il registro dice «fatto».
            </p>
          ) : (
            <p className="mt-2 text-nota leading-relaxed text-muted-foreground">
              Nessun adempimento completato risulta scaduto: i cicli chiusi sono tutti ancora validi.
            </p>
          )}
        </div>

        <table className="text-xs">
          <thead>
            <tr className="text-muted-foreground">
              <th className="pr-3 text-left font-normal" />
              {colonne.map((c) => (
                <th key={c} className="px-2 text-right text-micro font-normal">
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
                    <td key={c} className="px-0.5 text-right">
                      {/* LA MATRICE ERA INERTE, ed era la tesi del prodotto. «Completata e
                          scaduta» — il documento fu redatto, il ciclo è scaduto — è la
                          situazione che PRODUCT.md chiama il problema di design centrale, e
                          stava in una cella che non portava da nessuna parte, a pochi
                          centimetri da una tabella con i filtri già nell'indirizzo.
                          Una cella vuota non è un collegamento: portare a una tabella senza
                          righe sarebbe un clic che promette e non mantiene. */}
                      {n > 0 ? (
                        <Link
                          href={`?lavoro=${encodeURIComponent(r)}&scadenza=${encodeURIComponent(c)}`}
                          scroll={false}
                          /* NIENTE PRELIEVO ANTICIPATO SU QUESTE SEDICI CELLE.
                             Misurato in produzione il 2026-09-23: la pagina apre tredici
                             richieste RSC — una per cella non vuota — verso una rotta
                             `force-dynamic` che il visitatore forse non aprirà mai. Sono
                             tredici invocazioni serverless regalate a ogni apertura della
                             schermata più visitata del prodotto.
                             Una di quelle tredici non si chiudeva MAI: ancora in volo dopo
                             149 secondi, mentre la stessa URL chiesta da sola — comprese le
                             intestazioni del router — rispondeva in 80-255 ms. La pagina
                             intanto era resa e idratata in 1,3 s: l'utente non vedeva
                             niente, ma `networkidle` non arrivava e il cancello non poteva
                             verificare la pagina online.
                             Il prelievo anticipato serve a rendere istantaneo un percorso
                             probabile. Un affondo su una cella di una matrice non lo è. */
                          prefetch={false}
                          aria-label={`${n} adempimenti ${r.toLowerCase()} con scadenza ${c.toLowerCase()}: mostrali`}
                          className={`inline-block rounded-xs px-1.5 font-mono tabular-nums underline-offset-2 hover:bg-accent hover:underline ${
                            allarme ? "font-semibold text-scaduta" : "text-foreground"
                          }`}
                        >
                          {n}
                        </Link>
                      ) : (
                        <span className="inline-block px-1.5 font-mono text-muted-foreground tabular-nums">·</span>
                      )}
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
      <p className="text-micro text-muted-foreground">{etichetta}</p>
      <p className="font-mono text-micro text-muted-foreground">{nota}</p>
    </div>
  );
}
