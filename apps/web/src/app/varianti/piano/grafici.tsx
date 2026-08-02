import { TrendingUp } from "lucide-react";
import type { DatiVarianti } from "../dati";
import { Scheda, TitoloScheda, VAR } from "../schede/pezzi";

// I GRAFICI, e la ragione per cui ognuno esiste.
//
// I prototipi del committente ne avevano quattro, e tre erano giusti. Quello sbagliato era
// il «trend compliance»: veniva da `62 + i*5 + Math.random()*3`, cioè da niente. Un numero
// inventato dentro una relazione che un ispettore può leggere non è un difetto estetico.
//
// Qui la regola è una sola e non ammette eccezioni: OGNI GRAFICO RISPONDE A UNA DOMANDA CHE
// I NUMERI ACCANTO NON RISPONDONO GIÀ. Un grafico che ridisegna una cifra che sta due
// centimetri più in là è decorazione, e la decorazione in uno strumento di lavoro costa
// spazio e tempo di caricamento senza restituire niente.
//
//   CIAMBELLA        «di che cosa è fatto il totale» — proporzione fra quattro stati.
//   BARRE APPAIATE   «dove si concentra il guasto» — categoria per categoria, quante e
//                    quante scadute. Due serie, perché una sola non direbbe se venti
//                    adempimenti in una categoria sono un problema o solo tanti.
//   CARICO MENSILE   «quando mi cade addosso» — dodici colonne impilate per decreto. È il
//                    grafico che nei prototipi era finto, rifatto nella forma vera: non
//                    «come sono andato», che vuole uno storico che una istanza nuova non ha,
//                    ma «quando arriva», che si deriva dalle periodicità dal primo giorno.
//   BARRE PER RUOLO  «chi è il collo di bottiglia» — nei prototipi era una torta, e una
//                    torta con nove spicchi non si legge. La domanda è un ordinamento.
//
// Tutto disegnato a mano in SVG, zero librerie. Il prototipo 231 si portava dietro 641 KB
// di Recharts per quattro grafici, ed è una delle ragioni per cui era lento.

const NUMERI = "font-mono text-[10px] tabular-nums";

// ============================================================================================
// CIAMBELLA
// ============================================================================================

