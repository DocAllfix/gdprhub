"use client";

import { useState } from "react";
import {
  Building2,
  CalendarClock,
  FileText,
  LayoutGrid,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

// LA BARRA LATERALE dentro l'anteprima, collassabile davvero: si clicca e si vede.
//
// Non è una finta: è la stessa forma della shell vera — inchiostro accanto a carta, binario
// di icone a quattordici, colonna piena a cinquantasei — con i comandi vivi e senza le
// dipendenze del prodotto (sessione, navigazione, uscita). Serve a giudicare la proporzione
// fra colonna e contenuto in ciascuno dei tre affinamenti, che è una cosa che su una
// schermata isolata non si può vedere.
//
// La barra resta appiccicata mentre si scorrono le schermate: è come si comporta nel
// prodotto, e valutarla ferma in cima non direbbe niente.
//
// ATTENZIONE AL CONTENITORE. `sticky` smette di funzionare se un antenato ha
// `overflow: hidden`, perché quell'antenato diventa il contenitore di scorrimento di
// riferimento e la barra si aggancia a un riquadro che scorre insieme alla pagina. Le
// anteprime tagliano gli angoli con `overflow-clip`, che ritaglia senza creare un
// contenitore di scorrimento. Difetto trovato guardando uno scatto in cui la colonna era
// sparita, non leggendo il codice.

const MENU = [
  { e: "Cruscotto", I: LayoutGrid },
  { e: "Portafoglio", I: Building2 },
  { e: "Scadenzario", I: CalendarClock },
  { e: "Relazioni", I: FileText, futura: true },
  { e: "Impostazioni", I: Settings },
] as const;

export function Guscio({ children }: { children: React.ReactNode }) {
  const [stretta, setStretta] = useState(false);
  const [attiva, setAttiva] = useState("Cruscotto");

  return (
    <div className="flex min-h-[600px] bg-background">
      <aside
        className={cn(
          "sticky top-0 flex h-dvh max-h-[900px] shrink-0 flex-col bg-sidebar text-sidebar-foreground transition-[width] duration-200 ease-out",
          stretta ? "w-14 px-2 py-3" : "w-56 px-3 py-4",
        )}
      >
        <div className={cn("flex items-start", stretta ? "justify-center" : "px-1.5")}>
          {stretta ? (
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
          )}
        </div>

        <nav className="mt-5 flex flex-col gap-0.5" aria-label="Navigazione dell'anteprima">
          {MENU.map(({ e, I, ...resto }) => {
            const futura = "futura" in resto && resto.futura;
            return (
              <button
                key={e}
                type="button"
                disabled={futura}
                title={stretta ? e : undefined}
                aria-current={attiva === e ? "page" : undefined}
                onClick={() => setAttiva(e)}
                className={cn(
                  "flex items-center gap-2.5 rounded-md py-1.5 text-sm transition-colors",
                  stretta ? "justify-center px-0" : "px-2.5",
                  futura
                    ? "cursor-not-allowed text-sidebar-muted/60"
                    : attiva === e
                      ? "bg-sidebar-selected font-medium text-sidebar-foreground"
                      : "text-sidebar-muted hover:bg-sidebar-selected/60 hover:text-sidebar-foreground",
                )}
              >
                <I className="size-4 shrink-0" aria-hidden />
                {stretta ? <span className="sr-only">{e}</span> : e}
                {!stretta && futura ? (
                  <span className="ml-auto text-[9px] tracking-wide uppercase opacity-70">presto</span>
                ) : null}
              </button>
            );
          })}
        </nav>

        <div className="mt-auto space-y-2.5 border-t border-sidebar-border pt-3">
          {stretta ? null : (
            <div className="px-1.5">
              <p className="truncate text-xs font-medium">Marta Bianchi</p>
              <p className="text-[10px] text-sidebar-muted">titolare</p>
            </div>
          )}
          <div className={cn("flex items-center gap-1.5", stretta ? "flex-col" : "px-1.5")}>
            <span className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-sidebar-muted">
              <LogOut className="size-3.5" aria-hidden />
              {stretta ? null : "Esci"}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setStretta((v) => !v)}
            aria-pressed={stretta}
            title={stretta ? "Espandi la barra" : "Riduci la barra"}
            className={cn(
              "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-sidebar-muted hover:bg-sidebar-selected hover:text-sidebar-foreground",
              stretta && "justify-center px-0",
            )}
          >
            {stretta ? (
              <PanelLeftOpen className="size-4 shrink-0" aria-hidden />
            ) : (
              <PanelLeftClose className="size-4 shrink-0" aria-hidden />
            )}
            {stretta ? <span className="sr-only">Espandi la barra</span> : "Riduci"}
          </button>
        </div>
      </aside>

      <div className="min-w-0 flex-1 p-5">{children}</div>
    </div>
  );
}
