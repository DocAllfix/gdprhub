import { Check, ChevronRight, Clock, Search } from "lucide-react";
import { formattaIt } from "@gdpr/engine";
import type { DatiVarianti } from "../dati";
import { Cifra, Nastro, Pastiglia, Scheda, TINTA, VAR, classeStato } from "./pezzi";

// LO SCADENZARIO E L'ASSESSMENT, ripensati.
//
// Nella prima passata erano tabelle: righe e colonne dentro un riquadro. Funzionano, ma non
// dicono nulla che un foglio di calcolo non direbbe, e non è per quello che si compra uno
// strumento. Qui ognuna delle due prende la forma della domanda che le si fa.

// ============================================================================================
// SCADENZARIO — la forma è un ASSE DEL TEMPO, non un elenco
// ============================================================================================

export function ScadenzarioEvoluto({ d }: { d: DatiVarianti }) {
  const finestre = [
    { e: "scadute", n: d.complessivo.conteggi.Scaduta, k: "bg-scaduta", larghezza: 30 },
    { e: "entro 7 giorni", n: 110, k: "bg-imminente", larghezza: 12 },
    { e: "entro 30", n: 418, k: "bg-foreground/45", larghezza: 26 },
    { e: "entro 90", n: 198, k: "bg-border-strong", larghezza: 32 },
  ];

  // Le voci si raggruppano per QUANDO, non per azienda: la domanda è «cosa devo fare», e
  // un elenco piatto costringe a rileggere ogni riga per capire se è urgente.
  const gruppi = [
    { titolo: "Già scadute", nota: "intervento immediato", voci: d.prossime.filter((v) => v.giorni < 0) },
    {
      titolo: "Questa settimana",
      nota: "entro sette giorni",
      voci: d.prossime.filter((v) => v.giorni >= 0 && v.giorni <= 7),
    },
    {
      titolo: "Questo mese",
      nota: "entro trenta giorni",
      voci: d.prossime.filter((v) => v.giorni > 7 && v.giorni <= 30),
    },
  ].filter((g) => g.voci.length > 0);

  return (
    <div className="space-y-3">
      {/* L'ASSE. È il pezzo che rende questa schermata diversa da una tabella: la posizione
          orizzontale è il tempo, e la larghezza di ogni fascia è quanto lavoro contiene.
          Si legge prima di leggere. */}
      <Scheda rilievo>
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <h3 className="text-[11px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
              Orizzonte di novanta giorni
            </h3>
            <p className="mt-0.5 text-[11px] text-faint-foreground">
              La larghezza è quanto lavoro contiene ogni fascia, non quanto dura.
            </p>
          </div>
          <p className="text-[11px] text-muted-foreground">
            <span className="cifra text-lg text-foreground">1254</span> adempimenti da presidiare
          </p>
        </div>

        <div className="mt-4 flex overflow-hidden rounded-lg">
          {finestre.map((f) => (
            <div
              key={f.e}
              className="border-r border-surface last:border-0"
              style={{ width: `${f.larghezza}%` }}
            >
              <div className={`h-1.5 ${f.k}`} />
              <div className="bg-surface-sunken px-2.5 py-2">
                <p className="cifra text-xl">{f.n}</p>
                <p className="text-[10px] text-muted-foreground">{f.e}</p>
              </div>
            </div>
          ))}
        </div>

        {/* L'ancora temporale: senza «oggi» segnato, un asse è solo una barra colorata. */}
        <div className="mt-1.5 flex text-[10px] text-faint-foreground">
          <span style={{ width: "30%" }} className="text-left">
            passato
          </span>
          <span className="relative -ml-3 text-foreground">
            <span className="mr-1 inline-block h-2 w-px bg-foreground align-middle" />
            oggi
          </span>
          <span className="ml-auto">+90 giorni</span>
        </div>
      </Scheda>

      <div className="flex flex-wrap items-center gap-2">
        <span className="relative sm:w-72">
          <Search
            className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-faint-foreground"
            aria-hidden
          />
          <span className="flex h-8 items-center rounded-lg border border-border bg-surface pr-2 pl-8 text-xs text-faint-foreground">
            Cerca azienda, codice o adempimento
          </span>
        </span>
        {["Tutte le aziende", "Tutti i decreti", "Ogni responsabile", "Ogni priorità"].map((x) => (
          <span
            key={x}
            className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[11px] text-muted-foreground"
          >
            {x}
          </span>
        ))}
        <span className="ml-auto font-mono text-[10px] text-muted-foreground">528 di 1254</span>
      </div>

      {/* Gruppi temporali con intestazione: chi scorre sa sempre in che fascia si trova. */}
      <div className="space-y-3">
        {gruppi.map((g) => (
          <Scheda key={g.titolo} className="p-0">
            <div className="flex items-baseline gap-2.5 border-b border-border px-4 py-2.5">
              <Clock className="size-3.5 text-muted-foreground" aria-hidden />
              <h3 className="text-[11px] font-semibold tracking-[0.1em] uppercase">{g.titolo}</h3>
              <span className="text-[11px] text-faint-foreground">{g.nota}</span>
              <span className="ml-auto cifra text-base">{g.voci.length}</span>
            </div>
            <ul className="divide-y divide-border-subtle">
              {g.voci.map((v) => (
                <li
                  key={`${v.dominio}${v.codice}`}
                  className="flex items-center gap-3 px-4 py-2 hover:bg-surface-raised"
                >
                  {/* Le iniziali dell'azienda: si scandiscono più in fretta di un nome
                      lungo ripetuto venti volte di fila. */}
                  <span className="grid size-7 shrink-0 place-items-center rounded-md bg-surface-sunken font-mono text-[10px] font-semibold text-muted-foreground">
                    {v.azienda
                      .split(" ")
                      .slice(0, 2)
                      .map((p) => p[0])
                      .join("")}
                  </span>
                  <span className="w-36 shrink-0">
                    <span className="block truncate text-xs">{v.azienda}</span>
                    <Pastiglia dominio={v.dominio} testo={`${d.etichette[v.dominio].breve} ${v.codice}`} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">{v.titolo}</span>
                    <span className="block text-[10px] text-muted-foreground">
                      {v.ruolo} · {v.periodicita}
                    </span>
                  </span>

                  {/* Il calibro dei giorni: l'urgenza si vede come POSIZIONE, non solo come
                      colore. Chi è daltonico legge la barra, non la tinta. */}
                  <span className="hidden w-28 shrink-0 md:block">
                    <span className="flex h-1 overflow-hidden rounded-full bg-surface-sunken">
                      <span
                        className={
                          v.giorni < 0 ? "bg-scaduta" : v.giorni <= 7 ? "bg-imminente" : "bg-foreground/40"
                        }
                        style={{ width: `${Math.max(4, 100 - Math.min(100, Math.abs(v.giorni)))}%` }}
                      />
                    </span>
                  </span>
                  <span className="w-24 shrink-0 text-right">
                    <span
                      className={`block font-mono text-xs font-medium tabular-nums ${classeStato(v.statoScadenza)}`}
                    >
                      {v.giorni < 0 ? `${v.giorni}` : `+${v.giorni}`} gg
                    </span>
                    <span className="block font-mono text-[10px] text-faint-foreground">
                      {v.scadenza ? formattaIt(v.scadenza) : "—"}
                    </span>
                  </span>
                  <ChevronRight className="size-3.5 shrink-0 text-faint-foreground" aria-hidden />
                </li>
              ))}
            </ul>
          </Scheda>
        ))}
      </div>
    </div>
  );
}