export function Ciambella({ d }: { d: DatiVarianti }) {
  const c = d.complessivo.conteggi;
  const fette = [
    { e: "regolari", n: c.Regolare, t: "var(--regolare)" },
    { e: "in scadenza", n: c["In scadenza"], t: "var(--imminente)" },
    { e: "scadute", n: c.Scaduta, t: "var(--scaduta)" },
    { e: "da programmare", n: c["Da programmare"], t: "var(--programmare)" },
  ].filter((f) => f.n > 0);
  const totale = fette.reduce((s, f) => s + f.n, 0);

  const D = 150;
  const S = 22;
  const r = (D - S) / 2;
  const circonferenza = 2 * Math.PI * r;
  let percorso = 0;

  return (
    <Scheda>
      <TitoloScheda nota="Di che cosa è fatto il totale, in proporzione.">Composizione</TitoloScheda>
      <div className="flex flex-wrap items-center gap-5">
        {/* La descrizione sta in `aria-label` e non in un `<title>` dentro l'SVG: React 19
            tratta `<title>` come metadato del documento e lo solleva nella testa, e il
            risultato è un disallineamento di idratazione. Trovato dal cancello, non
            leggendo il codice. */}
        <svg
          width={D}
          height={D}
          viewBox={`0 0 ${D} ${D}`}
          className="shrink-0"
          role="img"
          aria-label={`Composizione dei ${totale} adempimenti per stato della scadenza`}
        >
          {fette.map((f) => {
            const quota = f.n / totale;
            const offset = percorso;
            percorso += quota;
            return (
              <circle
                key={f.e}
                cx={D / 2}
                cy={D / 2}
                r={r}
                fill="none"
                stroke={f.t}
                strokeWidth={S}
                strokeDasharray={`${circonferenza * quota - 2} ${circonferenza}`}
                strokeDashoffset={-circonferenza * offset + 1}
                transform={`rotate(-90 ${D / 2} ${D / 2})`}
              />
            );
          })}
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
            y="60%"
            textAnchor="middle"
            dominantBaseline="central"
            className="fill-muted-foreground text-[10px]"
          >
            adempimenti
          </text>
        </svg>

        <dl className="min-w-40 flex-1 space-y-1.5 text-xs">
          {fette.map((f) => (
            <div key={f.e} className="flex items-center gap-2">
              <span
                className="size-2 shrink-0 rounded-[2px]"
                style={{ background: f.t }}
                aria-hidden
              />
              <dt className="text-muted-foreground">{f.e}</dt>
              <dd className={`ml-auto ${NUMERI} text-sm`}>{f.n}</dd>
              <dd className={`w-9 text-right ${NUMERI} text-faint-foreground`}>
                {Math.round((f.n / totale) * 100)}%
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </Scheda>
  );
}

// ============================================================================================
// BARRE APPAIATE — categoria per categoria, quante e quante scadute
// ============================================================================================

export function BarreAppaiate({ d }: { d: DatiVarianti }) {
  const dati = d.perCategoria;
  const massimo = Math.max(...dati.map((x) => x.quanti));
  const tacche = [0, Math.ceil(massimo / 2), massimo];

  return (
    <Scheda>
      <TitoloScheda nota="Una sola serie non direbbe se venti adempimenti sono un problema o solo tanti.">
        Per categoria
      </TitoloScheda>

      <div className="mb-2 flex items-center gap-4 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-[2px] bg-border-strong" aria-hidden /> in catalogo
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-[2px] bg-scaduta" aria-hidden /> scadute
        </span>
      </div>

      <div className="flex gap-2">
        {/* Le tacche a sinistra: senza scala una barra è solo una forma. */}
        <div className={`flex h-32 flex-col justify-between ${NUMERI} text-faint-foreground`}>
          {[...tacche].reverse().map((t) => (
            <span key={t}>{t}</span>
          ))}
        </div>
        <div className="flex min-w-0 flex-1 items-end gap-2 border-b border-border pb-0">
          {dati.map((x) => (
            <div key={x.etichetta} className="flex h-32 min-w-0 flex-1 items-end gap-0.5">
              <span
                className="flex-1 rounded-t-[2px] bg-border-strong"
                style={{ height: `${(x.quanti / massimo) * 100}%` }}
                title={`${x.etichetta}: ${x.quanti} in catalogo`}
              />
              <span
                className="flex-1 rounded-t-[2px] bg-scaduta"
                style={{ height: `${(x.scaduti / massimo) * 100}%` }}
                title={`${x.etichetta}: ${x.scaduti} scadute`}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Le etichette restano orizzontali e troncate. Nei prototipi erano ruotate di
          quarantacinque gradi e illeggibili: una etichetta che si legge girando la testa
          non è una etichetta. */}
      <div className="mt-1.5 flex gap-2">
        <span className={`invisible ${NUMERI}`}>{tacche[2]}</span>
        <div className="flex min-w-0 flex-1 gap-2">
          {dati.map((x) => (
            <span
              key={x.etichetta}
              title={x.etichetta}
              className="min-w-0 flex-1 truncate text-center text-[10px] text-muted-foreground"
            >
              {x.etichetta}
            </span>
          ))}
        </div>
      </div>
    </Scheda>
  );
}

// ============================================================================================
// CARICO MENSILE — dodici colonne impilate per decreto
// ============================================================================================

export function CaricoMensile({ d }: { d: DatiVarianti }) {
  const mesi = d.caricoMensile;
  const massimo = Math.max(1, ...mesi.map((m) => m.totale));
  const picco = mesi.reduce((a, b) => (b.totale > a.totale ? b : a));
  const media = Math.round(mesi.reduce((s, m) => s + m.totale, 0) / mesi.length);
  // Un mese vuoto è un dato, non un buco nel disegno. Se ce ne sono parecchi lo si dice,
  // altrimenti sembra un grafico rotto e il committente giudica il disegno per un difetto
  // che sta nel seme dimostrativo.
  const vuoti = mesi.filter((m) => m.totale === 0).length;

  return (
    <Scheda className="lg:col-span-2">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-[11px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
            Carico dei prossimi dodici mesi
          </h3>
          <p className="mt-1 text-[11px] leading-relaxed text-faint-foreground">
            Deriva dalle periodicità, non da uno storico: si sa dal primo giorno.
          </p>
        </div>
        <div className="flex gap-4 text-right">
          <p>
            <span className="cifra block text-xl leading-none">{picco.totale}</span>
            <span className="text-[10px] text-muted-foreground">picco · {picco.etichetta}</span>
          </p>
          <p>
            <span className="cifra block text-xl leading-none text-muted-foreground">{media}</span>
            <span className="text-[10px] text-muted-foreground">media mensile</span>
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        <div className={`flex h-36 flex-col justify-between ${NUMERI} text-faint-foreground`}>
          <span>{massimo}</span>
          <span>{Math.round(massimo / 2)}</span>
          <span>0</span>
        </div>
        <div className="relative min-w-0 flex-1">
          {/* La linea della media: dice se un mese è alto o solo diverso dagli altri. */}
          <div
            className="absolute right-0 left-0 border-t border-dashed border-border-strong"
            style={{ bottom: `${(media / massimo) * 100}%` }}
            aria-hidden
          />
          <div className="flex h-36 items-end gap-1.5 border-b border-border">
            {mesi.map((m) => (
              <div
                key={m.chiave}
                className="flex min-w-0 flex-1 flex-col justify-end"
                style={{ height: "100%" }}
                title={`${m.etichetta} ${m.anno}: ${m.totale} scadenze`}
              >
                {(["gdpr", "d231", "d81"] as const).map((dom) =>
                  m.per[dom] > 0 ? (
                    <span
                      key={dom}
                      className="w-full first:rounded-t-[3px]"
                      style={{ height: `${(m.per[dom] / massimo) * 100}%`, background: VAR[dom] }}
                    />
                  ) : null,
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-1.5 flex gap-2">
        <span className={`invisible ${NUMERI}`}>{massimo}</span>
        <div className="flex min-w-0 flex-1 gap-1.5">
          {mesi.map((m) => (
            <span
              key={m.chiave}
              className={`min-w-0 flex-1 text-center text-[10px] ${
                m === picco ? "font-semibold text-foreground" : "text-muted-foreground"
              }`}
            >
              {m.etichetta}
            </span>
          ))}
        </div>
      </div>

      {/* QUI il colore del decreto è al suo posto: i tre convivono nella stessa colonna, ed
          è esattamente il caso in cui la regola dice che si può usare. */}
      <div className="mt-3 flex flex-wrap items-center gap-4 border-t border-border pt-2.5 text-[10px]">
        {d.domini.map((dom) => (
          <span key={dom} className="flex items-center gap-1.5 text-muted-foreground">
            <span className="size-2 rounded-[2px]" style={{ background: VAR[dom] }} aria-hidden />
            {d.etichette[dom].breve}
          </span>
        ))}
        <span className="ml-auto text-faint-foreground">
          {vuoti > 3
            ? `${vuoti} mesi a zero: è vero, il catalogo dimostrativo concentra le periodicità nei primi mesi`
            : "la linea tratteggiata è la media dei dodici mesi"}
        </span>
      </div>
    </Scheda>
  );
}

// ============================================================================================
// BARRE PER RUOLO — chi è il collo di bottiglia
// ============================================================================================

export function BarrePerRuolo({ d }: { d: DatiVarianti }) {
  const dati = d.perRuolo;
  const massimo = Math.max(...dati.map((x) => x.quanti));

  return (
    <Scheda>
      <TitoloScheda nota="Ordinati per carico. La parte rossa è già scaduta.">
        Per responsabile
      </TitoloScheda>
      <ul className="space-y-2">
        {dati.map((x) => (
          <li key={x.etichetta}>
            <div className="flex items-baseline justify-between gap-2">
              <span className="truncate text-xs">{x.etichetta}</span>
              <span className={`${NUMERI} shrink-0 text-muted-foreground`}>
                {x.scaduti > 0 ? <span className="text-scaduta">{x.scaduti}</span> : null}
                {x.scaduti > 0 ? " / " : ""}
                {x.quanti}
              </span>
            </div>
            <span className="mt-1 flex h-1.5 overflow-hidden rounded-full bg-surface-sunken">
              <span className="bg-scaduta" style={{ width: `${(x.scaduti / massimo) * 100}%` }} />
              <span
                className="bg-border-strong"
                style={{ width: `${((x.quanti - x.scaduti) / massimo) * 100}%` }}
              />
            </span>
          </li>
        ))}
      </ul>
    </Scheda>
  );
}

// ============================================================================================
// TREND STORICO — lo stato onesto
// ============================================================================================

export function TrendOnesto() {
  return (
    <Scheda>
      <TitoloScheda>Andamento della conformità</TitoloScheda>
      <div className="flex items-start gap-3 rounded-lg bg-surface-sunken p-3">
        <TrendingUp className="mt-0.5 size-4 shrink-0 text-faint-foreground" aria-hidden />
        <div className="text-[11px] leading-relaxed text-muted-foreground">
          <p className="font-medium text-foreground">Il trend comincia dal primo cambiamento registrato.</p>
          <p className="mt-1">
            Nei prototipi questa curva saliva sempre, perché era generata da{" "}
            <code className="font-mono text-[10px] text-faint-foreground">
              62 + i*5 + random()*3
            </code>
            . Un numero inventato dentro una relazione che un ispettore può leggere non è un difetto
            estetico. Qui la curva si disegna dallo storico vero, che è append-only: finché non c&apos;è,
            non c&apos;è.
          </p>
        </div>
      </div>
    </Scheda>
  );
}
