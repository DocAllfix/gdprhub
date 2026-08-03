"use client";

import { useState } from "react";
import {
  Building2,
  CalendarClock,
  ChevronDown,
  ChevronRight,
  Command,
  FileText,
  LayoutGrid,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

// TRE MODI DI COSTRUIRE LA BARRA, non tre modi di colorarla.
//
// La prima versione era la barra che hanno tutti: marchio in cima, cinque voci, utente in
// fondo, un pulsante per ridurla. Funziona e non dice niente, e soprattutto non risponde
// alla domanda vera — QUANTO VALE QUELLA COLONNA. Duecentotrenta pixel su millequattrocento
// sono il sedici per cento dello schermo, tolti alla tabella per sempre. Perché li merita?
//
// Tre risposte diverse, e ognuna sposta anche il resto della schermata: una barra non si
// giudica da sola.
//
//   BINARIO   la colonna non merita quei pixel, quindi non li prende: binario di icone
//             fisso a sessanta, etichetta che esce al passaggio. Sparisce anche la
//             preferenza da ricordare, perché non c'è più niente da aprire o chiudere.
//             In cambio il contenuto prende una testata vera con briciole, ricerca e azioni.
//   CONTESTO  li merita, ma allora deve GUADAGNARSELI: la colonna porta l'azienda su cui si
//             sta lavorando e le prossime scadenze, non solo cinque collegamenti. Smette di
//             essere navigazione e diventa un pannello di lavoro.
//   TESTATA   l'identità e la ricerca escono dalla colonna e vanno in una fascia in alto,
//             dove tutti le cercano. Alla colonna resta solo la navigazione, quindi può
//             essere stretta, chiara e silenziosa.

const MENU = [
  { e: "Cruscotto", I: LayoutGrid },
  { e: "Portafoglio", I: Building2 },
  { e: "Scadenzario", I: CalendarClock },
  { e: "Relazioni", I: FileText, futura: true },
  { e: "Impostazioni", I: Settings },
] as const;

type Voce = (typeof MENU)[number];
const isFutura = (v: Voce) => "futura" in v && v.futura === true;

export type Scadenza = { azienda: string; titolo: string; giorni: number };

// ============================================================================================
// Pezzi comuni
// ============================================================================================

function Marchio({ solo }: { solo?: boolean }) {
  return solo ? (
    <span
      className="grid size-8 place-items-center rounded-md bg-sidebar-selected text-xs font-semibold"
      title="Studio Bianchi & Associati"
    >
      SB
    </span>
  ) : (
    <div className="min-w-0">
      <p className="truncate text-sm font-semibold tracking-tight">Studio Bianchi</p>
      <p className="text-[10px] tracking-[0.1em] text-sidebar-muted uppercase">Suite Compliance</p>
    </div>
  );
}

/** La testata del contenuto. Esiste solo dove la colonna ha rinunciato a qualcosa: se la
 *  barra porta già marchio, ricerca e utente, una fascia in alto che li ripete è rumore. */
function TestataContenuto({ ricerca }: { ricerca?: boolean }) {
  return (
    <header className="flex flex-wrap items-center gap-3 border-b border-border bg-surface px-5 py-2.5">
      <nav className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span>Portafoglio</span>
        <ChevronRight className="size-3" aria-hidden />
        <span className="font-medium text-foreground">Ferrarini Componenti S.r.l.</span>
      </nav>
      {ricerca ? (
        <span className="ml-auto flex h-7 w-64 items-center gap-2 rounded-lg border border-border bg-surface-sunken px-2.5 text-xs text-faint-foreground">
          <Search className="size-3.5" aria-hidden />
          Cerca ovunque
          <span className="ml-auto flex items-center gap-0.5 font-mono text-[10px]">
            <Command className="size-2.5" aria-hidden />K
          </span>
        </span>
      ) : (
        <span className="ml-auto" />
      )}
      <span className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground">
        <Plus className="size-3.5" aria-hidden />
        Nuova azienda
      </span>
    </header>
  );
}

function Navigazione({
  attiva,
  setAttiva,
  stretta,
  chiara,
}: {
  attiva: string;
  setAttiva: (v: string) => void;
  stretta?: boolean;
  chiara?: boolean;
}) {
  return (
    <nav className="flex flex-col gap-0.5" aria-label="Navigazione dell'anteprima">
      {MENU.map((v) => {
        const futura = isFutura(v);
        return (
          <button
            key={v.e}
            type="button"
            disabled={futura}
            onClick={() => setAttiva(v.e)}
            aria-current={attiva === v.e ? "page" : undefined}
            className={cn(
              "group relative flex items-center gap-2.5 rounded-md py-1.5 text-sm transition-colors",
              stretta ? "justify-center px-0" : "px-2.5",
              futura
                ? "cursor-not-allowed text-sidebar-muted/60"
                : attiva === v.e
                  ? chiara
                    ? "bg-selected font-medium text-foreground"
                    : "bg-sidebar-selected font-medium text-sidebar-foreground"
                  : chiara
                    ? "text-muted-foreground hover:bg-selected/60 hover:text-foreground"
                    : "text-sidebar-muted hover:bg-sidebar-selected/60 hover:text-sidebar-foreground",
            )}
          >
            <v.I className="size-4 shrink-0" aria-hidden />
            {stretta ? (
              <>
                <span className="sr-only">{v.e}</span>
                {/* L'etichetta esce al passaggio. Un binario di sole icone senza questo è
                    un indovinello, e chi usa il prodotto due volte al mese non indovina. */}
                <span
                  className="pointer-events-none absolute left-full z-30 ml-2 hidden rounded-md bg-sidebar-selected px-2 py-1 text-xs whitespace-nowrap text-sidebar-foreground shadow-md group-hover:block"
                  aria-hidden
                >
                  {v.e}
                </span>
              </>
            ) : (
              v.e
            )}
            {!stretta && futura ? (
              <span className="ml-auto text-[9px] tracking-wide uppercase opacity-70">presto</span>
            ) : null}
          </button>
        );
      })}
    </nav>
  );
}

// ============================================================================================
// A · BINARIO — la colonna non prende i pixel che non merita
// ============================================================================================

function Binario({ children }: { children: React.ReactNode }) {
  const [attiva, setAttiva] = useState("Cruscotto");
  return (
    <div className="flex min-h-[600px] bg-background">
      <aside className="sticky top-0 flex h-dvh max-h-[900px] w-15 shrink-0 flex-col items-center gap-4 bg-sidebar px-2 py-3 text-sidebar-foreground">
        <Marchio solo />
        <div className="w-full">
          <Navigazione attiva={attiva} setAttiva={setAttiva} stretta />
        </div>
        <div className="mt-auto flex flex-col items-center gap-2">
          <span
            className="grid size-7 place-items-center rounded-full bg-sidebar-selected text-[10px] font-semibold"
            title="Marta Bianchi · titolare"
          >
            MB
          </span>
          <span className="text-sidebar-muted" title="Esci">
            <LogOut className="size-3.5" aria-hidden />
          </span>
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <TestataContenuto ricerca />
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

// ============================================================================================
// B · CONTESTO — la colonna si guadagna i pixel
// ============================================================================================

function Contesto({
  children,
  prossime,
}: {
  children: React.ReactNode;
  prossime: readonly Scadenza[];
}) {
  const [attiva, setAttiva] = useState("Cruscotto");
  const [stretta, setStretta] = useState(false);

  return (
    <div className="flex min-h-[600px] bg-background">
      <aside
        className={cn(
          "sticky top-0 flex h-dvh max-h-[900px] shrink-0 flex-col bg-sidebar text-sidebar-foreground transition-[width] duration-200 ease-out",
          stretta ? "w-14 px-2 py-3" : "w-58 px-3 py-3",
        )}
      >
        <div className={cn("flex", stretta ? "justify-center" : "px-1.5")}>
          <Marchio solo={stretta} />
        </div>

        {/* IL PEZZO CHE GIUSTIFICA LA COLONNA. L'azienda su cui si sta lavorando sta qui e
            non in un menù a tendina sepolto: un consulente cambia cliente venti volte al
            giorno, ed è il comando che usa più di ogni altro. */}
        {stretta ? null : (
          <button
            type="button"
            className="mt-3 flex w-full items-center gap-2 rounded-lg border border-sidebar-border px-2 py-1.5 text-left hover:bg-sidebar-selected"
          >
            <span className="grid size-6 shrink-0 place-items-center rounded-md bg-sidebar-selected font-mono text-[9px] font-semibold">
              FC
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-medium">Ferrarini Componenti</span>
              <span className="flex items-center gap-1 pt-0.5">
                {(["gdpr", "d231", "d81"] as const).map((d) => (
                  <span key={d} className="h-0.5 w-4 rounded-full" style={{ background: `var(--${d})` }} />
                ))}
                <span className="ml-1 font-mono text-[9px] text-sidebar-muted">25%</span>
              </span>
            </span>
            <ChevronDown className="size-3.5 shrink-0 text-sidebar-muted" aria-hidden />
          </button>
        )}

        <div className="mt-4">
          <Navigazione attiva={attiva} setAttiva={setAttiva} stretta={stretta} />
        </div>

        {/* E il secondo pezzo: la colonna porta lavoro, non solo collegamenti. */}
        {stretta ? null : (
          <div className="mt-5 border-t border-sidebar-border pt-3">
            <p className="px-1.5 text-[10px] tracking-[0.09em] text-sidebar-muted uppercase">
              Scade adesso
            </p>
            <ul className="mt-1.5 space-y-0.5">
              {prossime.slice(0, 3).map((s) => (
                <li key={s.titolo}>
                  <button
                    type="button"
                    className="w-full rounded-md px-1.5 py-1 text-left hover:bg-sidebar-selected"
                  >
                    <span className="flex items-baseline gap-2">
                      <span className="min-w-0 flex-1 truncate text-[11px]">{s.titolo}</span>
                      <span className="shrink-0 font-mono text-[10px] text-scaduta tabular-nums">
                        {s.giorni}
                      </span>
                    </span>
                    <span className="block truncate text-[10px] text-sidebar-muted">{s.azienda}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-auto space-y-2 border-t border-sidebar-border pt-3">
          {stretta ? null : (
            <div className="px-1.5">
              <p className="truncate text-xs font-medium">Marta Bianchi</p>
              <p className="text-[10px] text-sidebar-muted">titolare</p>
            </div>
          )}
          <div className={cn("flex items-center gap-1", stretta ? "flex-col" : "px-1.5")}>
            <span className="inline-flex items-center gap-1.5 px-1 py-1 text-xs text-sidebar-muted">
              <LogOut className="size-3.5" aria-hidden />
              {stretta ? null : "Esci"}
            </span>
            <button
              type="button"
              onClick={() => setStretta((v) => !v)}
              aria-pressed={stretta}
              title={stretta ? "Espandi la barra" : "Riduci la barra"}
              className="ml-auto rounded-md p-1 text-sidebar-muted hover:bg-sidebar-selected hover:text-sidebar-foreground"
            >
              {stretta ? (
                <PanelLeftOpen className="size-4" aria-hidden />
              ) : (
                <PanelLeftClose className="size-4" aria-hidden />
              )}
            </button>
          </div>
        </div>
      </aside>
      <div className="min-w-0 flex-1 p-5">{children}</div>
    </div>
  );
}

// ============================================================================================
// C · TESTATA — identità e ricerca escono dalla colonna
// ============================================================================================

function Testata({ children }: { children: React.ReactNode }) {
  const [attiva, setAttiva] = useState("Cruscotto");
  return (
    <div className="min-h-[600px] bg-background">
      <header className="sticky top-0 z-20 flex flex-wrap items-center gap-3 bg-sidebar px-4 py-2 text-sidebar-foreground">
        <span className="grid size-7 place-items-center rounded-md bg-sidebar-selected text-[10px] font-semibold">
          SB
        </span>
        <span className="text-sm font-semibold tracking-tight">Studio Bianchi</span>
        <span className="text-[10px] tracking-[0.1em] text-sidebar-muted uppercase">
          Suite Compliance
        </span>
        <span className="mx-auto flex h-7 w-80 items-center gap-2 rounded-lg border border-sidebar-border px-2.5 text-xs text-sidebar-muted">
          <Search className="size-3.5" aria-hidden />
          Cerca aziende, adempimenti, scadenze
          <span className="ml-auto flex items-center gap-0.5 font-mono text-[10px]">
            <Command className="size-2.5" aria-hidden />K
          </span>
        </span>
        <span className="flex items-center gap-2">
          <span className="text-right">
            <span className="block text-[11px] leading-tight font-medium">Marta Bianchi</span>
            <span className="block text-[10px] leading-tight text-sidebar-muted">titolare</span>
          </span>
          <span className="grid size-7 place-items-center rounded-full bg-sidebar-selected text-[10px] font-semibold">
            MB
          </span>
        </span>
      </header>

      <div className="flex">
        {/* Alla colonna resta solo la navigazione, quindi può essere chiara: è carta come il
            contenuto, e il peso lo porta la fascia in alto. */}
        <aside className="sticky top-[46px] flex h-[calc(100dvh-46px)] max-h-[860px] w-48 shrink-0 flex-col border-r border-border bg-surface px-2.5 py-3">
          <Navigazione attiva={attiva} setAttiva={setAttiva} chiara />
        </aside>
        <div className="min-w-0 flex-1">
          <TestataContenuto />
          <div className="p-5">{children}</div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================================

export function GuscioVariabile({
  forma,
  prossime,
  children,
}: {
  forma: "binario" | "contesto" | "testata";
  prossime: readonly Scadenza[];
  children: React.ReactNode;
}) {
  if (forma === "binario") return <Binario>{children}</Binario>;
  if (forma === "contesto") return <Contesto prossime={prossime}>{children}</Contesto>;
  return <Testata>{children}</Testata>;
}
