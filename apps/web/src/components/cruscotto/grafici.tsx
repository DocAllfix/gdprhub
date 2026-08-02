import type { Dominio } from "@gdpr/engine";
import { cn } from "@/lib/utils";

// I grafici del cruscotto. SVG e CSS, nessuna libreria.
//
// Il prototipo 231 caricava Recharts: 641 KB per quattro grafici, ed è la ragione per cui
// quel file impiega secondi ad aprirsi. Qui un anello è un cerchio con un tratteggio e una
// barra è un div: si disegnano sul server, non costano un byte di JavaScript al client, e
// arrivano già pieni invece di comparire dopo.

const TINTA_DOMINIO: Readonly<Record<Dominio, string>> = {
  gdpr: "var(--gdpr)",
  d231: "var(--d231)",
  d81: "var(--d81)",
};

/**
 * L'anello di conformità.
 *
 * Non è una torta: una torta divide un intero in fette e invita a confrontare aree, che
 * l'occhio fa male. Un anello risponde a una domanda sola — quanta parte è coperta — ed è
 * quella la domanda. Al centro la cifra, perché il numero resta più preciso dell'arco.
 */
export function Anello({
  percentuale,
  tinta,
  dimensione = 92,
  spessore = 9,
  etichetta,
}: {
  percentuale: number | null;
  tinta: string;
  dimensione?: number;
  spessore?: number;
  etichetta?: string;
}) {
  const r = (dimensione - spessore) / 2;
  const circonferenza = 2 * Math.PI * r;
  const quota = percentuale === null ? 0 : Math.max(0, Math.min(100, percentuale)) / 100;

  return (
    <svg
      width={dimensione}
      height={dimensione}
      viewBox={`0 0 ${dimensione} ${dimensione}`}
      role="img"
      aria-label={etichetta ?? `${percentuale ?? 0}%`}
      className="shrink-0"
    >
      <circle
        cx={dimensione / 2}
        cy={dimensione / 2}
        r={r}
        fill="none"
        stroke="var(--border)"
        strokeWidth={spessore}
      />
      {quota > 0 ? (
        <circle
          cx={dimensione / 2}
          cy={dimensione / 2}
          r={r}
          fill="none"
          stroke={tinta}
          strokeWidth={spessore}
          strokeLinecap="butt"
          strokeDasharray={`${circonferenza * quota} ${circonferenza}`}
          transform={`rotate(-90 ${dimensione / 2} ${dimensione / 2})`}
        />
      ) : null}
      <text
        x="50%"
        y="50%"
        dominantBaseline="central"
        textAnchor="middle"
        className="fill-foreground font-semibold tabular-nums"
        style={{ fontSize: dimensione * 0.26 }}
      >
        {percentuale === null ? "—" : `${percentuale}%`}
      </text>
    </svg>
  );
}

/**
 * La barra di composizione: quattro stati in un unico nastro, in proporzione.
 *
 * Sostituisce quattro numeri sparsi. Un consulente vede in un colpo se il rosso occupa un
 * terzo della riga, e non deve dividere 36 per 171 nella testa.
 */
export function Nastro({
  segmenti,
  altezza = 8,
}: {
  segmenti: readonly { quanti: number; colore: string; etichetta: string }[];
  altezza?: number;
}) {
  const totale = segmenti.reduce((t, s) => t + s.quanti, 0);
  if (totale === 0) return null;
  return (
    <div
      className="flex w-full overflow-hidden rounded-full"
      style={{ height: altezza }}
      role="img"
      aria-label={segmenti.map((s) => `${s.etichetta}: ${s.quanti}`).join(", ")}
    >
      {segmenti
        .filter((s) => s.quanti > 0)
        .map((s) => (
          <span
            key={s.etichetta}
            title={`${s.etichetta}: ${s.quanti}`}
            style={{ width: `${(s.quanti / totale) * 100}%`, background: s.colore }}
          />
        ))}
    </div>
  );
}

/**
 * Distribuzione a barre orizzontali, ordinata per quanti sono in ritardo.
 *
 * Dal grafico a barre del prototipo 231, con una differenza che conta: lì la barra diceva
 * solo quanti adempimenti c'erano per categoria, cioè una proprietà del catalogo che non
 * cambia mai. Qui la barra porta DENTRO la quota di scaduti, così dice dove si sta perdendo
 * terreno invece di quanto è lungo l'elenco.
 */
