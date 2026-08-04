"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

// Tre trattamenti della fascia dei moduli, sugli STESSI numeri.
//
// La diagnosi, prima delle proposte. Ciò che fa «software dei primi anni Duemila» in quella
// schermata non è il colore, sono sei cose:
//
//   1. le schede sono scatole INERTI — nessun passaggio del mouse, nessun cursore;
//   2. quattro schede IDENTICHE in fila: è il pattern più riconoscibile del software vecchio;
//   3. gli anelli sottili ripetono il numero che hanno al centro — ornamento da cruscotto 2010;
//   4. il nastro a quattro blocchi pieni senza stacchi legge come una barra di caricamento;
//   5. tutto ha lo stesso peso: quattro righe `etichetta … numero` uguali, poi prosa grigia;
//   6. nessun movimento.
//
// I tre trattamenti attaccano quelle sei cose in misura crescente. I numeri sono quelli
// veri della vetrina al 4 agosto 2026, così il confronto è onesto: su dati inventati e
// tondi qualunque trattamento sembra buono.

export type Modulo = {
  readonly chiave: "gdpr" | "d231" | "d81";
  readonly breve: string;
  readonly esteso: string;
  readonly norma: string;
  readonly percentuale: number;
  readonly numeratore: number;
  readonly applicabili: number;
  readonly scadute: number;
  readonly inScadenza: number;
  readonly regolari: number;
  readonly daProgrammare: number;
  readonly critici: number;
  readonly prontezza: number;
  readonly scoperti: number;
};

const TINTA: Record<Modulo["chiave"], string> = {
  gdpr: "var(--gdpr)",
  d231: "var(--d231)",
  d81: "var(--d81)",
};

// ═══════════════════════════════════════════════════════════════════════════════════════
// A — VIVO
// ═══════════════════════════════════════════════════════════════════════════════════════
//
// Cambia il MENO possibile e attacca solo le cose 1 e 6: la scheda diventa un bersaglio
// vero, e i numeri entrano invece di esserci già.
//
// L'intera scheda è un collegamento. Il passaggio del mouse non aggiunge un bordo — nella
// forma «quieto» il rilievo si fa con la superficie — ma alza la scheda di un gradino, tira
// su la freccia e scurisce la tinta del decreto. La pressione la riabbassa: senza lo stato
// premuto un bersaglio grande sembra rotto, perché il dito tocca e non succede niente per
// i duecento millisecondi del caricamento.
//
// Il movimento è di entrata e basta. Le barre crescono da zero e le schede arrivano
// sfalsate di sessanta millisecondi. Non è vezzo: lo sfalsamento dice che sono quattro
// oggetti distinti, cosa che una griglia di riquadri uguali nasconde.