// ============================================================================================
// ASSESSMENT — la forma è un BANCO DA LAVORO, non una tabella
// ============================================================================================

export function AssessmentEvoluto({ d }: { d: DatiVarianti }) {
  const m = d.perModulo[2]!;
  const categorie = [
    { nome: "Documenti Obbligatori", tot: 21, fatti: 12, scaduti: 5 },
    { nome: "Formazione", tot: 17, fatti: 9, scaduti: 4 },
    { nome: "Nomine e Figure", tot: 8, fatti: 5, scaduti: 1 },
    { nome: "Attrezzature e Luoghi", tot: 8, fatti: 2, scaduti: 2 },
    { nome: "Riunioni e Adempimenti", tot: 6, fatti: 0, scaduti: 0 },
    { nome: "Sorveglianza Sanitaria", tot: 4, fatti: 0, scaduti: 0 },
  ];

  return (
    <div className="space-y-3">
      {/* I DUE ASSI, dichiarati. È la cosa che nessun concorrente rappresenta, e finora
          stava solo nelle colonne: qui è una matrice due per due che si legge in un colpo.
          «Completata e scaduta» è la casella che conta. */}
      <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
        <Scheda rilievo>
          <div className="flex flex-wrap items-center gap-6">
            <div>
              <Cifra
                valore={m.conformita.percentuale}
                su={`${m.conformita.numeratore}/${m.conformita.applicabili}`}
              />
              <p className="text-[11px] text-muted-foreground">conformità effettiva</p>
            </div>
            <div className="h-10 w-px bg-border" />
            <div className="min-w-56 flex-1">
              <p className="mb-1.5 text-[10px] font-semibold tracking-[0.09em] text-muted-foreground uppercase">
                I due assi
              </p>
              <table className="text-[11px]">
                <thead>
                  <tr className="text-faint-foreground">
                    <th className="pr-3 text-left font-normal" />
                    <th className="px-2 text-right font-normal">regolare</th>
                    <th className="px-2 text-right font-normal">in scad.</th>
                    <th className="pl-2 text-right font-normal">scaduta</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { l: "Completata", v: [16, 14, 12], forte: 2 },
                    { l: "In corso", v: [4, 0, 0] },
                    { l: "Da fare", v: [0, 0, 0] },
                  ].map((r) => (
                    <tr key={r.l}>
                      <td className="pr-3 text-muted-foreground">{r.l}</td>
                      {r.v.map((n, i) => (
                        <td
                          key={i}
                          className={`px-2 text-right font-mono tabular-nums ${
                            r.forte === i ? "font-semibold text-scaduta" : "text-foreground"
                          }`}
                        >
                          {n || "·"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-1.5 text-[10px] leading-relaxed text-faint-foreground">
                <b className="text-scaduta">12</b> adempimenti risultano <b>completati</b> e nondimeno{" "}
                <b>scaduti</b>: il documento fu redatto, il ciclo è finito.
              </p>
            </div>
          </div>
        </Scheda>

        <Scheda className="lg:w-56">
          <p className="text-[10px] font-semibold tracking-[0.09em] text-muted-foreground uppercase">
            Composizione
          </p>
          <div className="mt-2">
            <Nastro c={m} altezza={7} />
          </div>
          <dl className="mt-2.5 space-y-1 text-[11px]">
            {[
              ["scadute", m.scadute, "text-scaduta"],
              ["in scadenza", m.inScadenza, "text-imminente"],
              ["regolari", m.regolari, "text-regolare"],
              ["da programmare", m.daProgrammare, ""],
            ].map(([e, n, c]) => (
              <div key={String(e)} className="flex justify-between">
                <dt className="text-muted-foreground">{e}</dt>
                <dd className={`font-mono tabular-nums ${c}`}>{n}</dd>
              </div>
            ))}
          </dl>
        </Scheda>
      </div>

      {/* BANCO DA LAVORO: colonna delle categorie a sinistra con l'avanzamento, righe a
          destra. La colonna è navigazione E quadro d'insieme insieme: si vede subito quale
          categoria è indietro, cosa che in una tabella piatta si scopre solo scorrendo. */}
      <div className="grid gap-3 lg:grid-cols-[230px_1fr]">
        <Scheda className="p-0">
          <div className="border-b border-border px-3 py-2.5">
            <h3 className="text-[10px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
              Categorie
            </h3>
          </div>
          <ul className="p-1.5">
            {categorie.map((c, i) => (
              <li key={c.nome}>
                <span
                  className={`block rounded-lg px-2.5 py-2 ${i === 0 ? "bg-surface-raised" : "hover:bg-surface-raised"}`}
                >
                  <span className="flex items-baseline justify-between gap-2">
                    <span className={`truncate text-xs ${i === 0 ? "font-medium" : ""}`}>{c.nome}</span>
                    <span className="font-mono text-[10px] text-faint-foreground">
                      {c.fatti}/{c.tot}
                    </span>
                  </span>
                  <span className="mt-1.5 flex h-1 overflow-hidden rounded-full bg-surface-sunken">
                    <span className="bg-scaduta" style={{ width: `${(c.scaduti / c.tot) * 100}%` }} />
                    <span
                      className="bg-regolare"
                      style={{ width: `${((c.fatti - c.scaduti) / c.tot) * 100}%` }}
                    />
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </Scheda>

        <Scheda className="p-0">
          <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2.5">
            <span className="relative sm:w-56">
              <Search
                className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-faint-foreground"
                aria-hidden
              />
              <span className="flex h-7 items-center rounded-lg bg-surface-sunken pr-2 pl-8 text-xs text-faint-foreground">
                Cerca codice o adempimento
              </span>
            </span>
            {["Lavoro", "Scadenza", "Responsabile"].map((x) => (
              <span
                key={x}
                className="rounded-lg border border-border bg-surface-sunken px-2.5 py-1 text-[11px] text-muted-foreground"
              >
                {x}
              </span>
            ))}
            <span className="ml-auto font-mono text-[10px] text-muted-foreground">21 di 64</span>
          </div>

          <ul className="divide-y divide-border-subtle">
            {d.assessment.slice(0, 7).map((a) => (
              <li key={a.codice} className="flex items-center gap-3 px-4 py-2 hover:bg-surface-raised">
                <span className="w-10 shrink-0 font-mono text-xs text-muted-foreground">{a.codice}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm">{a.titolo}</span>
                  <span className="block text-[10px] text-muted-foreground">
                    {a.ruolo} · {a.periodicita} · priorità {a.priorita.toLowerCase()}
                  </span>
                </span>

                {/* Lo stato del lavoro è un comando, e si vede che lo è: quattro segmenti
                    dove quello attivo è pieno. Una tendina nasconde le opzioni; qui si
                    cambia con un colpo e si legge senza aprire niente. */}
                <span className="hidden shrink-0 overflow-hidden rounded-lg border border-border md:flex">
                  {["Da fare", "In corso", "Completata"].map((s) => (
                    <span
                      key={s}
                      className={`px-2 py-1 text-[10px] ${
                        a.stato === s
                          ? "bg-surface-raised font-medium text-foreground"
                          : "text-faint-foreground"
                      }`}
                    >
                      {s === "Completata" ? <Check className="size-3" aria-hidden /> : s}
                    </span>
                  ))}
                </span>

                <span className="w-24 shrink-0 text-right">
                  <span
                    className={`block font-mono text-xs font-medium tabular-nums ${classeStato(a.statoScadenza)}`}
                  >
                    {a.scadenza ? formattaIt(a.scadenza) : "—"}
                  </span>
                  <span className="block font-mono text-[10px] text-faint-foreground">
                    {a.giorni === null ? "nessuna scadenza" : `${a.giorni > 0 ? "+" : ""}${a.giorni}gg`}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </Scheda>
      </div>

      <p className="text-[11px] text-faint-foreground">
        Il modulo è <span className={TINTA[m.dominio]}>{m.etichetta.breve}</span>, e infatti il colore del
        decreto qui NON compare: dentro il modulo è già dato dal contesto, ripeterlo sarebbe rumore. Riappare
        nello scadenzario, dove i tre convivono.
        <span
          className="ml-1 inline-block size-1.5 rounded-full align-middle"
          style={{ background: VAR[m.dominio] }}
        />
      </p>
    </div>
  );
}
