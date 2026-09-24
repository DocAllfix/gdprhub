import { PastigliaDominio } from "@gdpr/ui/stato";
import { MAPPA, QUANTE_TESI, TOTALE } from "@/lib/dati";

const TINTA = { gdpr: "bg-gdpr/25", d231: "bg-d231/25", d81: "bg-d81/25" } as const;

// LA MAPPA DEL CATALOGO: 171 caselle, una per adempimento.
//
// Prende il posto della fascia «171 adempimenti · 3 decreti», cioè del numero grande con
// l'etichetta piccola: lo stampo più riconoscibile delle landing generate. Qui la quantità non
// si legge, si vede — ed è la stessa quantità, calcolata dal motore alla build.
//
// Le caselle in rosso sono gli adempimenti «Completata e Scaduta» dell'azienda d'esempio: la
// mappa del catalogo porta dritta alla tesi. Il rosso è quello della scadenza, e qui significa
// esattamente ciò che significa nel prodotto.
//
// Le caselle sono decorative per un lettore di schermo (`aria-hidden`): la stessa informazione
// è detta in parole sopra e sotto la mappa.
export function Mappa() {
  return (
    <div>
      <div className="grid gap-10 md:grid-cols-3 md:gap-8">
        {MAPPA.map((m) => (
          <div key={m.dominio} className="min-w-0">
            <div className="flex items-baseline justify-between gap-3">
              <PastigliaDominio dominio={m.dominio} />
              <span className="text-xs text-muted-foreground">{m.etichetta.norma}</span>
            </div>
            <p className="mt-3 flex items-baseline gap-2">
              <span className="text-cifra leading-none font-extrabold tracking-tight tabular-nums">{m.celle.length}</span>
              <span className="text-sm text-muted-foreground">{m.etichetta.esteso.toLowerCase()}</span>
            </p>
            <div aria-hidden className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(0.875rem,1fr))] gap-1">
              {m.celle.map((c) => (
                <span
                  key={c.codice}
                  className={`aspect-square rounded-2xs ${c.tesi ? "bg-scaduta" : TINTA[m.dominio]}`}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-2">
          <span aria-hidden className="size-3 rounded-2xs bg-foreground/20" />
          {TOTALE} adempimenti, uno per casella
        </span>
        <span className="inline-flex items-center gap-2">
          <span aria-hidden className="size-3 rounded-2xs bg-scaduta" />
          {QUANTE_TESI} completati e scaduti, oggi, nell&apos;azienda d&apos;esempio
        </span>
      </p>
    </div>
  );
}
