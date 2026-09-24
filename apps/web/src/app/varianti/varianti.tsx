import { formattaIt, type Dominio } from "@legisboard/engine";
import type { DatiVarianti } from "./dati";

// TRE DIREZIONI DI DESIGN, sugli stessi identici numeri.
//
// Il confronto deve essere fra i disegni, non fra i contenuti: ogni variante riceve gli
// stessi dati del motore — 17%, 0%, 44%, esposizione 71 — e li mette in scena in modo
// diverso. Chi guarda deve poter dire «questa» senza dover tradurre in parole perché.
//
//   1 TERMINALE   massima densità, tutto monospaziato, griglia a filetti, spigoli vivi.
//                 Nessun riquadro: la struttura la fanno le linee. Bloomberg, Datadog.
//   2 SCHEDE      pannelli sollevati, spazio interno generoso, angoli tondi, gerarchia
//                 fatta di superfici. Attio, Linear.
//   3 EDITORIALE  cifre grandi in serif, filetti al posto delle scatole, molta aria,
//                 impaginazione da registro. Stripe, e la copertina della nostra perizia.
//
// Nessuna delle tre è «la nostra»: sono tre ipotesi da guardare.

const TINTA: Readonly<Record<Dominio, string>> = {
  gdpr: "text-gdpr",
  d231: "text-d231",
  d81: "text-d81",
};
const FONDO: Readonly<Record<Dominio, string>> = {
  gdpr: "bg-gdpr",
  d231: "bg-d231",
  d81: "bg-d81",
};

const classeStato = (s: string) =>
  s === "Scaduta"
    ? "text-scaduta"
    : s === "In scadenza"
      ? "text-imminente"
      : s === "Regolare"
        ? "text-regolare"
        : "text-programmare";

function Nastro({
  m,
  altezza = 3,
}: {
  m: DatiVarianti["righe"][number]["moduli"][number];
  altezza?: number;
}) {
  const pezzi = [
    { n: m.scadute, c: "bg-scaduta" },
    { n: m.inScadenza, c: "bg-imminente" },
    { n: m.regolari, c: "bg-regolare" },
    { n: m.daProgrammare, c: "bg-programmare/60" },
  ];
  return (
    <span className="flex w-full overflow-hidden rounded-full bg-surface-sunken" style={{ height: altezza }}>
      {pezzi
        .filter((p) => p.n > 0)
        .map((p, i) => (
          <span key={i} className={p.c} style={{ width: `${(p.n / m.totale) * 100}%` }} />
        ))}
    </span>
  );
}

// ============================================================================================
// 1 · TERMINALE
// ============================================================================================

