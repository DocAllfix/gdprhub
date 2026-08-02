import type { Dominio } from "@gdpr/engine";
import { cn } from "@/lib/utils";

// I pezzi della direzione «schede evolute».
//
// SETTE REGOLE, e ognuna esiste per evitare un difetto preciso.
//
// 1. LA GRIGLIA NON È SIMMETRICA. Quattro riquadri identici in fila sembrano curati per
//    dieci secondi e poi sono arredamento. Una scheda grande, tre medie, una stretta: la
//    gerarchia si vede prima di leggere.
// 2. DENTRO OGNI SCHEDA UN GRAFICO. Una scheda che contiene «44% · conformità» è una
//    didascalia con un bordo.
// 3. TRE LIVELLI DI PROFONDITÀ dentro la scheda: fondo, scheda, elemento sollevato. È così
//    che si ottiene rilievo senza ombre, che sul buio non esistono.
// 4. TRE CARATTERI: cifra in serif, denominatore in mono, etichetta in sans. È la firma del
//    prodotto e lega la schermata alla perizia.
// 5. IL DECRETO È UN PUNTO, MAI UNA FASCIA LATERALE. Il bordo colorato a sinistra è il tic
//    più riconoscibile dell'interfaccia generata a macchina.
// 6. LE RIGHE SONO SCHEDE BASSE che si sollevano al passaggio: densità ferma, informazione
//    che cresce quando la cerchi.
// 7. IL COLORE RESTA DATO. Rosso, ambra e verde dicono lo stato della scadenza e nient'altro.

export const TINTA: Readonly<Record<Dominio, string>> = {
  gdpr: "text-gdpr",
  d231: "text-d231",
  d81: "text-d81",
};
export const PUNTO: Readonly<Record<Dominio, string>> = {
  gdpr: "bg-gdpr",
  d231: "bg-d231",
  d81: "bg-d81",
};
export const VAR: Readonly<Record<Dominio, string>> = {
  gdpr: "var(--gdpr)",
  d231: "var(--d231)",
  d81: "var(--d81)",
};

export const classeStato = (s: string) =>
  s === "Scaduta"
    ? "text-scaduta"
    : s === "In scadenza"
      ? "text-imminente"
      : s === "Regolare"
        ? "text-regolare"
        : "text-programmare";

/** La scheda. Un solo contenitore, mai annidato dentro un altro. */
export function Scheda({
  children,
  className,
  rilievo,
}: {
  children: React.ReactNode;
  className?: string;
  rilievo?: boolean;
}) {
  return (
    <section
      // Appiglio stabile per gli schemi di design: le utility di Tailwind cambiano nome a
      // ogni ritocco, questo attributo no. Costa due parole e permette a uno schema di
      // ridisegnare ogni scheda del prodotto senza toccare una sola schermata.
      data-pezzo="scheda"
      data-rilievo={rilievo ? "" : undefined}
      className={cn(
        "rounded-xl border bg-surface p-4",
        rilievo ? "border-border-strong bg-surface-raised" : "border-border",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function TitoloScheda({ children, nota }: { children: React.ReactNode; nota?: string }) {
  return (
    <div className="mb-3">
      <h3 className="text-[11px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
        {children}
      </h3>
      {nota ? <p className="mt-1 text-[11px] leading-relaxed text-faint-foreground">{nota}</p> : null}
    </div>
  );
}

/** Cifra grande in serif, denominatore in mono: due caratteri per due ruoli diversi. */
export function Cifra({
  valore,
  su,
  suffisso = "%",
  classe,
}: {
  valore: number | string | null;
  su?: string;
  suffisso?: string;
  classe?: string;
}) {
  return (
    <span className="flex items-baseline gap-1.5">
      <span className={cn("cifra text-[1.9rem] leading-none", classe)}>
        {valore === null ? "—" : valore}
        {valore === null ? "" : suffisso}
      </span>
      {su ? <span className="font-mono text-[11px] text-faint-foreground">{su}</span> : null}
    </span>
  );
}

export function Anello({
  percentuale,
  tinta,
  dimensione = 74,
  spessore = 8,
}: {
  percentuale: number | null;
  tinta: string;
  dimensione?: number;
  spessore?: number;
}) {
  const r = (dimensione - spessore) / 2;
  const c = 2 * Math.PI * r;
  const q = percentuale === null ? 0 : Math.max(0, Math.min(100, percentuale)) / 100;
  return (
    <svg
      width={dimensione}
      height={dimensione}
      viewBox={`0 0 ${dimensione} ${dimensione}`}
      className="shrink-0"
    >
      <circle
        cx={dimensione / 2}
        cy={dimensione / 2}
        r={r}
        fill="none"
        stroke="var(--surface-sunken)"
        strokeWidth={spessore}
      />
      {q > 0 ? (
        <circle
          cx={dimensione / 2}
          cy={dimensione / 2}
          r={r}
          fill="none"
          stroke={tinta}
          strokeWidth={spessore}
          strokeDasharray={`${c * q} ${c}`}
          transform={`rotate(-90 ${dimensione / 2} ${dimensione / 2})`}
        />
      ) : null}
      <text
        x="50%"
        y="50%"
        dominantBaseline="central"
        textAnchor="middle"
        className="cifra fill-foreground"
        style={{ fontSize: dimensione * 0.28 }}
      >
        {percentuale === null ? "—" : percentuale}
      </text>
    </svg>
  );
}

export type Composizione = {
  scadute: number;
  inScadenza: number;
  regolari: number;
  daProgrammare: number;
  totale: number;
};

/** Il nastro: quattro stati in proporzione. Sostituisce quattro numeri sparsi. */
export function Nastro({ c, altezza = 5 }: { c: Composizione; altezza?: number }) {
  const pezzi = [
    { n: c.scadute, k: "bg-scaduta", e: "scadute" },
    { n: c.inScadenza, k: "bg-imminente", e: "in scadenza" },
    { n: c.regolari, k: "bg-regolare", e: "regolari" },
    { n: c.daProgrammare, k: "bg-programmare/60", e: "da programmare" },
  ];
  return (
    <span
      className="flex w-full overflow-hidden rounded-full bg-surface-sunken"
      style={{ height: altezza }}
      title={pezzi.map((p) => `${p.n} ${p.e}`).join(" · ")}
    >
      {pezzi
        .filter((p) => p.n > 0)
        .map((p) => (
          <span key={p.e} className={p.k} style={{ width: `${(p.n / c.totale) * 100}%` }} />
        ))}
    </span>
  );
}

/** Riquadro sollevato DENTRO una scheda: è il terzo livello di profondità. */
export function Incasso({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div data-pezzo="incasso" className={cn("rounded-lg bg-surface-sunken px-3 py-2", className)}>
      {children}
    </div>
  );
}

export function Pastiglia({ dominio, testo }: { dominio: Dominio; testo: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-medium">
      <span className={cn("size-1.5 shrink-0 rounded-full", PUNTO[dominio])} aria-hidden />
      <span className={TINTA[dominio]}>{testo}</span>
    </span>
  );
}
