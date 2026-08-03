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
            {/* Neutro: questa parte della barra è «il resto», non «la parte in regola», e
                con l'accento oliva verrebbe letta come il verde dello stato. */}
            <span
              className="bg-border-strong"
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

/**
 * La ciambella di composizione: di che cosa è fatto il totale.
 *
 * Il `Nastro` dice la stessa cosa in una riga sottile, e infatti resta dov'è: serve quando
 * la composizione è un dettaglio dentro una riga di tabella. La ciambella serve quando la
 * composizione È la domanda, e allora il totale al centro e le quattro quote leggibili
 * valgono i loro centocinquanta pixel.
 *
 * Un cerchio con quattro tratteggi, niente libreria. I due pixel tolti a ogni arco sono lo
 * stacco fra gli spicchi: senza, quattro archi dello stesso spessore diventano un anello
 * solo e si perde il confine.
 */
export function Ciambella({
  segmenti,
  totale,
  didascalia = "adempimenti",
}: {
  segmenti: readonly { quanti: number; colore: string; etichetta: string }[];
  totale: number;
  didascalia?: string;
}) {
  const vive = segmenti.filter((s) => s.quanti > 0);
  if (totale === 0 || vive.length === 0) return null;

  const D = 150;
  const S = 22;
  const r = (D - S) / 2;
  const giro = 2 * Math.PI * r;

  // Gli scarti si calcolano PRIMA di disegnare, non accumulando una variabile dentro la
  // mappa: il compilatore di React rifiuta una riassegnazione durante il rendering, e ha
  // ragione — un rendering che dipende dall'ordine in cui gli elementi vengono valutati è
  // un rendering che si rompe il giorno in cui qualcosa li valuta due volte.
  const archi = vive.reduce<{ s: (typeof vive)[number]; quota: number; scarto: number }[]>(
    (acc, s) => {
      const scarto = acc.reduce((t, a) => t + a.quota, 0);
      acc.push({ s, quota: s.quanti / totale, scarto });
      return acc;
    },
    [],
  );

  return (
    <div className="flex flex-wrap items-center gap-5">
      <svg
        width={D}
        height={D}
        viewBox={`0 0 ${D} ${D}`}
        className="shrink-0"
        role="img"
        aria-label={`${totale} ${didascalia}: ${vive.map((s) => `${s.etichetta} ${s.quanti}`).join(", ")}`}
      >
        {archi.map(({ s, quota, scarto }) => (
          <circle
            key={s.etichetta}
            cx={D / 2}
            cy={D / 2}
            r={r}
            fill="none"
            stroke={s.colore}
            strokeWidth={S}
            strokeDasharray={`${Math.max(0, giro * quota - 2)} ${giro}`}
            strokeDashoffset={-giro * scarto + 1}
            transform={`rotate(-90 ${D / 2} ${D / 2})`}
          />
        ))}
        <text
          x="50%"
          y="46%"
          textAnchor="middle"
          dominantBaseline="central"
          className="cifra fill-foreground"
          style={{ fontSize: 30 }}
        >
          {totale}
        </text>
        <text
          x="50%"
          y="61%"
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-muted-foreground"
          style={{ fontSize: 10 }}
        >
          {didascalia}
        </text>
      </svg>

      <dl className="min-w-40 flex-1 space-y-1.5 text-xs">
        {vive.map((s) => (
          <div key={s.etichetta} className="flex items-center gap-2">
            <span
              className="size-2 shrink-0 rounded-[2px]"
              style={{ background: s.colore }}
              aria-hidden
            />
            <dt className="text-muted-foreground">{s.etichetta}</dt>
            <dd className="ml-auto font-mono text-sm tabular-nums">{s.quanti}</dd>
            <dd className="w-9 text-right font-mono text-[10px] text-faint-foreground tabular-nums">
              {Math.round((s.quanti / totale) * 100)}%
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

const MESI_BREVI = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];

export type MeseCarico = {
  readonly chiave: string;
  readonly mese: number;
  readonly anno: number;
  readonly per: Readonly<Record<Dominio, number>>;
  readonly totale: number;
};

/**
 * Il carico dei prossimi dodici mesi, impilato per decreto.
 *
 * Prende il posto del «trend compliance» dei prototipi, che guardava indietro e per farlo
 * inventava. Questo guarda avanti e non ha bisogno di storico: le scadenze future si
 * derivano dalle periodicità. Ed è la domanda più utile delle due — «come sono andato» è
 * una constatazione, «quando mi cade addosso» è una decisione.
 *
 * QUI IL COLORE DEL DECRETO È AL SUO POSTO, ed è l'unico grafico in cui lo è: la regola
 * dice che le tre tinte si usano solo dove i tre domini convivono, e in una colonna
 * impilata convivono per costruzione.
 *
 * La linea tratteggiata della media non è ornamento: senza, una colonna alta dice solo che
 * è più alta delle vicine, non se il mese è pesante.
 */
export function CaricoMensile({
  mesi,
  domini,
  etichette,
}: {
  mesi: readonly MeseCarico[];
  domini: readonly Dominio[];
  etichette: Readonly<Record<Dominio, { breve: string }>>;
}) {
  const massimo = Math.max(1, ...mesi.map((m) => m.totale));
  const totale = mesi.reduce((s, m) => s + m.totale, 0);
  if (totale === 0) {
    return (
      <p className="text-xs leading-relaxed text-muted-foreground">
        Nei prossimi dodici mesi non cade nessuna scadenza ricorrente. Succede quando gli adempimenti sono
        tutti senza ultima esecuzione: la scadenza si calcola da quella, e finché manca non c&apos;è una
        data da collocare.
      </p>
    );
  }
  const picco = mesi.reduce((a, b) => (b.totale > a.totale ? b : a));
  const media = Math.round(totale / mesi.length);
  const vuoti = mesi.filter((m) => m.totale === 0).length;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <p className="text-[11px] leading-relaxed text-faint-foreground">
          Deriva dalle periodicità, non da uno storico: si sa dal primo giorno.
        </p>
        <div className="flex gap-4 text-right">
          <p>
            <span className="cifra block text-xl leading-none">{picco.totale}</span>
            <span className="text-[10px] text-muted-foreground">
              picco · {MESI_BREVI[picco.mese]}
            </span>
          </p>
          <p>
            <span className="cifra block text-xl leading-none text-muted-foreground">{media}</span>
            <span className="text-[10px] text-muted-foreground">media mensile</span>
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        <div className="flex h-36 flex-col justify-between font-mono text-[10px] text-faint-foreground tabular-nums">
          <span>{massimo}</span>
          <span>{Math.round(massimo / 2)}</span>
          <span>0</span>
        </div>
        <div className="relative min-w-0 flex-1">
          <div
            className="absolute right-0 left-0 border-t border-dashed border-border-strong"
            style={{ bottom: `${(media / massimo) * 100}%` }}
            aria-hidden
          />
          <div className="flex h-36 items-end gap-1.5 border-b border-border">
            {mesi.map((m) => (
              <div
                key={m.chiave}
                className="flex h-full min-w-0 flex-1 flex-col justify-end"
                title={`${MESI_BREVI[m.mese]} ${m.anno}: ${m.totale} scadenze`}
              >
                {domini.map((d) =>
                  m.per[d] > 0 ? (
                    <span
                      key={d}
                      className="w-full first:rounded-t-[3px]"
                      style={{ height: `${(m.per[d] / massimo) * 100}%`, background: TINTA_DOMINIO[d] }}
                    />
                  ) : null,
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-1.5 flex gap-2">
        <span className="invisible font-mono text-[10px]">{massimo}</span>
        <div className="flex min-w-0 flex-1 gap-1.5">
          {mesi.map((m) => (
            <span
              key={m.chiave}
              className={`min-w-0 flex-1 text-center text-[10px] ${
                m === picco ? "font-semibold text-foreground" : "text-muted-foreground"
              }`}
            >
              {MESI_BREVI[m.mese]}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-4 border-t border-border pt-2.5 text-[10px]">
        {domini.map((d) => (
          <span key={d} className="flex items-center gap-1.5 text-muted-foreground">
            <span className="size-2 rounded-[2px]" style={{ background: TINTA_DOMINIO[d] }} aria-hidden />
            {etichette[d].breve}
          </span>
        ))}
        <span className="ml-auto text-faint-foreground">
          {/* Un mese vuoto è un dato, non un buco nel disegno: se ce ne sono parecchi lo si
              dice, altrimenti il grafico sembra rotto. */}
          {vuoti > 3
            ? `${vuoti} mesi a zero: le periodicità del catalogo si concentrano nei primi mesi`
            : "la linea tratteggiata è la media dei dodici mesi"}
        </span>
      </div>
    </div>
  );
}

export { TINTA_DOMINIO };
