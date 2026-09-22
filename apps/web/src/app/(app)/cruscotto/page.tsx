import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, LayoutGrid } from "lucide-react";
import { Vuoto } from "@/components/ui/vuoto";
import { DOMINI, ETICHETTE_DOMINIO } from "@gdpr/engine";
import { cruscotto } from "@/features/cruscotto/dati";
import { cn } from "@/lib/utils";
import {
  Anello,
  CaricoMensile,
  Ciambella,
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
  if (!d)
    return (
      <div className="mx-auto max-w-3xl px-6 py-16">
        <Vuoto
          icona={LayoutGrid}
          livello="h1"
          titolo="Non c'è ancora nulla da misurare"
          azione={
            <Link
              href="/portafoglio"
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-3 py-1.5 text-sm hover:bg-accent"
            >
              Vai al portafoglio
              <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          }
        >
          Il cruscotto misura quello che c&apos;è: si popola quando almeno un&apos;azienda ha un modulo
          attivo con adempimenti censiti.
        </Vuoto>
      </div>
    );

  const c = d.complessivo;
  const esp = c.esposizione;

  return (
    <div className="mx-auto max-w-[1600px] px-6 py-7">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">Cruscotto</p>
          <h1 className="titolo mt-1.5 text-titolo">
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

      {/* --- Fascia principale: UNA LASTRA in tre colonne, e il quadro d'insieme --------

          Trattamento «Lastra», scelto dal committente confrontando tre costruzioni sugli
          stessi numeri (2026-08-04). Prima erano quattro riquadri identici affiancati, che
          è il pattern più riconoscibile del software vecchio.

          La differenza non è estetica. Quattro schede uguali dicono «quattro oggetti
          indipendenti» e il cervello le legge una per una; una superficie divisa da un
          capello dice «un fatto in tre parti», e l'occhio CONFRONTA. Confrontare è
          esattamente ciò che si fa qui: 15, 0, 40.

          Il quadro complessivo esce dalla griglia e diventa un oggetto a sé, perché è di
          natura diversa: non è un quarto decreto, è la lettura dei tre insieme. Tenerlo in
          fila con gli altri lo faceva sembrare uno di loro. */}
      <section className="mt-6 grid gap-3 lg:grid-cols-[1fr_340px]">
        <div className="pannello overflow-clip">
          <div className="grid md:grid-cols-3">
            {d.perDominio.map((m, i) => (
              <Link
                key={m.dominio}
                href={m.attivo ? `/scadenzario?dominio=${m.dominio}` : "/portafoglio"}
                data-tour={i === 0 ? "scheda-dominio" : undefined}
                style={{ animationDelay: `${i * 60}ms` }}
                className={cn(
                  "entra group relative block p-5 transition-colors duration-200",
                  m.attivo && "hover:bg-surface-raised",
                  "focus-visible:-outline-offset-2 focus-visible:outline-2 focus-visible:outline-primary",
                  i > 0 && "md:border-l md:border-border-subtle",
                )}
              >
                {/* LA TESTATA DI COLONNA, a tutta larghezza e sempre presente.
                    Il colore è un'etichetta, non una decorazione.

                    Nasceva come un filo corto che si allungava al passaggio. Sembrava
                    intelligente e non lo era: tre trattini rientrati in cima a tre colonne
                    si leggono come tre segni sciolti appoggiati sopra la scheda, non come
                    l'intestazione di quella colonna. E il primo cadeva dentro la curva
                    dell'angolo.

                    A tutta larghezza il segno APPARTIENE alla colonna e la divide dalla
                    successiva senza bisogno di un altro tratto. Al passaggio si scurisce
                    invece di allungarsi: uno stato, non un'animazione. */}
                <span
                  aria-hidden
                  className="absolute inset-x-0 top-0 h-[3px] opacity-45 transition-opacity duration-200 group-hover:opacity-100"
                  style={{ background: TINTA_DOMINIO[m.dominio] }}
                />

                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm font-semibold">{m.etichetta.breve}</p>
                  {m.attivo ? (
                    <ArrowUpRight
                      className="size-4 shrink-0 text-faint-foreground opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                      aria-hidden
                    />
                  ) : null}
                </div>
                <p className="truncate text-nota text-muted-foreground">{m.etichetta.esteso}</p>
                <p className="font-mono text-micro text-muted-foreground">{m.etichetta.norma}</p>

                {m.attivo ? (
                  <>
                    {/* L'ANELLO È SPARITO, e non per moda: disegnava un arco che diceva la
                        stessa cosa della cifra che aveva al centro. Due volte lo stesso
                        dato costa attenzione e non ne restituisce. */}
                    <p className="mt-4 flex items-baseline gap-1">
                      <span className="cifra text-cifra-xl leading-none">
                        {m.conformita?.percentuale ?? 0}
                      </span>
                      <span className="text-base text-muted-foreground">%</span>
                    </p>
                    <p className="mt-1 font-mono text-micro text-muted-foreground">
                      {m.conformita?.numeratore}/{m.conformita?.applicabili} fatti e ancora validi
                    </p>

                    <div className="mt-3">
                      <Nastro
                        segmenti={[
                          { quanti: m.scadute, colore: "var(--scaduta)", etichetta: "Scadute" },
                          { quanti: m.inScadenza, colore: "var(--imminente)", etichetta: "In scadenza" },
                          { quanti: m.regolari, colore: "var(--regolare)", etichetta: "Regolari" },
                          {
                            quanti: m.daProgrammare,
                            colore: "var(--programmare)",
                            etichetta: "Da programmare",
                          },
                        ]}
                      />
                    </div>

                    <dl className="mt-3 space-y-1 text-nota">
                      <Voce etichetta="scadute" valore={m.scadute} tinta="text-scaduta" />
                      <Voce etichetta="in scadenza" valore={m.inScadenza} tinta="text-imminente" />
                      <Voce etichetta="critici aperti" valore={m.critici} />
                    </dl>

                    {m.prontezza ? (
                      <p className="mt-3 text-micro text-muted-foreground">
                        Prontezza <b className="tabular-nums">{m.prontezza.indice}/100</b>
                        {m.prontezza.presidiScoperti.length > 0
                          ? ` · ${m.prontezza.presidiScoperti.length} presidi scoperti`
                          : " · presidi in ordine"}
                      </p>
                    ) : null}
                  </>
                ) : (
                  <p className="mt-4 text-xs text-muted-foreground">
                    Nessuna azienda ha questo modulo attivo.
                  </p>
                )}
              </Link>
            ))}
          </div>
        </div>

        {/* Il quadro d'insieme. Resta un anello perché qui NON è ridondante: accompagna due
            numeri diversi (conformità ed esposizione) e fa da ancora visiva a un oggetto che
            altrimenti sarebbe solo testo. La superficie sale di un gradino invece di alzare
            la voce con un bordo: nella forma «quieto» il rilievo si fa così. */}
        <div className="pannello entra bg-surface-raised p-5" style={{ animationDelay: "180ms" }}>
          <p className="text-sm font-semibold">Complessivo</p>
          <p className="text-xs text-muted-foreground">sull&apos;insieme unito dei tre decreti</p>
          <div className="mt-4 flex items-center gap-4">
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
              <p className="text-micro text-muted-foreground">conformità effettiva</p>
              <p className="mt-2 text-lg font-semibold tabular-nums">
                {esp.indice}
                <span className="text-xs font-normal text-muted-foreground">/100</span>
              </p>
              <p className="text-micro text-muted-foreground">esposizione · {esp.giudizio.toLowerCase()}</p>
            </div>
          </div>
          <p className="mt-4 border-t border-border-subtle pt-2.5 text-micro leading-relaxed text-muted-foreground">
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
              // Neutro e non `bg-accento`: da quando l'accento è oliva, una barra verde in
              // mezzo a una rossa e una ambra si legge «in regola», che è l'opposto di
              // quello che dice — sono adempimenti che scadono entro trenta giorni. Il
              // colore qui non ha significato, serve solo a distinguere quattro barre.
              { e: "Entro 30 giorni", n: d.agenda.entro30.length, t: "bg-foreground/45", q: "30" },
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

      {/* --- Terza fascia: quando cade il lavoro, e di che cosa è fatto -----------------
          Le due schede rispondono a domande che nessun numero della pagina risponde già.
          Il carico guarda AVANTI ed è il pezzo che i prototipi non sapevano fare: il loro
          «trend» guardava indietro e per farlo inventava. La composizione dice in che
          proporzione stanno i quattro stati, che dai quattro conteggi sparsi si ricava
          solo facendo le divisioni a mente. */}
      <section className="mt-3 grid gap-3 lg:grid-cols-3">
        <div className="pannello p-5 lg:col-span-2">
          <h2 className="text-nota font-semibold tracking-[0.1em] text-muted-foreground uppercase">
            Carico dei prossimi dodici mesi
          </h2>
          <div className="mt-3">
            <CaricoMensile mesi={d.caricoMensile} domini={DOMINI} etichette={ETICHETTE_DOMINIO} />
          </div>
        </div>
        <Riquadro titolo="Composizione" nota="Di che cosa è fatto il totale, in proporzione.">
          <Ciambella
            totale={d.totale}
            segmenti={[
              { etichetta: "regolari", quanti: d.complessivo.conteggi.Regolare, colore: "var(--regolare)" },
              {
                etichetta: "in scadenza",
                quanti: d.complessivo.conteggi["In scadenza"],
                colore: "var(--imminente)",
              },
              { etichetta: "scadute", quanti: d.complessivo.conteggi.Scaduta, colore: "var(--scaduta)" },
              {
                etichetta: "da programmare",
                quanti: d.complessivo.conteggi["Da programmare"],
                colore: "var(--programmare)",
              },
            ]}
          />
        </Riquadro>
      </section>

      {/* --- Quarta fascia: dove si perde terreno --------------------------------------- */}
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
            <p className="max-w-xs text-nota leading-relaxed text-muted-foreground">
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
    <div className="pannello p-5">
      <h2 className="text-sm font-semibold tracking-tight">{titolo}</h2>
      {nota ? <p className="mt-0.5 mb-3 text-nota leading-relaxed text-muted-foreground">{nota}</p> : null}
      {children}
    </div>
  );
}

// LA COPPIA SI PORTA IL PROPRIO IMPAGINATO, e prima no.
//
// `dt` e `dd` uscivano nudi da qui e si affidavano a una griglia a due colonne nel padre.
// Cambiando il padre in un elenco verticale — la lastra vuole le voci una sotto l'altra —
// i due elementi sono tornati a essere blocchi e sono andati a capo: l'etichetta su una
// riga, il numero sulla successiva, allineato a destra. Illeggibile.
//
// Un componente che funziona solo dentro un padre preciso è una trappola: la prossima
// persona che sposta il contenitore rompe l'impaginato senza toccarlo. Ora la coppia sta
// in piedi da sola, ovunque la si metta.
function Voce({ etichetta, valore, tinta }: { etichetta: string; valore: number; tinta?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className="text-muted-foreground">{etichetta}</dt>
      <dd className={`font-mono font-medium tabular-nums ${tinta ?? ""}`}>{valore}</dd>
    </div>
  );
}