export function Distribuzione({
  voci,
  vuoto = "Nessun dato",
}: {
  voci: readonly { etichetta: string; quanti: number; scaduti: number }[];
  vuoto?: string;
}) {
  if (voci.length === 0) return <p className="text-xs text-muted-foreground">{vuoto}</p>;
  const massimo = Math.max(...voci.map((v) => v.quanti), 1);

  return (
    <ul className="space-y-1.5">
      {voci.map((v) => (
        <li key={v.etichetta} className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1">
          <span className="truncate text-xs" title={v.etichetta}>
            {v.etichetta}
          </span>
          <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
            {v.scaduti > 0 ? <span className="text-scaduta">{v.scaduti}</span> : null}
            {v.scaduti > 0 ? "/" : null}
            {v.quanti}
          </span>
          <span className="col-span-2 flex h-1.5 overflow-hidden rounded-full bg-surface-sunken">
            <span className="bg-scaduta" style={{ width: `${(v.scaduti / massimo) * 100}%` }} aria-hidden />
            <span
              className="bg-accento/35"
              style={{ width: `${((v.quanti - v.scaduti) / massimo) * 100}%` }}
              aria-hidden
            />
          </span>
        </li>
      ))}
    </ul>
  );
}

/**
 * La matrice rischio × priorità.
 *
 * Dal prototipo GDPR, che però la disegnava con intensità POSIZIONALE: la cella in basso a
 * destra era rossa perché stava in basso a destra, non perché ci fosse qualcosa dentro. Qui
 * l'intensità viene dal peso reale degli adempimenti che ci cadono, e una cella vuota resta
 * vuota anche se sta nell'angolo peggiore.
 */
export function Matrice({
  celle,
  fasce,
  priorita,
}: {
  celle: readonly { fascia: string; priorita: string; quanti: number; intensita: number }[];
  fasce: readonly { etichetta: string }[];
  priorita: readonly string[];
}) {
  const trova = (f: string, p: string) => celle.find((c) => c.fascia === f && c.priorita === p);

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-0.5 text-center">
        <thead>
          <tr>
            <th className="w-20" />
            {priorita.map((p) => (
              <th key={p} className="pb-1 text-[10px] font-medium tracking-wide text-muted-foreground">
                {p}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[...fasce].reverse().map((f) => (
            <tr key={f.etichetta}>
              <th className="pr-2 text-right text-[10px] font-medium whitespace-nowrap text-muted-foreground">
                {f.etichetta}
              </th>
              {priorita.map((p) => {
                const c = trova(f.etichetta, p);
                const n = c?.quanti ?? 0;
                const i = c?.intensita ?? 0;
                return (
                  <td key={p} className="p-0">
                    <div
                      className={cn(
                        "flex h-9 items-center justify-center rounded-sm border text-xs font-medium tabular-nums",
                        n === 0
                          ? "border-border-subtle text-faint-foreground"
                          : "border-transparent text-foreground",
                      )}
                      style={
                        n === 0
                          ? undefined
                          : {
                              // L'intensità viene dai dati. Il minimo 0.1 serve solo a far
                              // vedere che la cella non è vuota, non a suggerire gravità.
                              background: `color-mix(in oklch, var(--scaduta) ${Math.round(Math.max(0.1, i) * 55)}%, var(--surface))`,
                            }
                      }
                      title={`${f.etichetta} · ${p}: ${n} adempimenti da presidiare`}
                    >
                      {n === 0 ? "·" : n}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Scomposizione dell'indice di esposizione: l'aritmetica in chiaro, come nel documento. */
export function Scomposizione({
  componenti,
  indice,
}: {
  componenti: readonly { nome: string; valore: number; peso: number; spiega: string }[];
  indice: number;
}) {
  return (
    <div className="space-y-2.5">
      {componenti.map((c) => (
        <div key={c.nome} className="grid grid-cols-[7.5rem_3.5rem_1fr_2.5rem] items-center gap-2">
          <span className="truncate text-xs">{c.nome}</span>
          <span className="font-mono text-[10px] text-muted-foreground">
            {c.valore.toFixed(2)}×{c.peso.toFixed(2)}
          </span>
          <span className="flex h-1.5 overflow-hidden rounded-full bg-surface-sunken">
            <span className="bg-foreground" style={{ width: `${c.valore * c.peso * 100 * 1.8}%` }} />
          </span>
          <span className="text-right font-mono text-[10px] tabular-nums">
            {(c.valore * c.peso * 100).toFixed(1)}
          </span>
          <span className="col-span-4 -mt-1 text-[10px] text-faint-foreground">{c.spiega}</span>
        </div>
      ))}
      <div className="flex items-baseline justify-between border-t border-border pt-2">
        <span className="text-xs font-medium">Indice</span>
        <span className="font-mono text-sm font-semibold tabular-nums">{indice}</span>
      </div>
    </div>
  );
}

export { TINTA_DOMINIO };
