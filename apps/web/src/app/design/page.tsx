import type { Metadata } from "next";
import {
  CATALOGHI,
  CLIENTI_DIMOSTRATIVI,
  DOMINI,
  ETICHETTE_DOMINIO,
  agenda,
  conformitaEffettiva,
  conteggi,
  costruisciDemo,
  descriviPeriodicita,
  esposizione,
  lettoDa,
  oggiA,
  risolviTutti,
  templatePerCodice,
  type Dominio,
} from "@gdpr/engine";
import { Codice, PastigliaDominio, Priorita, Scadenza, StatoLavoroEtichetta } from "@/components/stato";

// Vetrina di controllo del sistema di design. Pagina interna, non raggiungibile dalla
// navigazione: serve a verificare i token e i componenti in entrambi i temi, e a misurare
// la densità reale prima di costruirci le schermate sopra.
//
// Usa i DATI VERI del motore, non segnaposto: un sistema di design provato su «Lorem ipsum»
// non dice nulla su come reggerà 171 righe di testo legale italiano.

export const metadata: Metadata = { title: "Sistema di design" };

const OGGI = oggiA();

const risolti = (d: Dominio) =>
  risolviTutti(costruisciDemo(CATALOGHI[d], CLIENTI_DIMOSTRATIVI[d], OGGI), OGGI);
const tutti = DOMINI.flatMap(risolti);

