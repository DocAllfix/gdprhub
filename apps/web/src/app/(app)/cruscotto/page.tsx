import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, LayoutGrid } from "lucide-react";
import { ETICHETTE_DOMINIO } from "@gdpr/engine";
import { cruscotto } from "@/features/cruscotto/dati";
import {
  Anello,
  Distribuzione,
  Matrice,
  Nastro,
  Scomposizione,
  TINTA_DOMINIO,
} from "@/components/cruscotto/grafici";

export const metadata: Metadata = { title: "Cruscotto" };
export const dynamic = "force-dynamic";

// Il cruscotto unificato: la risposta a «come stiamo» prima di «cosa devo fare».
//
// I tre prototipi avevano ciascuno il proprio pannello e nessuno parlava con gli altri.
// Qui le stesse domande si fanno una volta sola sui tre decreti, e ogni numero dichiara il
// proprio denominatore: un numero che non sa da dove viene non è difendibile davanti a
// un'autorità, e questo prodotto esiste per essere difendibile.

export default async function PaginaCruscotto() {
  const d = await cruscotto();
  if (!d) return <Vuoto />;

  const c = d.complessivo;
  const esp = c.esposizione;

  return (
    <div className="mx-auto max-w-[1600px] px-6 py-7">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">Cruscotto</p>
          <h1 className="titolo mt-1.5 text-[1.7rem]">
            {d.aziende.length} aziende, tre decreti, {d.totale} adempimenti
          </h1>
        </div>
        <Link
          href="/scadenzario"
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-3 py-1.5 text-sm hover:bg-accent"
        >
          Cosa scade adesso
          <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      </header>

      {/* --- Fascia principale: i tre moduli, ciascuno col suo anello ------------------- */}
      <section className="mt-6 grid gap-3 lg:grid-cols-4">
        {d.perDominio.map((m) => (
          <div key={m.dominio} className="rounded-lg border border-border bg-surface p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold" style={{ color: TINTA_DOMINIO[m.dominio] }}>
                  {m.etichetta.breve}
                </p>
                <p className="truncate text-xs text-muted-foreground">{m.etichetta.esteso}</p>
                <p className="mt-0.5 font-mono text-[10px] text-faint-foreground">{m.etichetta.norma}</p>
              </div>
              <Anello
                percentuale={m.conformita?.percentuale ?? null}
                tinta={TINTA_DOMINIO[m.dominio]}
                dimensione={68}
                spessore={7}
                etichetta={`Conformità effettiva ${m.etichetta.breve}`}
              />
            </div>

            {m.attivo ? (
              <>
                <p className="mt-2 font-mono text-[10px] text-faint-foreground">
                  {m.conformita?.numeratore}/{m.conformita?.applicabili} fatti e ancora validi
                </p>
                <div className="mt-2.5">
                  <Nastro
                    segmenti={[
                      { quanti: m.scadute, colore: "var(--scaduta)", etichetta: "Scadute" },
                      { quanti: m.inScadenza, colore: "var(--imminente)", etichetta: "In scadenza" },
                      { quanti: m.regolari, colore: "var(--regolare)", etichetta: "Regolari" },
                      { quanti: m.daProgrammare, colore: "var(--programmare)", etichetta: "Da programmare" },
                    ]}
                  />
                </div>
                <dl className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
                  <Voce etichetta="scadute" valore={m.scadute} tinta="text-scaduta" />
                  <Voce etichetta="in scadenza" valore={m.inScadenza} tinta="text-imminente" />
                  <Voce etichetta="da programmare" valore={m.daProgrammare} />
                  <Voce etichetta="critici aperti" valore={m.critici} />
                </dl>
                {m.prontezza ? (
                  <p className="mt-2.5 border-t border-border-subtle pt-2 text-[10px] text-muted-foreground">
                    Prontezza a un&apos;ispezione <b className="tabular-nums">{m.prontezza.indice}/100</b>
                    {m.prontezza.presidiScoperti.length > 0
                      ? ` · ${m.prontezza.presidiScoperti.length} presidi chiave scoperti`
                      : " · presidi chiave in ordine"}
                  </p>
                ) : null}
              </>
            ) : (
              <p className="mt-3 text-xs text-faint-foreground">Nessuna azienda ha questo modulo attivo.</p>
            )}
          </div>
        ))}

        {/* Il quadro complessivo, con il peso visivo che merita. */}
        <div className="rounded-lg border border-border-strong bg-surface p-4 shadow-sm">
          <p className="text-sm font-semibold">Complessivo</p>
          <p className="text-xs text-muted-foreground">sull&apos;insieme unito dei tre decreti</p>
          <div className="mt-3 flex items-center gap-4">
            <Anello
              percentuale={c.conformita.percentuale}
              tinta="var(--foreground)"
              dimensione={84}
              spessore={9}
              etichetta="Conformità effettiva complessiva"
            />
            <div className="min-w-0">
              <p className="font-mono text-xs tabular-nums">
                {c.conformita.numeratore}/{c.conformita.applicabili}
              </p>
              <p className="text-[10px] text-muted-foreground">conformità effettiva</p>
              <p className="mt-2 text-lg font-semibold tabular-nums">
                {esp.indice}
                <span className="text-xs font-normal text-faint-foreground">/100</span>
              </p>
              <p className="text-[10px] text-muted-foreground">esposizione · {esp.giudizio.toLowerCase()}</p>
            </div>
          </div>
          <p className="mt-3 border-t border-border-subtle pt-2 text-[10px] leading-relaxed text-faint-foreground">
            Calcolato sull&apos;insieme unito, non come media delle tre percentuali: una media peserebbe
            uguale un modulo da 42 e uno da 65, e basterebbe spegnerne uno per migliorare il numero.
          </p>
        </div>
      </section>

      {/* --- Seconda fascia: orizzonte, matrice, esposizione ---------------------------- */}
      <section className="mt-3 grid gap-3 lg:grid-cols-3">
        <Riquadro
          titolo="Orizzonte"
          nota="Le quattro finestre che un consulente usa davvero. Sono cumulative."
        >
          <ul className="space-y-2">
            {[
              { e: "Già scadute", n: d.agenda.scadute.length, t: "bg-scaduta", q: "scadute" },
              { e: "Entro 7 giorni", n: d.agenda.entro7.length, t: "bg-imminente", q: "7" },
              { e: "Entro 30 giorni", n: d.agenda.entro30.length, t: "bg-accento", q: "30" },
              { e: "Entro 90 giorni", n: d.agenda.entro90.length, t: "bg-border-strong", q: "90" },
            ].map((x) => {
              const massimo = Math.max(
                d.agenda.scadute.length,
                d.agenda.entro7.length,
                d.agenda.entro30.length,
                d.agenda.entro90.length,
                1,
              );
              return (
                <li key={x.e}>
                  <Link
                    href={`/scadenzario?finestra=${x.q}`}
                    className="group grid grid-cols-[1fr_auto] items-baseline gap-2"
                  >
                    <span className="text-xs group-hover:underline">{x.e}</span>
                    <span className="font-mono text-sm font-semibold tabular-nums">{x.n}</span>
                    <span className="col-span-2 mt-1 flex h-2 overflow-hidden rounded-full bg-surface-sunken">
                      <span className={x.t} style={{ width: `${(x.n / massimo) * 100}%` }} />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Riquadro>

        <Riquadro
          titolo="Rischio e priorità"
          nota="L'intensità viene dal peso reale degli adempimenti nella cella, non dalla sua posizione."
        >
          <Matrice celle={d.matrice} fasce={d.fasce} priorita={d.priorita} />
        </Riquadro>

        <Riquadro
          titolo={`Esposizione · ${esp.indice} su 100`}
          nota="Non è una stima in denaro. È una misura relativa di quanto rischio resta scoperto."
        >
          <Scomposizione
            indice={esp.indice}
            componenti={[
              {
                nome: "Rischio scoperto",
                valore: esp.componenti.rischioScoperto,
                peso: d.pesi.rischioScoperto,
                spiega: `${esp.dettaglio.rischioPesatoScoperto} di ${esp.dettaglio.rischioPesatoTotale} punti di rischio pesato`,
              },
              {
                nome: "Ritardo",
                valore: esp.componenti.ritardo,
                peso: d.pesi.ritardo,
                spiega: `${esp.dettaglio.scadute} scadenze mancate su ${esp.dettaglio.applicabili} applicabili`,
              },
              {
                nome: "Criticità",
                valore: esp.componenti.criticita,
                peso: d.pesi.criticita,
                spiega: `${esp.dettaglio.criticiDaPresidiare} adempimenti critici da presidiare`,
              },
            ]}
          />
        </Riquadro>
      </section>

      {/* --- Terza fascia: dove si perde terreno ---------------------------------------- */}
      <section className="mt-3 grid gap-3 lg:grid-cols-3">
        <Riquadro titolo="Per categoria" nota="Ordinate per quante scadenze sono già mancate.">
          <Distribuzione voci={d.perCategoria} />
        </Riquadro>
        <Riquadro titolo="Per responsabile" nota="Chi ha più arretrato, non chi ha più righe.">
          <Distribuzione voci={d.perRuolo} />
        </Riquadro>
        <Riquadro
          titolo="Andamento"
          nota="Lo storico si sta accumulando: ogni modifica lascia una traccia irreversibile."
        >
          {/* I tre prototipi generavano la curva con aritmetica sul dato di oggi, e il 231
              con Math.random(). Finché lo storico non basta, qui non si disegna nulla. */}
          <div className="flex h-32 flex-col items-center justify-center gap-1.5 rounded-md border border-dashed border-border text-center">
            <p className="text-xs font-medium">Non ci sono ancora dati storici</p>
            <p className="max-w-xs text-[11px] leading-relaxed text-muted-foreground">
              Un andamento va misurato, non generato. Comparirà quando ci saranno abbastanza rilevazioni
              datate.
            </p>
          </div>
        </Riquadro>
      </section>
    </div>
  );
}

function Riquadro({ titolo, nota, children }: { titolo: string; nota?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4 shadow-sm">
      <h2 className="text-sm font-semibold tracking-tight">{titolo}</h2>
      {nota ? <p className="mt-0.5 mb-3 text-[11px] leading-relaxed text-muted-foreground">{nota}</p> : null}
      {children}
    </div>
  );
}

function Voce({ etichetta, valore, tinta }: { etichetta: string; valore: number; tinta?: string }) {
  return (
    <>
      <dt className="text-muted-foreground">{etichetta}</dt>
      <dd className={`text-right font-mono font-medium tabular-nums ${tinta ?? ""}`}>{valore}</dd>
    </>
  );
}

function Vuoto() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <div className="rounded-lg border border-dashed border-border-strong bg-surface px-6 py-16 text-center">
        <LayoutGrid className="mx-auto size-6 text-faint-foreground" aria-hidden />
        <h1 className="mt-3 text-sm font-semibold">Non c&apos;è ancora nulla da misurare</h1>
        <p className="mx-auto mt-1.5 max-w-md text-sm text-muted-foreground">
          Il cruscotto si popola quando almeno un&apos;azienda ha un modulo attivo con adempimenti censiti.
        </p>
        <Link href="/portafoglio" className="mt-4 inline-block text-sm underline">
          Vai al portafoglio
        </Link>
      </div>
    </div>
  );
}
