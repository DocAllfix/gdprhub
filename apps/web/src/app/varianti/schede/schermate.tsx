import { AlertTriangle, ArrowRight, Check, Plus, Power, Search, SlidersHorizontal } from "lucide-react";
import { formattaIt } from "@gdpr/engine";
import type { DatiVarianti } from "../dati";
import {
  Anello,
  Cifra,
  Incasso,
  Nastro,
  Pastiglia,
  Scheda,
  TINTA,
  TitoloScheda,
  VAR,
  classeStato,
} from "./pezzi";

// Tutte le schermate del prodotto nella direzione «schede evolute».
//
// Sono anteprime statiche: gli stessi dati del motore, la disposizione definitiva. Servono a
// vedere il prodotto intero prima di riscriverlo, invece di scoprire alla terza schermata
// che la direzione non regge sulle tabelle dense.

// ============================================================================================
// CRUSCOTTO
// ============================================================================================

export function Cruscotto({ d }: { d: DatiVarianti }) {
  const e = d.complessivo.esposizione;
  return (
    <div className="space-y-3">
      {/* Griglia ASIMMETRICA: il complessivo occupa due colonne, i moduli una ciascuno.
          La gerarchia si vede prima di leggere. */}
      <div className="grid gap-3 lg:grid-cols-5">
        <Scheda rilievo className="lg:col-span-2">
          <TitoloScheda>Quadro complessivo</TitoloScheda>
          <div className="flex items-center gap-5">
            <Anello
              percentuale={d.complessivo.conformita.percentuale}
              tinta="var(--foreground)"
              dimensione={96}
              spessore={10}
            />
            <div className="min-w-0 flex-1">
              <Cifra
                valore={d.complessivo.conformita.percentuale}
                su={`${d.complessivo.conformita.numeratore}/${d.complessivo.conformita.applicabili}`}
              />
              <p className="mt-0.5 text-xs text-muted-foreground">conformità effettiva sui tre decreti</p>
              <Incasso className="mt-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-[11px] text-muted-foreground">Esposizione</span>
                  <span className="font-mono text-sm font-semibold tabular-nums">
                    {e.indice}
                    <span className="text-faint-foreground">/100</span>
                  </span>
                </div>
                <span className="mt-1.5 flex h-1 overflow-hidden rounded-full bg-surface">
                  <span className="bg-scaduta" style={{ width: `${e.indice}%` }} />
                </span>
                <p className="mt-1 text-[10px] text-faint-foreground">{e.giudizio.toLowerCase()}</p>
              </Incasso>
            </div>
          </div>
        </Scheda>

        {d.perModulo.map((m) => (
          <Scheda key={m.dominio}>
            <div className="flex items-start justify-between">
              <div className="min-w-0">
                <Pastiglia dominio={m.dominio} testo={m.etichetta.breve} />
                <p className="mt-0.5 truncate text-[11px] text-faint-foreground">{m.etichetta.norma}</p>
              </div>
              <Anello
                percentuale={m.conformita.percentuale}
                tinta={VAR[m.dominio]}
                dimensione={52}
                spessore={6}
              />
            </div>
            <p className="mt-3 font-mono text-[11px] text-faint-foreground">
              {m.conformita.numeratore}/{m.conformita.applicabili} in regola
            </p>
            <div className="mt-2">
              <Nastro c={m} />
            </div>
            <div className="mt-2.5 flex justify-between text-[11px]">
              <span className="text-scaduta">{m.scadute} scadute</span>
              <span className="text-imminente">{m.inScadenza} vicine</span>
            </div>
          </Scheda>
        ))}
      </div>

      {/* La scheda che NOMINA il problema. Non «12 scadute» ma la cosa peggiore, con la
          strada per andarci. È il pezzo che trasforma un cruscotto in uno strumento. */}
      {d.peggiore ? (
        <Scheda className="border-scaduta-border bg-scaduta-surface/40">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <AlertTriangle className="size-4 shrink-0 text-scaduta" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold tracking-[0.09em] text-scaduta uppercase">
                Richiede attenzione adesso
              </p>
              <p className="mt-0.5 text-sm">
                <b>{d.peggiore.azienda}</b>
                <span className="text-muted-foreground"> · </span>
                <span className="font-mono text-xs">{d.peggiore.codice}</span>
                <span className="text-muted-foreground"> · </span>
                {d.peggiore.titolo}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {d.peggiore.ruolo} · scaduto da {Math.abs(d.peggiore.giorni)} giorni
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">
              Aprilo
              <ArrowRight className="size-3.5" aria-hidden />
            </span>
          </div>
        </Scheda>
      ) : null}

      <div className="grid gap-3 lg:grid-cols-3">
        <Scheda>
          <TitoloScheda nota="Le quattro finestre che un consulente usa davvero.">Orizzonte</TitoloScheda>
          <ul className="space-y-2.5">
            {[
              { e: "Già scadute", n: d.complessivo.conteggi.Scaduta, k: "bg-scaduta" },
              { e: "Entro 7 giorni", n: 110, k: "bg-imminente" },
              { e: "Entro 30 giorni", n: 418, k: "bg-foreground/60" },
              { e: "Entro 90 giorni", n: 198, k: "bg-border-strong" },
            ].map((x, i, tutte) => {
              const max = Math.max(...tutte.map((y) => y.n), 1);
              return (
                <li key={x.e}>
                  <span className="flex items-baseline justify-between">
                    <span className="text-xs">{x.e}</span>
                    <span className="cifra text-base">{x.n}</span>
                  </span>
                  <span className="mt-1 flex h-1.5 overflow-hidden rounded-full bg-surface-sunken">
                    <span className={x.k} style={{ width: `${(x.n / max) * 100}%` }} />
                  </span>
                </li>
              );
            })}
          </ul>
        </Scheda>

        <Scheda>
          <TitoloScheda nota="L'intensità viene dal peso reale di ciò che cade nella cella.">
            Rischio e priorità
          </TitoloScheda>
          <table className="w-full border-separate border-spacing-[3px] text-center">
            <tbody>
              {[...d.fasce].reverse().map((f) => (
                <tr key={f.etichetta}>
                  <th className="pr-1 text-right text-[9px] font-medium whitespace-nowrap text-muted-foreground">
                    {f.etichetta}
                  </th>
                  {d.priorita.map((p) => {
                    const c = d.matrice.find((x) => x.fascia === f.etichetta && x.priorita === p);
                    const n = c?.quanti ?? 0;
                    return (
                      <td key={p} className="p-0">
                        <div
                          className="flex h-8 items-center justify-center rounded-md text-xs font-medium tabular-nums"
                          style={{
                            background:
                              n === 0
                                ? "var(--surface-sunken)"
                                : `color-mix(in oklch, var(--scaduta) ${Math.round(Math.max(0.12, c?.intensita ?? 0) * 60)}%, var(--surface-sunken))`,
                            color: n === 0 ? "var(--faint-foreground)" : "var(--foreground)",
                          }}
                        >
                          {n || "·"}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
              <tr>
                <td />
                {d.priorita.map((p) => (
                  <td key={p} className="pt-1 text-[9px] text-muted-foreground">
                    {p}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </Scheda>

        <Scheda>
          <TitoloScheda nota="Ordinate per quante scadenze sono già mancate.">Per categoria</TitoloScheda>
          <ul className="space-y-2">
            {d.perCategoria.map((v) => {
              const max = Math.max(...d.perCategoria.map((x) => x.quanti), 1);
              return (
                <li key={v.etichetta}>
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-xs">{v.etichetta}</span>
                    <span className="font-mono text-[10px] tabular-nums">
                      <span className="text-scaduta">{v.scaduti}</span>
                      <span className="text-faint-foreground">/{v.quanti}</span>
                    </span>
                  </span>
                  <span className="mt-1 flex h-1 overflow-hidden rounded-full bg-surface-sunken">
                    <span className="bg-scaduta" style={{ width: `${(v.scaduti / max) * 100}%` }} />
                    <span
                      className="bg-foreground/25"
                      style={{ width: `${((v.quanti - v.scaduti) / max) * 100}%` }}
                    />
                  </span>
                </li>
              );
            })}
          </ul>
        </Scheda>
      </div>
    </div>
  );
}

// ============================================================================================
// PORTAFOGLIO
// ============================================================================================

export function Portafoglio({ d }: { d: DatiVarianti }) {
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { v: d.righe.length, e: "aziende assistite", n: "18 moduli attivi su 18", c: "" },
          {
            v: d.complessivo.conteggi.Scaduta,
            e: "scadenze mancate",
            n: "sull'intero portafoglio",
            c: "text-scaduta",
          },
          {
            v: d.complessivo.conteggi["In scadenza"],
            e: "in scadenza a 30 giorni",
            n: "sull'intero portafoglio",
            c: "text-imminente",
          },
          {
            v: `${d.complessivo.conformita.percentuale}%`,
            e: "conformità mediana",
            n: `su ${d.righe.length} aziende avviate`,
            c: "",
          },
        ].map((x) => (
          <Scheda key={x.e} className="py-3">
            <Cifra valore={x.v} suffisso="" classe={x.c} />
            <p className="mt-1.5 text-xs text-muted-foreground">{x.e}</p>
            <p className="mt-0.5 text-[10px] text-faint-foreground">{x.n}</p>
          </Scheda>
        ))}
      </div>

      <Scheda className="p-0">
        <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-2.5">
          <span className="relative flex-1 sm:max-w-xs">
            <Search
              className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-faint-foreground"
              aria-hidden
            />
            <span className="flex h-7 items-center rounded-lg bg-surface-sunken pr-2 pl-8 text-xs text-faint-foreground">
              Cerca azienda, settore, sede
            </span>
          </span>
          <span className="font-mono text-[10px] text-muted-foreground">
            {d.righe.length}/{d.righe.length}
          </span>
          <span className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground">
            <Plus className="size-3.5" aria-hidden />
            Nuova azienda
          </span>
        </div>

        {/* Le righe sono SCHEDE BASSE: si sollevano al passaggio e la densità resta. */}
        <ul className="divide-y divide-border-subtle">
          {d.righe.map((r) => (
            <li
              key={r.nome}
              className="flex flex-wrap items-center gap-4 px-4 py-2.5 hover:bg-surface-raised"
            >
              <span className="min-w-48 flex-1">
                <span className="block text-sm font-medium">{r.nome}</span>
                <span className="block text-[11px] text-muted-foreground">
                  {r.settore} · {r.sede}
                </span>
              </span>
              {r.moduli.map((m) => (
                <span key={m.dominio} className="w-24">
                  <span className="flex items-baseline justify-between">
                    <span className={`text-[10px] font-medium ${TINTA[m.dominio]}`}>
                      {d.etichette[m.dominio].breve}
                    </span>
                    <span className="text-sm font-semibold tabular-nums">{m.conformita.percentuale}%</span>
                  </span>
                  <span className="mt-1 block">
                    <Nastro c={m} altezza={3} />
                  </span>
                </span>
              ))}
              <span className="w-16 text-right">
                <span className="cifra text-lg">{r.conformita.percentuale}%</span>
                <span className="block text-[9px] text-faint-foreground">complessivo</span>
              </span>
              <span className="w-14 text-right">
                <span
                  className={`font-mono text-sm font-semibold tabular-nums ${r.esposizione >= 70 ? "text-scaduta" : "text-imminente"}`}
                >
                  {r.esposizione}
                </span>
                <span className="block text-[9px] text-faint-foreground">esposiz.</span>
              </span>
            </li>
          ))}
        </ul>
      </Scheda>
    </div>
  );
}

// ============================================================================================
// SCADENZARIO
// ============================================================================================

export function Scadenzario({ d }: { d: DatiVarianti }) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex rounded-lg border border-border bg-surface p-0.5">
          {["Tutte", "Scadute", "7 giorni", "30 giorni", "90 giorni"].map((x, i) => (
            <span
              key={x}
              className={
                i === 3
                  ? "rounded-md bg-surface-raised px-3 py-1 text-xs font-medium"
                  : "px-3 py-1 text-xs text-muted-foreground"
              }
            >
              {x}
            </span>
          ))}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-muted-foreground">
          <SlidersHorizontal className="size-3.5" aria-hidden />
          Azienda · Decreto · Responsabile · Priorità
        </span>
        <span className="ml-auto font-mono text-[10px] text-muted-foreground">528/1254</span>
      </div>

      <Scheda className="p-0">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              {["Azienda", "Modulo", "Cod.", "Adempimento", "Responsabile", "Scadenza"].map((h) => (
                <th
                  key={h}
                  className="px-4 py-2 text-left text-[10px] font-semibold tracking-[0.09em] text-muted-foreground uppercase"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {d.prossime.map((v) => (
              <tr key={`${v.dominio}${v.codice}`} className="hover:bg-surface-raised">
                <td className="max-w-44 truncate px-4 py-2 text-xs">{v.azienda}</td>
                <td className="px-4 py-2">
                  <Pastiglia dominio={v.dominio} testo={d.etichette[v.dominio].breve} />
                </td>
                <td className="px-4 py-2 font-mono text-xs text-muted-foreground">{v.codice}</td>
                <td className="max-w-72 truncate px-4 py-2 text-sm">{v.titolo}</td>
                <td className="px-4 py-2 text-xs text-muted-foreground">{v.ruolo}</td>
                <td className="px-4 py-2">
                  <span
                    className={`font-mono text-xs font-medium tabular-nums ${classeStato(v.statoScadenza)}`}
                  >
                    {v.scadenza ? formattaIt(v.scadenza) : "—"}
                  </span>
                  <span className="ml-1.5 font-mono text-[10px] text-faint-foreground">
                    {v.giorni > 0 ? `+${v.giorni}` : v.giorni}gg
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Scheda>
    </div>
  );
}

// ============================================================================================
// SCHEDA AZIENDA
// ============================================================================================

export function Azienda({ d }: { d: DatiVarianti }) {
  const r = d.righe[0]!;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] text-muted-foreground">Portafoglio / {r.nome}</p>
          <h2 className="titolo mt-1 text-[1.7rem]">{r.nome}</h2>
          <p className="text-xs text-muted-foreground">
            {r.settore} · {r.sede} · P.IVA 02914770376
          </p>
        </div>
        <div className="flex items-end gap-6 text-right">
          <div>
            <Cifra
              valore={r.conformita.percentuale}
              su={`${r.conformita.numeratore}/${r.conformita.applicabili}`}
            />
            <p className="text-[11px] text-muted-foreground">conformità effettiva</p>
          </div>
          <div>
            <Cifra valore={r.esposizione} suffisso="" classe="text-scaduta" />
            <p className="text-[11px] text-muted-foreground">esposizione</p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        {r.moduli.map((m) => (
          <Scheda key={m.dominio}>
            <div className="flex items-start justify-between">
              <div>
                <Pastiglia dominio={m.dominio} testo={d.etichette[m.dominio].breve} />
                <p className="mt-0.5 text-xs text-muted-foreground">{d.etichette[m.dominio].esteso}</p>
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] text-regolare">
                <Check className="size-3.5" aria-hidden />
                attivo
              </span>
            </div>
            <div className="mt-3 flex items-end justify-between">
              <Cifra
                valore={m.conformita.percentuale}
                su={`${m.conformita.numeratore}/${m.conformita.applicabili}`}
              />
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-sunken px-2.5 py-1 text-[11px]">
                <Power className="size-3" aria-hidden />
                Disattiva
              </span>
            </div>
            <div className="mt-3">
              <Nastro c={m} />
            </div>
            <div className="mt-2 flex justify-between text-[11px]">
              <span className="text-scaduta">{m.scadute} scadute</span>
              <span className="text-imminente">{m.inScadenza} vicine</span>
              <span className="text-muted-foreground">{m.daProgrammare} da programmare</span>
            </div>
          </Scheda>
        ))}
      </div>

      <Scheda className="p-0">
        <div className="border-b border-border px-4 py-2.5">
          <h3 className="text-[11px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
            Prossime scadenze
          </h3>
        </div>
        <ul className="divide-y divide-border-subtle">
          {d.prossime.slice(0, 5).map((v) => (
            <li key={v.codice} className="flex items-center gap-3 px-4 py-2 hover:bg-surface-raised">
              <Pastiglia dominio={v.dominio} testo={v.codice} />
              <span className="min-w-0 flex-1 truncate text-sm">{v.titolo}</span>
              <span className="text-[11px] text-muted-foreground">{v.ruolo}</span>
              <span className={`font-mono text-xs tabular-nums ${classeStato(v.statoScadenza)}`}>
                {v.scadenza ? formattaIt(v.scadenza) : "—"}
              </span>
            </li>
          ))}
        </ul>
      </Scheda>
    </div>
  );
}

// ============================================================================================
// ASSESSMENT
// ============================================================================================

export function Assessment({ d }: { d: DatiVarianti }) {
  const m = d.perModulo[2]!;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] text-muted-foreground">Ferrarini Componenti / D.Lgs 81/2008</p>
          <h2 className="titolo mt-1 text-[1.7rem]">Salute e sicurezza sul lavoro</h2>
        </div>
        <div className="flex gap-6 text-right">
          <div>
            <Cifra
              valore={m.conformita.percentuale}
              su={`${m.conformita.numeratore}/${m.conformita.applicabili}`}
            />
            <p className="text-[11px] text-muted-foreground">conformità effettiva</p>
          </div>
          <div>
            <Cifra valore={m.scadute} suffisso="" classe="text-scaduta" />
            <p className="text-[11px] text-muted-foreground">scadute</p>
          </div>
        </div>
      </div>

      <Scheda className="p-0">
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2.5">
          <span className="relative sm:w-64">
            <Search
              className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-faint-foreground"
              aria-hidden
            />
            <span className="flex h-7 items-center rounded-lg bg-surface-sunken pr-2 pl-8 text-xs text-faint-foreground">
              Cerca codice, adempimento, norma
            </span>
          </span>
          {["Lavoro", "Scadenza", "Categoria", "Responsabile"].map((x) => (
            <span
              key={x}
              className="rounded-lg border border-border bg-surface-sunken px-2.5 py-1 text-[11px] text-muted-foreground"
            >
              {x}
            </span>
          ))}
          <span className="ml-auto font-mono text-[10px] text-muted-foreground">64/64</span>
        </div>

        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              {["Cod.", "Adempimento", "Responsabile", "Periodicità", "Lavoro", "Scadenza"].map((h) => (
                <th
                  key={h}
                  className="px-4 py-2 text-left text-[10px] font-semibold tracking-[0.09em] text-muted-foreground uppercase"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {d.assessment.map((a, i) => (
              <>
                {i === 0 || d.assessment[i - 1]!.categoria !== a.categoria ? (
                  <tr key={`c-${a.categoria}`}>
                    <td
                      colSpan={6}
                      className="bg-surface-sunken px-4 py-1 text-[10px] font-semibold tracking-[0.1em] uppercase"
                    >
                      {a.categoria}
                    </td>
                  </tr>
                ) : null}
                <tr key={a.codice} className="border-b border-border-subtle hover:bg-surface-raised">
                  <td className="px-4 py-1.5 font-mono text-xs text-muted-foreground">{a.codice}</td>
                  <td className="max-w-80 truncate px-4 py-1.5 text-sm">{a.titolo}</td>
                  <td className="px-4 py-1.5 text-[11px] text-muted-foreground">{a.ruolo}</td>
                  <td className="px-4 py-1.5 text-[11px] text-muted-foreground">{a.periodicita}</td>
                  <td className="px-4 py-1.5">
                    <span className="rounded-md border border-border bg-surface-sunken px-2 py-0.5 text-[11px]">
                      {a.stato}
                    </span>
                  </td>
                  <td className="px-4 py-1.5">
                    <span
                      className={`font-mono text-xs font-medium tabular-nums ${classeStato(a.statoScadenza)}`}
                    >
                      {a.scadenza ? formattaIt(a.scadenza) : "—"}
                    </span>
                    {a.giorni !== null ? (
                      <span className="ml-1.5 font-mono text-[10px] text-faint-foreground">
                        {a.giorni > 0 ? `+${a.giorni}` : a.giorni}gg
                      </span>
                    ) : null}
                  </td>
                </tr>
              </>
            ))}
          </tbody>
        </table>
      </Scheda>
    </div>
  );
}

// ============================================================================================
// IMPOSTAZIONI
// ============================================================================================

export function Impostazioni({ d }: { d: DatiVarianti }) {
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <Scheda>
        <TitoloScheda nota="Compare nella barra laterale e nell'intestazione delle relazioni.">
          Marchio dello studio
        </TitoloScheda>
        <div className="flex items-end gap-2">
          <span className="flex h-8 flex-1 items-center rounded-lg border border-border bg-surface-sunken px-2.5 text-sm">
            Studio Bertelli &amp; Associati
          </span>
          <span className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">
            Salva
          </span>
        </div>
      </Scheda>

      <Scheda>
        <TitoloScheda>Catalogo</TitoloScheda>
        <dl className="divide-y divide-border-subtle text-sm">
          {[
            ["Versione attiva", "Suite Compliance 2026.1"],
            ["Adempimenti", "171"],
            ...d.perModulo.map((m) => [`${m.etichetta.breve} · ${m.etichetta.norma}`, String(m.totale)]),
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between py-1.5">
              <dt className="text-xs text-muted-foreground">{k}</dt>
              <dd className="font-mono text-xs tabular-nums">{v}</dd>
            </div>
          ))}
        </dl>
      </Scheda>

      <Scheda className="lg:col-span-2 p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <h3 className="text-[11px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
            Utenze
          </h3>
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground">
            <Plus className="size-3.5" aria-hidden />
            Nuova utenza
          </span>
        </div>
        <ul className="divide-y divide-border-subtle">
          {[
            ["Chiara Bertelli", "chiara@studio.it", "Amministratore"],
            ["Marco Fanti", "marco@studio.it", "Consulente"],
            ["Elena Rizzo", "elena@studio.it", "Sola lettura"],
          ].map(([n, e, r]) => (
            <li key={e} className="flex items-center gap-4 px-4 py-2.5 hover:bg-surface-raised">
              <span className="flex-1 text-sm font-medium">{n}</span>
              <span className="flex-1 font-mono text-xs text-muted-foreground">{e}</span>
              <span className="rounded-md border border-border bg-surface-sunken px-2 py-0.5 text-[11px]">
                {r}
              </span>
            </li>
          ))}
        </ul>
      </Scheda>
    </div>
  );
}

// ============================================================================================
// ACCESSO
// ============================================================================================

export function Accesso() {
  return (
    <div className="grid overflow-hidden rounded-xl border border-border md:grid-cols-[1fr_360px]">
      <div className="flex flex-col justify-between bg-surface-sunken p-8">
        <div className="border-t-2 border-b border-foreground pt-2 pb-2.5">
          <p className="text-sm font-semibold tracking-widest uppercase">Studio Bertelli &amp; Associati</p>
        </div>
        <div className="py-10">
          <p className="text-[11px] tracking-[0.14em] text-muted-foreground uppercase">Suite Compliance</p>
          <h3 className="titolo mt-2 text-2xl">Tre decreti, un registro solo</h3>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
            Ogni obbligo porta due stati distinti: quello del lavoro, che lo decide una persona, e quello
            della scadenza, che lo decide la data.
          </p>
        </div>
        <p className="text-[11px] text-faint-foreground">Istanza dedicata. Accesso riservato.</p>
      </div>
      <div className="flex flex-col justify-center gap-4 bg-surface p-8">
        <h3 className="text-lg font-semibold">Accedi</h3>
        {["Indirizzo di posta", "Password"].map((l) => (
          <span key={l} className="block">
            <span className="mb-1 block text-[11px] font-medium">{l}</span>
            <span className="block h-8 rounded-lg border border-border bg-surface-sunken" />
          </span>
        ))}
        <span className="mt-1 block rounded-lg bg-primary py-2 text-center text-sm font-medium text-primary-foreground">
          Accedi
        </span>
      </div>
    </div>
  );
}
