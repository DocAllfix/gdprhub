"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Building2,
  CalendarClock,
  ChevronDown,
  FileText,
  LayoutGrid,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  X,
} from "lucide-react";
import type { SommarioBarra } from "@/features/shell/dati";
import { signOut } from "@/lib/auth/client";
import { SelettoreTema } from "@/components/shell/tema";
import { cn } from "@/lib/utils";

// La shell. Una sola, per tutte le schermate: passando dal portafoglio al 231 cambia il
// contenuto e l'accento, mai la disposizione. Il consulente impara l'interfaccia una volta.
//
// LA BARRA È INCHIOSTRO E IL CONTENUTO È CARTA. È la decisione che cambia la faccia del
// prodotto più di ogni altra: un pannello scuro accanto a un foglio chiaro legge come uno
// strumento professionale, due grigi quasi uguali leggono come un abbozzo. È anche ciò che
// facevano i tre prototipi, che avevano una colonna quasi nera — di quello si prende
// l'idea, non i gradienti e i bagliori che ci stavano sopra.
//
// SI COLLASSA A BINARIO DI ICONE. Chi guarda quaranta clienti su un portatile da tredici
// pollici vuole quei duecento pixel per la tabella. La scelta resta fra le sessioni: è una
// preferenza, non uno stato temporaneo.
//
// Gli attributi `data-tour` si scrivono qui, insieme al componente, e non in una passata
// successiva: un tour che punta a un selettore inventato dopo si rompe al primo refactoring.

export type VoceMenu = {
  readonly href: string;
  readonly etichetta: string;
  readonly icona: "cruscotto" | "portafoglio" | "scadenzario" | "relazioni" | "impostazioni";
  readonly tour: string;
  /** Ancora da costruire: si mostra spenta invece di sparire, così il perimetro è leggibile. */
  readonly futura?: boolean;
};

const ICONE = {
  cruscotto: LayoutGrid,
  portafoglio: Building2,
  scadenzario: CalendarClock,
  relazioni: FileText,
  impostazioni: Settings,
} as const;

export const MENU: readonly VoceMenu[] = [
  { href: "/cruscotto", etichetta: "Cruscotto", icona: "cruscotto", tour: "cruscotto" },
  { href: "/portafoglio", etichetta: "Portafoglio", icona: "portafoglio", tour: "portafoglio" },
  { href: "/scadenzario", etichetta: "Scadenzario", icona: "scadenzario", tour: "scadenzario" },
  { href: "/relazioni", etichetta: "Relazioni", icona: "relazioni", tour: "relazioni", futura: true },
  { href: "/impostazioni", etichetta: "Impostazioni", icona: "impostazioni", tour: "impostazioni" },
];

const CHIAVE_COLLASSO = "barra-collassata";