function Sezione({ titolo, nota, children }: { titolo: string; nota?: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-border-strong pt-6">
      <h2 className="text-sm font-semibold tracking-tight">{titolo}</h2>
      {nota ? <p className="mt-1 max-w-prose text-xs text-muted-foreground">{nota}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Campione({ nome, variabile }: { nome: string; variabile: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className="h-8 w-8 shrink-0 rounded-md border border-border"
        style={{ background: `var(${variabile})` }}
      />
      <span className="min-w-0">
        <span className="block truncate text-xs font-medium">{nome}</span>
        <span className="block truncate font-mono text-[10px] text-faint-foreground">{variabile}</span>
      </span>
    </div>
  );
}

export default function PaginaDesign() {
  const gdpr = risolti("gdpr");
  const d81 = risolti("d81");
  const scadenzario = agenda(tutti).slice(0, 22);

  return (
    <main className="mx-auto flex max-w-[1600px] flex-col gap-10 px-6 py-10">
      <header>
        <p className="text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
          Vetrina di controllo
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Sistema di design</h1>
        <p className="mt-2 max-w-prose text-sm text-muted-foreground">
          Token e componenti sui dati reali dei tre cataloghi. Ogni elemento va verificato in tema chiaro e
          scuro prima che una schermata lo usi.
        </p>
      </header>

      <Sezione
        titolo="Gerarchia del colore"
        nota="Tre livelli, rigidi. Lo stato della scadenza è riservato: rosso, ambra e verde non compaiono da nessun'altra parte. Il dominio appare solo dove i tre convivono. Il prodotto usa inchiostro, non blu."
      >
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2.5">
            <p className="text-xs font-semibold">1 · Stato della scadenza</p>
            <Campione nome="Scaduta" variabile="--scaduta" />
            <Campione nome="In scadenza" variabile="--imminente" />
            <Campione nome="Regolare" variabile="--regolare" />
            <Campione nome="Da programmare" variabile="--programmare" />
          </div>
          <div className="space-y-2.5">
            <p className="text-xs font-semibold">2 · Dominio</p>
            <Campione nome="GDPR · indaco" variabile="--gdpr" />
            <Campione nome="231 · prugna" variabile="--d231" />
            <Campione nome="81/08 · acciaio" variabile="--d81" />
            <p className="pt-1 text-[10px] leading-relaxed text-faint-foreground">
              Separati in tinta <em>e</em> in luminosità: in deuteranopia le tinte collassano verso il blu e
              resta il valore a distinguerli.
            </p>
          </div>
          <div className="space-y-2.5">
            <p className="text-xs font-semibold">3 · Prodotto</p>
            <Campione nome="Inchiostro" variabile="--primary" />
            <Campione nome="Selezione" variabile="--selected" />
            <Campione nome="Anello di focus" variabile="--ring" />
          </div>
          <div className="space-y-2.5">
            <p className="text-xs font-semibold">Neutri</p>
            <Campione nome="Scrivania" variabile="--background" />
            <Campione nome="Foglio" variabile="--surface" />
            <Campione nome="Sidebar" variabile="--sidebar" />
            <Campione nome="Filetto forte" variabile="--border-strong" />
          </div>
        </div>
      </Sezione>

      <Sezione
        titolo="I due assi"
        nota="Il momento firmato. Il lavoro è un'etichetta, la scadenza è la data stessa: una parola contro un numero. Guarda T12, completato e scaduto insieme."
      >
        <div className="overflow-hidden rounded-md border border-border bg-surface">
          <table className="w-full text-sm">
            <thead className="border-b border-border-strong bg-surface-sunken">
              <tr>
                <th className="px-3 py-2 text-left">Cod.</th>
                <th className="px-3 py-2 text-left">Adempimento</th>
                <th className="px-3 py-2 text-left">Periodicità</th>
                <th className="px-3 py-2 text-left">Priorità</th>
                <th className="px-3 py-2 text-left">Lavoro</th>
                <th className="px-3 py-2 text-left">Scadenza</th>
              </tr>
            </thead>
            <tbody>
              {gdpr.slice(0, 12).map((a) => (
                <tr key={a.codice} className="border-b border-border-subtle last:border-0 hover:bg-selected">
                  <td className="h-riga px-3">
                    <Codice codice={a.codice} />
                  </td>
                  <td className="px-3">{templatePerCodice(a.dominio, a.codice)?.titolo}</td>
                  <td className="px-3 text-xs text-muted-foreground">{descriviPeriodicita(a.periodicita)}</td>
                  <td className="px-3">
                    <Priorita priorita={a.priorita} />
                  </td>
                  <td className="px-3">
                    <StatoLavoroEtichetta stato={a.stato} />
                  </td>
                  <td className="px-3">
                    <Scadenza
                      data={a.scadenza}
                      giorni={a.giorniAllaScadenza}
                      statoScadenza={a.statoScadenza}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Sezione>

      <Sezione
        titolo="Scadenzario unificato · densità reale"
        nota="22 righe a 1440×900 senza scorrere: è il numero che separa uno strumento da una dashboard. Qui i tre domini convivono, quindi la pastiglia del decreto serve."
      >
        <div className="overflow-hidden rounded-md border border-border bg-surface">
          <table className="w-full text-sm">
            <thead className="border-b border-border-strong bg-surface-sunken">
              <tr>
                <th className="px-3 py-2 text-left">Modulo</th>
                <th className="px-3 py-2 text-left">Cod.</th>
                <th className="px-3 py-2 text-left">Adempimento</th>
                <th className="px-3 py-2 text-left">Responsabile</th>
                <th className="px-3 py-2 text-left">Lavoro</th>
                <th className="px-3 py-2 text-left">Scadenza</th>
              </tr>
            </thead>
            <tbody>
              {scadenzario.map((v) => (
                <tr
                  key={`${v.dominio}-${v.codice}`}
                  className="border-b border-border-subtle last:border-0 hover:bg-selected"
                >
                  <td className="h-riga px-3">
                    <PastigliaDominio dominio={v.dominio} />
                  </td>
                  <td className="px-3">
                    <Codice codice={v.codice} />
                  </td>
                  <td className="max-w-md truncate px-3">{templatePerCodice(v.dominio, v.codice)?.titolo}</td>
                  <td className="px-3 text-xs text-muted-foreground">{v.ruolo}</td>
                  <td className="px-3">
                    <StatoLavoroEtichetta stato={v.stato} />
                  </td>
                  <td className="px-3">
                    <Scadenza
                      data={v.scadenza}
                      giorni={v.giorniAllaScadenza}
                      statoScadenza={v.statoScadenza}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Sezione>

      <Sezione
        titolo="Provenienza fra moduli"
        nota="Un adempimento letto da un altro modulo porta il codice del proprietario con la tinta del dominio d'origine. Il codice stesso dice da dove viene."
      >
        <div className="space-y-2">
          {d81
            .filter((a) => lettoDa("d81", a.codice).length > 0)
            .slice(0, 5)
            .map((a) => {
              const usi = lettoDa("d81", a.codice);
              return (
                <div
                  key={a.codice}
                  className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-surface px-3 py-2 text-sm"
                >
                  <Codice codice={a.codice} />
                  <span className="min-w-0 flex-1 truncate">
                    {templatePerCodice("d81", a.codice)?.titolo}
                  </span>
                  <Scadenza data={a.scadenza} giorni={a.giorniAllaScadenza} statoScadenza={a.statoScadenza} />
                  <span className="text-xs text-muted-foreground">alimenta</span>
                  {usi.map((u) => (
                    <span key={u.a.codice} className="flex items-center gap-1.5">
                      <PastigliaDominio dominio={u.a.dominio} />
                      <Codice codice={u.a.codice} origine="d81" />
                    </span>
                  ))}
                </div>
              );
            })}
        </div>
      </Sezione>

      <Sezione
        titolo="Indicatori"
        nota="Banda compatta, mai schede eroiche. Ogni numero dichiara il proprio denominatore: un numero che non sa da dove viene non è difendibile."
      >
        <div className="grid gap-px overflow-hidden rounded-md border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
          {DOMINI.map((d) => {
            const suoi = risolti(d);
            const q = conformitaEffettiva(suoi);
            const c = conteggi(suoi).perScadenza;
            return (
              <div key={d} className="bg-surface p-4">
                <div className="flex items-center justify-between">
                  <PastigliaDominio dominio={d} />
                  <span className="text-[10px] text-faint-foreground">{ETICHETTE_DOMINIO[d].norma}</span>
                </div>
                <p className="mt-3 text-2xl font-semibold tracking-tight tabular-nums">{q.percentuale}%</p>
                <p className="text-xs text-muted-foreground">
                  conformità effettiva · {q.numeratore}/{q.applicabili}
                </p>
                <p className="mt-2 text-xs">
                  <span className="text-scaduta">{c.Scaduta} scadute</span>
                  <span className="text-faint-foreground"> · </span>
                  <span className="text-imminente">{c["In scadenza"]} in scadenza</span>
                </p>
              </div>
            );
          })}
          <div className="bg-surface p-4">
            <p className="text-xs font-medium text-muted-foreground">Indice di esposizione</p>
            <p className="mt-3 text-2xl font-semibold tracking-tight tabular-nums">
              {esposizione(tutti).indice}
              <span className="text-base font-normal text-faint-foreground">/100</span>
            </p>
            <p className="text-xs text-muted-foreground">{esposizione(tutti).giudizio}</p>
            <p className="mt-2 text-[10px] leading-relaxed text-faint-foreground">
              Indice derivato, non una cifra in euro.
            </p>
          </div>
        </div>
      </Sezione>

      <Sezione
        titolo="Tipografia"
        nota="IBM Plex Sans per l'interfaccia, Plex Mono per i codici. Cifre tabellari ovunque: una colonna di numeri che non si allinea è il primo segnale che il prodotto non è preciso."
      >
        <div className="space-y-3">
          <p className="text-2xl font-semibold tracking-tight">Relazione integrata di conformità</p>
          <p className="text-base">Adempimenti presidiati e scadenze in corso</p>
          <p className="max-w-prose text-sm text-muted-foreground">
            Il presente assessment fotografa lo stato di conformità alla data indicata, sulla base dei
            controlli censiti nei moduli attivi per l&apos;azienda.
          </p>
          <div className="flex flex-wrap gap-6 pt-2 font-mono text-sm">
            <span>0123456789</span>
            <span>T01 · M47 · S16</span>
            <span>31/01/2027</span>
            <span>−52gg / +170gg</span>
          </div>
        </div>
      </Sezione>
    </main>
  );
}