export function VarianteTerminale({ d }: { d: DatiVarianti }) {
  return (
    <div className="border border-border-strong bg-surface font-mono text-xs">
      {/* Barra di stato in cima, come in un terminale: tutto su una riga, niente titoli. */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 border-b border-border-strong bg-surface-sunken px-3 py-1.5 text-[11px]">
        <span className="text-muted-foreground">
          PORTAFOGLIO <b className="text-foreground">{d.righe.length}</b>
        </span>
        <span className="text-muted-foreground">
          ADEMP <b className="text-foreground">{d.complessivo.conformita.applicabili}</b>
        </span>
        <span className="text-scaduta">SCAD {d.complessivo.conteggi.Scaduta}</span>
        <span className="text-imminente">IMM {d.complessivo.conteggi["In scadenza"]}</span>
        <span className="text-regolare">REG {d.complessivo.conteggi.Regolare}</span>
        <span className="text-muted-foreground">
          CONF <b className="text-foreground">{d.complessivo.conformita.percentuale}%</b>
        </span>
        <span className="ml-auto text-muted-foreground">
          ESP <b className="text-scaduta">{d.complessivo.esposizione.indice}</b>/100{" "}
          {d.complessivo.esposizione.giudizio.toUpperCase()}
        </span>
      </div>

      <table className="w-full">
        <thead>
          <tr className="border-b border-border-strong text-[10px] text-muted-foreground">
            <th className="px-3 py-1 text-left font-normal">AZIENDA</th>
            {d.domini.map((x) => (
              <th key={x} className={`px-2 py-1 text-right font-normal ${TINTA[x]}`}>
                {d.etichette[x].breve.toUpperCase()}
              </th>
            ))}
            <th className="px-2 py-1 text-right font-normal">TOT</th>
            <th className="px-3 py-1 text-right font-normal">ESP</th>
          </tr>
        </thead>
        <tbody>
          {d.righe.map((r) => (
            <tr key={r.nome} className="border-b border-border-subtle last:border-0 hover:bg-surface-raised">
              <td className="px-3 py-[3px] whitespace-nowrap">
                <span className="text-foreground">{r.nome}</span>
                <span className="ml-2 text-[10px] text-faint-foreground">{r.settore}</span>
              </td>
              {r.moduli.map((m) => (
                <td key={m.dominio} className="px-2 py-[3px] text-right tabular-nums">
                  <span className={m.scadute > 0 ? "text-foreground" : "text-muted-foreground"}>
                    {String(m.conformita.percentuale).padStart(3, " ")}%
                  </span>
                  {m.scadute > 0 ? <span className="ml-1 text-scaduta">-{m.scadute}</span> : null}
                </td>
              ))}
              <td className="px-2 py-[3px] text-right font-semibold tabular-nums">
                {r.conformita.percentuale}%
              </td>
              <td className="px-3 py-[3px] text-right tabular-nums">
                <span className={r.esposizione >= 70 ? "text-scaduta" : "text-imminente"}>
                  {r.esposizione}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="grid border-t border-border-strong md:grid-cols-2">
        <div className="border-b border-border-strong p-3 md:border-r md:border-b-0">
          <p className="mb-1.5 text-[10px] text-muted-foreground">SCADENZE IMMINENTI</p>
          <table className="w-full text-[11px]">
            <tbody>
              {d.prossime.slice(0, 6).map((v) => (
                <tr key={`${v.dominio}${v.codice}`}>
                  <td className={`py-[2px] pr-2 ${TINTA[v.dominio]}`}>{d.etichette[v.dominio].breve}</td>
                  <td className="py-[2px] pr-2 text-muted-foreground">{v.codice}</td>
                  <td className="max-w-56 truncate py-[2px] pr-2">{v.titolo}</td>
                  <td className={`py-[2px] text-right tabular-nums ${classeStato(v.statoScadenza)}`}>
                    {v.giorni > 0 ? `+${v.giorni}` : v.giorni}gg
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-3">
          <p className="mb-1.5 text-[10px] text-muted-foreground">RISCHIO x PRIORITA</p>
          <table className="w-full text-center text-[11px]">
            <tbody>
              {[...d.fasce].reverse().map((f) => (
                <tr key={f.etichetta}>
                  <td className="py-[2px] pr-2 text-right text-[10px] text-muted-foreground">
                    {f.etichetta.slice(0, 3).toUpperCase()}
                  </td>
                  {d.priorita.map((p) => {
                    const c = d.matrice.find((x) => x.fascia === f.etichetta && x.priorita === p);
                    const n = c?.quanti ?? 0;
                    return (
                      <td
                        key={p}
                        className={`border border-border-subtle py-[2px] tabular-nums ${n === 0 ? "text-faint-foreground" : "text-foreground"}`}
                        style={
                          n > 0
                            ? {
                                background: `color-mix(in oklch, var(--scaduta) ${Math.round((c?.intensita ?? 0.1) * 45)}%, transparent)`,
                              }
                            : undefined
                        }
                      >
                        {n || "."}
                      </td>
                    );
                  })}
                </tr>
              ))}
              <tr className="text-[9px] text-muted-foreground">
                <td />
                {d.priorita.map((p) => (
                  <td key={p} className="pt-1">
                    {p.slice(0, 4).toUpperCase()}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ============================================================================================
// 2 · SCHEDE
// ============================================================================================

export function VarianteSchede({ d }: { d: DatiVarianti }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {d.perModulo.map((m) => (
          <div key={m.dominio} className="rounded-xl border border-border bg-surface p-5">
            <div className="flex items-center justify-between">
              <span className={`text-sm font-semibold ${TINTA[m.dominio]}`}>{m.etichetta.breve}</span>
              <span className={`size-2 rounded-full ${FONDO[m.dominio]}`} aria-hidden />
            </div>
            <p className="mt-4 text-3xl font-semibold tracking-tight tabular-nums">
              {m.conformita.percentuale}%
            </p>
            <p className="text-xs text-muted-foreground">
              {m.conformita.numeratore} di {m.conformita.applicabili} in regola
            </p>
            <div className="mt-4">
              <Nastro m={m} altezza={6} />
            </div>
            <div className="mt-3 flex justify-between text-[11px]">
              <span className="text-scaduta">{m.scadute} scadute</span>
              <span className="text-imminente">{m.inScadenza} vicine</span>
            </div>
          </div>
        ))}
        <div className="rounded-xl border border-border-strong bg-surface-raised p-5">
          <span className="text-sm font-semibold">Esposizione</span>
          <p className="mt-4 text-3xl font-semibold tracking-tight tabular-nums">
            {d.complessivo.esposizione.indice}
            <span className="text-base font-normal text-faint-foreground">/100</span>
          </p>
          <p className="text-xs text-muted-foreground">{d.complessivo.esposizione.giudizio}</p>
          <div className="mt-4 flex h-1.5 overflow-hidden rounded-full bg-surface-sunken">
            <span className="bg-scaduta" style={{ width: `${d.complessivo.esposizione.indice}%` }} />
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            {d.complessivo.critici} adempimenti critici aperti
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface">
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <h3 className="text-sm font-semibold">Aziende assistite</h3>
          <span className="text-xs text-muted-foreground">{d.righe.length} clienti</span>
        </div>
        <ul className="divide-y divide-border-subtle">
          {d.righe.map((r) => (
            <li
              key={r.nome}
              className="flex flex-wrap items-center gap-4 px-5 py-3.5 hover:bg-surface-raised"
            >
              <span className="min-w-52 flex-1">
                <span className="block text-sm font-medium">{r.nome}</span>
                <span className="block text-xs text-muted-foreground">
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
                  <span className="mt-1.5 block">
                    <Nastro m={m} altezza={4} />
                  </span>
                </span>
              ))}
              <span className="w-20 text-right">
                <span className="block text-lg font-semibold tabular-nums">{r.esposizione}</span>
                <span className="block text-[10px] text-muted-foreground">esposizione</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ============================================================================================
// 3 · EDITORIALE
// ============================================================================================

export function VarianteEditoriale({ d }: { d: DatiVarianti }) {
  return (
    <div className="bg-surface px-8 py-7">
      <div className="border-t-2 border-b border-foreground pt-2.5 pb-3">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-[10px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
              Quadro di conformità
            </p>
            <p className="titolo mt-1 text-2xl">{d.righe.length} aziende assistite</p>
          </div>
          <div className="flex gap-10">
            {d.perModulo.map((m) => (
              <div key={m.dominio} className="text-right">
                <p className="cifra text-3xl">{m.conformita.percentuale}%</p>
                <p className={`text-[10px] tracking-wide uppercase ${TINTA[m.dominio]}`}>
                  {m.etichetta.breve}
                </p>
                <p className="font-mono text-[10px] text-faint-foreground">
                  {m.conformita.numeratore}/{m.conformita.applicabili}
                </p>
              </div>
            ))}
            <div className="border-l border-border pl-10 text-right">
              <p className="cifra text-3xl">{d.complessivo.esposizione.indice}</p>
              <p className="text-[10px] tracking-wide text-muted-foreground uppercase">esposizione</p>
              <p className="font-mono text-[10px] text-faint-foreground">
                {d.complessivo.esposizione.giudizio.toLowerCase()}
              </p>
            </div>
          </div>
        </div>
      </div>

      <table className="mt-6 w-full">
        <thead>
          <tr className="border-b border-border-strong">
            <th className="pb-2 text-left text-[10px] font-semibold tracking-[0.11em] text-muted-foreground uppercase">
              Azienda
            </th>
            {d.domini.map((x) => (
              <th
                key={x}
                className="pb-2 text-right text-[10px] font-semibold tracking-[0.11em] text-muted-foreground uppercase"
              >
                {d.etichette[x].breve}
              </th>
            ))}
            <th className="pb-2 text-right text-[10px] font-semibold tracking-[0.11em] text-muted-foreground uppercase">
              Complessivo
            </th>
          </tr>
        </thead>
        <tbody>
          {d.righe.map((r) => (
            <tr key={r.nome} className="border-b border-border-subtle">
              <td className="py-3">
                <span className="block text-[15px]">{r.nome}</span>
                <span className="block text-[11px] text-muted-foreground">
                  {r.settore} · {r.sede}
                </span>
              </td>
              {r.moduli.map((m) => (
                <td key={m.dominio} className="py-3 text-right">
                  <span className="cifra text-lg">{m.conformita.percentuale}%</span>
                  {m.scadute > 0 ? (
                    <span className="ml-1.5 font-mono text-[10px] text-scaduta">{m.scadute} scad.</span>
                  ) : null}
                </td>
              ))}
              <td className="py-3 text-right">
                <span className="cifra text-xl">{r.conformita.percentuale}%</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-8 grid gap-8 md:grid-cols-[2fr_1fr]">
        <div>
          <h3 className="text-[10px] font-semibold tracking-[0.11em] text-muted-foreground uppercase">
            Prossime scadenze
          </h3>
          <ul className="mt-2 divide-y divide-border-subtle border-t border-border">
            {d.prossime.slice(0, 6).map((v) => (
              <li key={`${v.dominio}${v.codice}`} className="flex items-baseline gap-3 py-2">
                <span className={`font-mono text-[10px] ${TINTA[v.dominio]}`}>
                  {d.etichette[v.dominio].breve} {v.codice}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm">{v.titolo}</span>
                <span className="text-[11px] text-muted-foreground">{v.ruolo}</span>
                <span className={`font-mono text-xs tabular-nums ${classeStato(v.statoScadenza)}`}>
                  {v.scadenza ? formattaIt(v.scadenza) : "—"}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="text-[10px] font-semibold tracking-[0.11em] text-muted-foreground uppercase">
            Composizione
          </h3>
          <dl className="mt-2 border-t border-border text-sm">
            {[
              { e: "Scadute", n: d.complessivo.conteggi.Scaduta, c: "text-scaduta" },
              { e: "In scadenza", n: d.complessivo.conteggi["In scadenza"], c: "text-imminente" },
              { e: "Regolari", n: d.complessivo.conteggi.Regolare, c: "text-regolare" },
              { e: "Da programmare", n: d.complessivo.conteggi["Da programmare"], c: "" },
            ].map((x) => (
              <div
                key={x.e}
                className="flex items-baseline justify-between border-b border-border-subtle py-2"
              >
                <dt className="text-[13px] text-muted-foreground">{x.e}</dt>
                <dd className={`cifra text-lg ${x.c}`}>{x.n}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
}