export function Shell({
  studio,
  utente,
  ruolo,
  collassataIniziale,
  sommario,
  children,
}: {
  studio: string;
  utente: string;
  ruolo: string;
  /** Letta dal cookie sul server: senza, la barra lampeggia aperta e poi si chiude. */
  collassataIniziale: boolean;
  /** Ciò che rende la colonna un pannello di lavoro invece di un elenco di collegamenti. */
  sommario: SommarioBarra;
  children: React.ReactNode;
}) {
  const percorso = usePathname();
  const router = useRouter();
  const [apertaSuMobile, setApertaSuMobile] = useState(false);
  const [collassata, setCollassata] = useState(collassataIniziale);
  const [elencoAperto, setElencoAperto] = useState(false);
  const [uscendo, setUscendo] = useState(false);

  const esci = async () => {
    setUscendo(true);
    await signOut();
    router.push("/accedi");
    router.refresh();
  };

  const commutaCollasso = () => {
    const nuovo = !collassata;
    setCollassata(nuovo);
    // Un cookie e non `localStorage`: il server deve saperlo per disegnare la barra già
    // nella misura giusta. Con `localStorage` il primo fotogramma è sempre quello sbagliato.
    document.cookie = `${CHIAVE_COLLASSO}=${nuovo ? "1" : "0"}; path=/; max-age=31536000; samesite=lax`;
  };

  const stretta = collassata && !apertaSuMobile;

  const navigazione = (
    <nav className="flex flex-col gap-0.5" aria-label="Navigazione principale">
      {MENU.map((voce) => {
        const Icona = ICONE[voce.icona];
        const attiva = percorso === voce.href || percorso.startsWith(`${voce.href}/`);
        const contenuto = (
          <>
            <Icona className="size-4 shrink-0" aria-hidden />
            {stretta ? <span className="sr-only">{voce.etichetta}</span> : voce.etichetta}
            {!stretta && voce.futura ? (
              <span className="ml-auto text-[9px] tracking-wide uppercase opacity-70">presto</span>
            ) : null}
          </>
        );
        const classi = cn(
          "flex items-center gap-2.5 rounded-md py-1.5 text-sm transition-colors",
          stretta ? "justify-center px-0" : "px-2.5",
        );

        if (voce.futura) {
          return (
            <span
              key={voce.href}
              data-tour={voce.tour}
              aria-disabled="true"
              title={`${voce.etichetta} · in costruzione`}
              className={cn(classi, "cursor-not-allowed text-sidebar-muted/60")}
            >
              {contenuto}
            </span>
          );
        }
        return (
          <Link
            key={voce.href}
            href={voce.href}
            data-tour={voce.tour}
            title={stretta ? voce.etichetta : undefined}
            aria-current={attiva ? "page" : undefined}
            onClick={() => setApertaSuMobile(false)}
            className={cn(
              classi,
              attiva
                ? "bg-sidebar-selected font-medium text-sidebar-foreground"
                : "text-sidebar-muted hover:bg-sidebar-selected/60 hover:text-sidebar-foreground",
            )}
          >
            {contenuto}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-dvh bg-background">
      <a
        href="#contenuto"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-surface focus:px-3 focus:py-2 focus:text-sm focus:shadow-md"
      >
        Salta al contenuto
      </a>

      <div className="flex">
        {/* Chiusa su schermo stretto la barra è `invisible`, non solo spostata fuori campo:
            `translate-x` da solo la lascia nell'ordine di tabulazione, e chi naviga da
            tastiera su un telefono attraversa comandi che non vede. */}
        <aside
          data-tour="barra-laterale"
          className={cn(
            "fixed inset-y-0 left-0 z-40 flex shrink-0 flex-col bg-sidebar text-sidebar-foreground transition-[transform,width] duration-200 ease-out lg:static lg:visible lg:translate-x-0",
            stretta ? "w-14 px-2 py-3" : "w-56 px-3 py-4",
            apertaSuMobile ? "translate-x-0" : "invisible -translate-x-full",
          )}
        >
          <div
            className={cn("flex items-start gap-2", stretta ? "justify-center" : "justify-between px-1.5")}
          >
            {stretta ? (
              <span
                className="grid size-8 place-items-center rounded-md bg-sidebar-selected text-xs font-semibold"
                title={studio}
              >
                {studio.slice(0, 2).toUpperCase()}
              </span>
            ) : (
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold tracking-tight" title={studio}>
                  {studio}
                </p>
                <p className="text-[10px] tracking-[0.1em] text-sidebar-muted uppercase">Suite Compliance</p>
              </div>
            )}
            <button
              type="button"
              onClick={() => setApertaSuMobile(false)}
              className="text-sidebar-muted hover:text-sidebar-foreground lg:hidden"
              aria-label="Chiudi la navigazione"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>

          {/* IL CAMBIO CLIENTE, in cima e non sepolto in un menù.
              È il comando più usato del prodotto: un consulente passa da un'azienda
              all'altra decine di volte al giorno. Ogni voce porta la conformità e le
              scadute accanto al nome, così la scelta si fa guardando invece che
              ricordando, e l'elenco è ordinato per urgenza e non alfabeticamente —
              chi lo apre cerca quasi sempre l'azienda che ha un problema. */}
          {stretta ? null : (
            <div className="mt-3">
              <button
                type="button"
                data-tour="cambia-azienda"
                onClick={() => setElencoAperto((v) => !v)}
                aria-expanded={elencoAperto}
                className="flex w-full items-center gap-2 rounded-md border border-sidebar-border px-2 py-1.5 text-left hover:bg-sidebar-selected"
              >
                <Building2 className="size-3.5 shrink-0 text-sidebar-muted" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-medium">
                    {sommario.quanteAziende === 0
                      ? "Nessuna azienda"
                      : `${sommario.quanteAziende} aziende`}
                  </span>
                  <span className="block text-[10px] text-sidebar-muted">
                    {sommario.aziende[0]
                      ? `${sommario.aziende[0].scadute} scadute su ${sommario.aziende[0].nome}`
                      : "in carico allo studio"}
                  </span>
                </span>
                <ChevronDown
                  className={cn(
                    "size-3.5 shrink-0 text-sidebar-muted transition-transform",
                    elencoAperto && "rotate-180",
                  )}
                  aria-hidden
                />
              </button>

              {elencoAperto ? (
                <ul className="mt-1 space-y-0.5">
                  {sommario.aziende.map((a) => (
                    <li key={a.id}>
                      <Link
                        href={`/azienda/${a.id}`}
                        onClick={() => {
                          setElencoAperto(false);
                          setApertaSuMobile(false);
                        }}
                        className="flex items-baseline gap-2 rounded-md px-2 py-1 text-sidebar-muted hover:bg-sidebar-selected hover:text-sidebar-foreground"
                      >
                        <span className="min-w-0 flex-1 truncate text-[11px]">{a.nome}</span>
                        {a.scadute > 0 ? (
                          <span className="shrink-0 font-mono text-[10px] text-scaduta tabular-nums">
                            {a.scadute}
                          </span>
                        ) : null}
                        <span className="w-8 shrink-0 text-right font-mono text-[10px] tabular-nums">
                          {a.conformita === null ? "—" : `${a.conformita}%`}
                        </span>
                      </Link>
                    </li>
                  ))}
                  <li>
                    <Link
                      href="/portafoglio"
                      onClick={() => setElencoAperto(false)}
                      className="block rounded-md px-2 py-1 text-[11px] text-sidebar-muted hover:bg-sidebar-selected hover:text-sidebar-foreground"
                    >
                      Vedi tutto il portafoglio →
                    </Link>
                  </li>
                </ul>
              ) : null}
            </div>
          )}

          <div className="mt-4">{navigazione}</div>

          {/* E la seconda cosa che la colonna si guadagna: dice se c'è da correre prima
              ancora che si apra lo scadenzario. Tre voci, le più urgenti di tutto il
              portafoglio. */}
          {stretta || sommario.prossime.length === 0 ? null : (
            <div className="mt-5 border-t border-sidebar-border pt-3">
              <p className="px-1.5 text-[10px] tracking-[0.09em] text-sidebar-muted uppercase">
                Scade adesso
              </p>
              <ul className="mt-1.5 space-y-0.5">
                {sommario.prossime.map((p) => (
                  <li key={p.istanzaId}>
                    <Link
                      href={`/azienda/${p.aziendaId}/${p.dominio}`}
                      onClick={() => setApertaSuMobile(false)}
                      className="block rounded-md px-1.5 py-1 hover:bg-sidebar-selected"
                    >
                      <span className="flex items-baseline gap-2">
                        <span className="min-w-0 flex-1 truncate text-[11px]">{p.titolo}</span>
                        <span
                          className={cn(
                            "shrink-0 font-mono text-[10px] tabular-nums",
                            p.giorni < 0 ? "text-scaduta" : "text-imminente",
                          )}
                        >
                          {p.giorni > 0 ? `+${p.giorni}` : p.giorni}
                        </span>
                      </span>
                      <span className="block truncate text-[10px] text-sidebar-muted">{p.azienda}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-auto space-y-2.5 border-t border-sidebar-border pt-3">
            {stretta ? null : (
              <div className="px-1.5">
                <p className="truncate text-xs font-medium" title={utente}>
                  {utente}
                </p>
                <p className="text-[10px] text-sidebar-muted capitalize">{ruolo}</p>
              </div>
            )}

            <div className={cn("flex items-center gap-1.5", stretta ? "flex-col" : "justify-between px-1.5")}>
              {stretta ? null : <SelettoreTema />}
              <button
                type="button"
                onClick={esci}
                disabled={uscendo}
                data-tour="esci"
                title="Esci"
                className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-sidebar-muted hover:bg-sidebar-selected hover:text-sidebar-foreground disabled:opacity-50"
              >
                <LogOut className="size-3.5" aria-hidden />
                {stretta ? <span className="sr-only">Esci</span> : uscendo ? "Uscita…" : "Esci"}
              </button>
            </div>

            <button
              type="button"
              onClick={commutaCollasso}
              data-tour="collassa"
              aria-pressed={collassata}
              title={collassata ? "Espandi la barra" : "Riduci la barra"}
              className={cn(
                "hidden w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-sidebar-muted hover:bg-sidebar-selected hover:text-sidebar-foreground lg:flex",
                stretta && "justify-center px-0",
              )}
            >
              {collassata ? (
                <PanelLeftOpen className="size-4 shrink-0" aria-hidden />
              ) : (
                <PanelLeftClose className="size-4 shrink-0" aria-hidden />
              )}
              {stretta ? <span className="sr-only">Espandi la barra</span> : "Riduci"}
            </button>
          </div>
        </aside>

        {apertaSuMobile ? (
          <button
            type="button"
            aria-label="Chiudi la navigazione"
            onClick={() => setApertaSuMobile(false)}
            className="fixed inset-0 z-30 bg-foreground/30 lg:hidden"
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
            <span className="text-sm font-semibold">{studio}</span>
            <span className="ml-auto">
              <SelettoreTema />
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