export function Vivo({ moduli }: { moduli: readonly Modulo[] }) {
  return (
    <div className="grid gap-3 lg:grid-cols-3">
      {moduli.map((m, i) => (
        <Link
          key={m.chiave}
          href="#"
          onClick={(e) => e.preventDefault()}
          style={{ animationDelay: `${i * 60}ms` }}
          className={cn(
            "pannello group entra block p-5",
            "transition-[background-color,box-shadow,transform] duration-200 ease-out",
            "hover:bg-surface-raised hover:shadow-md",
            "active:translate-y-px active:shadow-sm",
            "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none",
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold transition-colors" style={{ color: TINTA[m.chiave] }}>
                {m.breve}
              </p>
              <p className="truncate text-xs text-muted-foreground">{m.esteso}</p>
              <p className="mt-0.5 font-mono text-[10px] text-faint-foreground">{m.norma}</p>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="cifra text-[2rem] leading-none">{m.percentuale}</span>
              <span className="text-sm text-muted-foreground">%</span>
              <ArrowUpRight
                className="ml-1 size-4 shrink-0 text-faint-foreground transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground"
                aria-hidden
              />
            </div>
          </div>

          <p className="mt-2 font-mono text-[10px] text-faint-foreground">
            {m.numeratore}/{m.applicabili} fatti e ancora validi
          </p>

          <Scala modulo={m} />

          <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
            <Riga etichetta="scadute" valore={m.scadute} tinta="text-scaduta" />
            <Riga etichetta="in scadenza" valore={m.inScadenza} tinta="text-imminente" />
            <Riga etichetta="da programmare" valore={m.daProgrammare} />
            <Riga etichetta="critici aperti" valore={m.critici} />
          </dl>

          <p className="mt-3 border-t border-border-subtle pt-2 text-[10px] text-muted-foreground">
            Prontezza <b className="tabular-nums">{m.prontezza}/100</b> · {m.scoperti} presidi scoperti
          </p>
        </Link>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════════════
// B — LASTRA
// ═══════════════════════════════════════════════════════════════════════════════════════
//
// Attacca la cosa 2, che è la più grossa: **tre schede identiche smettono di essere tre
// scatole**. Diventano tre colonne di UNA superficie sola, separate da un capello.
//
// La differenza non è estetica. Quattro riquadri uguali affiancati dicono «quattro oggetti
// indipendenti», e il cervello li legge uno per uno; una lastra divisa dice «un fatto in tre
// parti», e l'occhio confronta. Confrontare è esattamente ciò che si fa qui: 15, 0, 40.
//
// Sparisce anche l'anello (cosa 3): la percentuale è già una cifra grande, e disegnarle
// intorno un arco che dice la stessa cosa è ridondanza che costa attenzione.

export function Lastra({ moduli }: { moduli: readonly Modulo[] }) {
  return (
    <div className="pannello overflow-clip">
      <div className="grid md:grid-cols-3">
        {moduli.map((m, i) => (
          <Link
            key={m.chiave}
            href="#"
            onClick={(e) => e.preventDefault()}
            style={{ animationDelay: `${i * 60}ms` }}
            className={cn(
              "entra group relative block p-5 transition-colors duration-200",
              "hover:bg-surface-raised",
              "focus-visible:ring-2 focus-visible:ring-primary focus-visible:-outline-offset-2 focus-visible:outline-none",
              i > 0 && "md:border-l md:border-border-subtle",
            )}
          >
            {/* Il filo di tinta in alto identifica il decreto senza colorare niente
                d'altro: il colore è un'etichetta, non una decorazione. Al passaggio si
                allunga a tutta la colonna — un segnale di stato, non un'animazione. */}
            <span
              aria-hidden
              className="absolute inset-x-5 top-0 h-[3px] origin-left scale-x-[0.18] rounded-b-full transition-transform duration-300 ease-out group-hover:scale-x-100"
              style={{ background: TINTA[m.chiave] }}
            />

            <div className="flex items-baseline justify-between gap-2">
              <p className="text-sm font-semibold">{m.breve}</p>
              <ArrowUpRight
                className="size-4 shrink-0 text-faint-foreground opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                aria-hidden
              />
            </div>
            <p className="truncate text-[11px] text-muted-foreground">{m.esteso}</p>

            <p className="mt-4 flex items-baseline gap-1">
              <span className="cifra text-[2.6rem] leading-none">{m.percentuale}</span>
              <span className="text-base text-muted-foreground">%</span>
            </p>
            <p className="mt-1 font-mono text-[10px] text-faint-foreground">
              {m.numeratore}/{m.applicabili} fatti e ancora validi
            </p>

            <Scala modulo={m} />

            <dl className="mt-3 space-y-1 text-[11px]">
              <Riga etichetta="scadute" valore={m.scadute} tinta="text-scaduta" />
              <Riga etichetta="in scadenza" valore={m.inScadenza} tinta="text-imminente" />
              <Riga etichetta="critici aperti" valore={m.critici} />
            </dl>

            <p className="mt-3 text-[10px] text-muted-foreground">
              Prontezza <b className="tabular-nums">{m.prontezza}/100</b>
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════════════
// C — CIFRA
// ═══════════════════════════════════════════════════════════════════════════════════════
//
// Attacca la cosa 5: **la gerarchia**. In un cruscotto si guarda una cosa sola per scheda,
// e qui quella cosa è la percentuale. Tutto il resto scende di due gradini.
//
// La riga di dettaglio non è più un elenco verticale ma una sequenza in linea con separatori
// sottili: occupa meno spazio, si legge in un colpo, e smette di somigliare a una tabella
// dentro una scheda. La prosa sulla prontezza esce dalla scheda: in un cruscotto la prosa
// diventa texture, si legge una volta e poi si smette.
//
// È la più decisa delle tre. Regge se il numero grande È la risposta; se servono davvero
// tutti e quattro i conteggi allo stesso momento, la B è più onesta.

export function Cifra({ moduli }: { moduli: readonly Modulo[] }) {
  return (
    <div className="grid gap-3 lg:grid-cols-3">
      {moduli.map((m, i) => (
        <Link
          key={m.chiave}
          href="#"
          onClick={(e) => e.preventDefault()}
          style={{ animationDelay: `${i * 60}ms` }}
          className={cn(
            "pannello entra group block overflow-clip p-0",
            "transition-[background-color,box-shadow] duration-200",
            "hover:bg-surface-raised hover:shadow-md",
            "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none",
          )}
        >
          <div className="h-1 w-full" style={{ background: TINTA[m.chiave] }} aria-hidden />

          <div className="p-5">
            <div className="flex items-baseline justify-between gap-2">
              <p className="font-mono text-[11px] tracking-[0.1em] text-muted-foreground uppercase">
                {m.breve}
              </p>
              <ArrowUpRight
                className="size-4 shrink-0 text-faint-foreground transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                aria-hidden
              />
            </div>

            <p className="mt-3 flex items-baseline gap-1.5">
              <span className="cifra text-[3.4rem] leading-[0.85]">{m.percentuale}</span>
              <span className="text-lg text-muted-foreground">%</span>
            </p>
            <p className="mt-1.5 text-xs text-muted-foreground">
              conformità effettiva · {m.numeratore} su {m.applicabili}
            </p>

            <Scala modulo={m} />

            {/* In linea e non in elenco: quattro righe verticali dentro una scheda sono una
                tabella, e una tabella dentro una scheda è ciò che fa «vecchio». */}
            <p className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-[11px]">
              <span className="text-scaduta">
                <b className="cifra text-xs">{m.scadute}</b> scadute
              </span>
              <span className="text-faint-foreground">·</span>
              <span className="text-imminente">
                <b className="cifra text-xs">{m.inScadenza}</b> in scadenza
              </span>
              <span className="text-faint-foreground">·</span>
              <span className="text-muted-foreground">
                <b className="cifra text-xs">{m.critici}</b> critici
              </span>
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════════════
// Pezzi condivisi
// ═══════════════════════════════════════════════════════════════════════════════════════

/**
 * La scala di stato, che sostituisce il nastro a blocchi pieni.
 *
 * Tre differenze da quello di adesso, e ognuna toglie un pezzo di «barra di caricamento»:
 * i segmenti sono STACCATI da due pixel, quindi si contano invece di fondersi; gli angoli
 * sono arrotondati; e crescono da zero all'entrata, così l'occhio vede la proporzione
 * formarsi invece di trovarla già lì.
 */
function Scala({ modulo }: { modulo: Modulo }) {
  const totale = modulo.scadute + modulo.inScadenza + modulo.regolari + modulo.daProgrammare || 1;
  const segmenti = [
    { quanti: modulo.scadute, colore: "var(--scaduta)", nome: "scadute" },
    { quanti: modulo.inScadenza, colore: "var(--imminente)", nome: "in scadenza" },
    { quanti: modulo.regolari, colore: "var(--regolare)", nome: "regolari" },
    { quanti: modulo.daProgrammare, colore: "var(--programmare)", nome: "da programmare" },
  ].filter((s) => s.quanti > 0);

  return (
    <div
      className="mt-3 flex h-2 gap-0.5 overflow-clip rounded-full"
      role="img"
      aria-label={segmenti.map((s) => `${s.quanti} ${s.nome}`).join(", ")}
    >
      {segmenti.map((s) => (
        <span
          key={s.nome}
          className="cresce h-full rounded-full"
          style={{ background: s.colore, ["--quota" as string]: `${(s.quanti / totale) * 100}%` }}
        />
      ))}
    </div>
  );
}

function Riga({ etichetta, valore, tinta }: { etichetta: string; valore: number; tinta?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className="text-muted-foreground">{etichetta}</dt>
      <dd className={cn("cifra text-xs", tinta)}>{valore}</dd>
    </div>
  );
}
