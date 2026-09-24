import { Codice, PastigliaDominio, Scadenza, StatoLavoroEtichetta } from "@gdpr/ui/stato";
import { CELLA_PREDEFINITA, LAVORI, MATRICE, SCADENZE } from "@/lib/dati";

const COLORE_SCADENZA = {
  Scaduta: "text-scaduta",
  "In scadenza": "text-imminente",
  Regolare: "text-regolare",
  "Da programmare": "text-programmare",
} as const;

// LA MATRICE DEI DUE ASSI, CON I CONTEGGI VERI DELLA DEMO E ZERO JAVASCRIPT.
//
// Ogni cella non vuota è l'etichetta di un pulsante di scelta; l'elenco sotto mostra le righe
// della cella scelta (regole in `globals.css`). Il browser fa tutto: clic, frecce, spazio, e
// l'annuncio per i lettori di schermo. La cella «Completata e Scaduta» arriva già scelta dal
// server, quindi chi non esegue script vede subito il caso che conta.
//
// Una cella vuota non è una scelta: portare a un elenco senza righe sarebbe un clic che
// promette e non mantiene. È la stessa regola della matrice nel prodotto.
export function Matrice() {
  return (
    <div className="matrice">
      {/* `min-w-0`: un <fieldset> ha di serie `min-inline-size: min-content`, quindi si allarga
          fino alla tabella e rende inutile il contenitore scorrevole che ha dentro. Misurato: 421 px
          su un telefono da 390. */}
      <fieldset className="min-w-0">
        <legend className="sr-only">Scegli una combinazione di stato del lavoro e stato della scadenza</legend>
        <div className="overflow-x-auto rounded-lg border bg-surface">
          <table className="w-full text-sm">
            <thead>
              {/* Sul foglio e non sull'incavo: su `--surface-sunken` «Da programmare» scendeva a 4,40:1. */}
              <tr className="border-b border-border-strong bg-surface">
                <th
                  scope="col"
                  className="px-3 py-2.5 text-left text-micro font-semibold tracking-widest text-muted-foreground uppercase"
                >
                  Lavoro ↓ · Scadenza →
                </th>
                {SCADENZE.map((s) => (
                  <th key={s} scope="col" className={`px-2 py-2.5 text-right text-xs font-semibold ${COLORE_SCADENZA[s]}`}>
                    {s}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MATRICE.map((riga, i) => (
                <tr key={LAVORI[i]} className="border-b border-border-subtle last:border-b-0">
                  <th scope="row" className="px-3 py-1.5 text-left font-normal whitespace-nowrap">
                    <StatoLavoroEtichetta stato={LAVORI[i]!} />
                  </th>
                  {riga.map((c) => (
                    <td key={c.id} className="px-1 py-1 text-right">
                      {c.quanti > 0 ? (
                        <label
                          /* `relative`: il pulsante nascosto è `sr-only`, cioè assoluto. Senza un antenato posizionato il suo blocco contenitore è la pagina, sfugge al taglio del contenitore scorrevole e allarga il documento: misurato, 425 px su 390. */
                          className="cella relative inline-flex min-h-11 min-w-11 items-center justify-end rounded-sm px-3 font-mono tabular-nums">
                          <input
                            type="radio"
                            name="cella"
                            id={`cella-${c.id}`}
                            value={c.id}
                            defaultChecked={c.id === CELLA_PREDEFINITA.id}
                            className="sr-only"
                            aria-label={`${c.quanti} adempimenti: ${c.lavoro} e ${c.scadenza}`}
                          />
                          <span
                            className={
                              c.lavoro === "Completata" && c.scadenza === "Scaduta" ? "font-semibold text-scaduta" : ""
                            }
                          >
                            {c.quanti}
                          </span>
                        </label>
                      ) : (
                        <span className="inline-flex min-h-11 min-w-11 items-center justify-end px-3 font-mono text-muted-foreground">
                          ·
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </fieldset>

      <div className="mt-6">
        {MATRICE.flat()
          .filter((c) => c.quanti > 0)
          .map((c) => (
            <div key={c.id} data-cella={c.id}>
              <p className="text-sm">
                <span className="font-mono font-semibold tabular-nums">{c.quanti}</span>{" "}
                {c.quanti === 1 ? "adempimento" : "adempimenti"} · <strong className="font-semibold">{c.lavoro}</strong> e{" "}
                <strong className={`font-semibold ${COLORE_SCADENZA[c.scadenza]}`}>{c.scadenza.toLowerCase()}</strong>
                {c.quanti > c.righe.length ? (
                  <span className="text-muted-foreground"> — i {c.righe.length} più urgenti</span>
                ) : null}
              </p>
              <ul className="mt-3 divide-y divide-border-subtle rounded-lg border bg-surface">
                {c.righe.map((r) => (
                  <li
                    key={`${r.dominio}:${r.codice}`}
                    className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1 px-4 py-2.5 sm:grid-cols-[auto_1fr_auto]"
                  >
                    <span className="flex items-center gap-2">
                      <PastigliaDominio dominio={r.dominio} />
                      <Codice codice={r.codice} />
                    </span>
                    <span className="min-w-0 truncate text-sm">{r.titolo}</span>
                    <span className="col-span-2 sm:col-span-1 sm:text-right">
                      <Scadenza data={r.scadenza} giorni={r.giorni} statoScadenza={r.statoScadenza} />
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
      </div>
    </div>
  );
}
