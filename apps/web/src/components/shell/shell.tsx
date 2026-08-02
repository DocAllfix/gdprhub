"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Building2, CalendarClock, FileText, LayoutGrid, LogOut, Menu, Settings, X } from "lucide-react";
import { signOut } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { SelettoreTema } from "@/components/shell/tema";
import { cn } from "@/lib/utils";

// La shell. Una sola, per tutte le schermate: passando dal portafoglio al 231 cambia il
// contenuto e l'accento, mai la disposizione. Il consulente impara l'interfaccia una volta.
//
// La barra laterale è STRETTA e le voci sono POCHE. Un professionista che apre lo strumento
// sei ore al giorno non naviga: sa dove andare. Lo spazio guadagnato va alla tabella, che è
// il posto dove il lavoro succede davvero.
//
// Gli attributi `data-tour` si scrivono qui, insieme al componente, e non in una passata
// successiva: un tour che punta a un selettore inventato dopo si rompe al primo refactoring.

export type VoceMenu = {
  readonly href: string;
  readonly etichetta: string;
  readonly icona: "portafoglio" | "scadenzario" | "relazioni" | "impostazioni";
  readonly tour: string;
  /** Ancora da costruire: si mostra spenta invece di sparire, così il perimetro è leggibile. */
  readonly futura?: boolean;
};

const ICONE = {
  portafoglio: Building2,
  scadenzario: CalendarClock,
  relazioni: FileText,
  impostazioni: Settings,
} as const;

export const MENU: readonly VoceMenu[] = [
  { href: "/portafoglio", etichetta: "Portafoglio", icona: "portafoglio", tour: "portafoglio" },
  { href: "/scadenzario", etichetta: "Scadenzario", icona: "scadenzario", tour: "scadenzario", futura: true },
  { href: "/relazioni", etichetta: "Relazioni", icona: "relazioni", tour: "relazioni", futura: true },
  { href: "/impostazioni", etichetta: "Impostazioni", icona: "impostazioni", tour: "impostazioni" },
];

export function Shell({
  studio,
  utente,
  ruolo,
  children,
}: {
  studio: string;
  utente: string;
  ruolo: string;
  children: React.ReactNode;
}) {
  const percorso = usePathname();
  const router = useRouter();
  const [apertaSuMobile, setApertaSuMobile] = useState(false);
  const [uscendo, setUscendo] = useState(false);

  const esci = async () => {
    setUscendo(true);
    await signOut();
    router.push("/accedi");
    router.refresh();
  };

  const navigazione = (
    <nav className="flex flex-col gap-0.5" aria-label="Navigazione principale">
      {MENU.map((voce) => {
        const Icona = ICONE[voce.icona];
        const attiva = percorso === voce.href || percorso.startsWith(`${voce.href}/`);
        if (voce.futura) {
          return (
            <span
              key={voce.href}
              data-tour={voce.tour}
              aria-disabled="true"
              title="In costruzione"
              className="flex cursor-not-allowed items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm text-faint-foreground"
            >
              <Icona className="size-4 shrink-0" aria-hidden />
              {voce.etichetta}
              <span className="ml-auto text-[10px] tracking-wide uppercase">presto</span>
            </span>
          );
        }
        return (
          <Link
            key={voce.href}
            href={voce.href}
            data-tour={voce.tour}
            aria-current={attiva ? "page" : undefined}
            onClick={() => setApertaSuMobile(false)}
            className={cn(
              "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm",
              attiva
                ? "bg-selected font-medium text-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            <Icona className="size-4 shrink-0" aria-hidden />
            {voce.etichetta}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-dvh bg-background">
      {/* Il salto al contenuto è il primo elemento focalizzabile: chi naviga da tastiera
          non deve attraversare la barra laterale a ogni pagina. */}
      <a
        href="#contenuto"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-surface focus:px-3 focus:py-2 focus:text-sm focus:shadow-md"
      >
        Salta al contenuto
      </a>

      <div className="flex">
        {/* Chiusa su schermo stretto la barra è `invisible`, non solo spostata fuori campo.
            `translate-x` da solo la toglie dagli occhi ma la lascia nell'ordine di
            tabulazione e nell'albero di accessibilità: chi naviga da tastiera su un telefono
            attraversa cinque comandi che non vede. `visibility: hidden` li rimuove davvero, e
            `lg:visible` li restituisce dove la barra c'è per davvero.
            Trovato dal cancello visivo, che su mobile non riusciva a cliccarli. */}
        <aside
          data-tour="barra-laterale"
          className={cn(
            "fixed inset-y-0 left-0 z-40 flex w-56 shrink-0 flex-col border-r border-border bg-sidebar px-3 py-4 transition-transform lg:static lg:visible lg:translate-x-0",
            apertaSuMobile ? "translate-x-0" : "invisible -translate-x-full",
          )}
        >
          <div className="flex items-start justify-between gap-2 px-1.5">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-tight" title={studio}>
                {studio}
              </p>
              <p className="text-[10px] tracking-[0.1em] text-faint-foreground uppercase">Suite Compliance</p>
            </div>
            <button
              type="button"
              onClick={() => setApertaSuMobile(false)}
              className="text-muted-foreground hover:text-foreground lg:hidden"
              aria-label="Chiudi la navigazione"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>

          <div className="mt-5">{navigazione}</div>

          <div className="mt-auto space-y-3 border-t border-border pt-3">
            <div className="px-1.5">
              <p className="truncate text-xs font-medium" title={utente}>
                {utente}
              </p>
              <p className="text-[10px] text-faint-foreground capitalize">{ruolo}</p>
            </div>
            <div className="flex items-center justify-between gap-2 px-1.5">
              <SelettoreTema />
              <Button
                variant="ghost"
                size="sm"
                onClick={esci}
                disabled={uscendo}
                data-tour="esci"
                className="h-7 px-2 text-xs"
              >
                <LogOut className="size-3.5" aria-hidden />
                {uscendo ? "Uscita…" : "Esci"}
              </Button>
            </div>
          </div>
        </aside>

        {apertaSuMobile ? (
          <button
            type="button"
            aria-label="Chiudi la navigazione"
            onClick={() => setApertaSuMobile(false)}
            className="fixed inset-0 z-30 bg-foreground/20 lg:hidden"
          />
        ) : null}

        <div className="min-w-0 flex-1">
          <header className="flex items-center gap-3 border-b border-border bg-surface px-4 py-2 lg:hidden">
            <button
              type="button"
              onClick={() => setApertaSuMobile(true)}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Apri la navigazione"
            >
              <Menu className="size-5" aria-hidden />
            </button>
            <span className="flex items-center gap-1.5 text-sm font-semibold">
              <LayoutGrid className="size-4" aria-hidden />
              {studio}
            </span>
          </header>

          <main id="contenuto" className="min-w-0">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
