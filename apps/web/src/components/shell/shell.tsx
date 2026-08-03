"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Building2, CalendarClock, FileText, LayoutGrid, LogOut, Menu, Settings, X } from "lucide-react";
import { signOut } from "@/lib/auth/client";
import { SelettoreTema } from "@/components/shell/tema";
import { Guida } from "@/components/tour/guida";
import { cn } from "@/lib/utils";

// La shell. Una sola, per tutte le schermate: passando dal portafoglio al 231 cambia il
// contenuto e l'accento, mai la disposizione. Il consulente impara l'interfaccia una volta.
//
// LA BARRA È UN BINARIO DI ICONE, sempre, e non c'è niente da aprire o chiudere.
//
// Scelta dal committente confrontando tre costruzioni sulle stesse schermate. La domanda
// era quanto valgono i pixel della colonna: duecentotrenta su millequattrocento sono il
// sedici per cento dello schermo, tolti alla tabella per sempre. La risposta del binario è
// che non li vale, e allora non li prende: sessanta pixel fissi, sole icone, etichetta che
// esce al passaggio.
//
// Il guadagno non è solo lo spazio. Sparisce anche la preferenza da ricordare — prima
// c'era un cookie `barra-collassata` letto sul server per non far lampeggiare la colonna al
// primo fotogramma — e con lei un comando in meno da capire, uno stato in meno da salvare
// e una richiesta in meno per disegnare la pagina.
//
// IL COSTO, dichiarato: un binario di sole icone è un indovinello finché non ci si passa
// sopra, e cinque icone di navigazione documentale si somigliano. Per questo l'etichetta al
// passaggio non è un vezzo ma la condizione perché la scelta stia in piedi, e per questo il
// nome esteso resta sempre nell'`aria-label`: chi naviga da tastiera o con un lettore di
// schermo non ha un passaggio del mouse da fare.
//
// LA BARRA È SCURA E IL CONTENUTO È CARTA. Un pannello scuro accanto a un foglio chiaro
// legge come uno strumento professionale, due grigi quasi uguali leggono come un abbozzo.
// Lo facevano anche i tre prototipi, che avevano una colonna quasi nera: di quello si
// prende l'idea, non i gradienti e i bagliori che ci stavano sopra.
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
  // LE RELAZIONI NON HANNO UNA VOCE PROPRIA, ed è una decisione. Vivono per azienda —
  // nessuno cerca «tutte le relazioni», cerca quelle di un cliente — e una voce che porta
  // al portafoglio sarebbe un secondo ingresso allo stesso posto: due comandi che fanno la
  // stessa cosa insegnano che l'interfaccia non sa cosa vuole. Si raggiungono dalla scheda
  // dell'azienda, che è il contesto in cui esistono.
  { href: "/impostazioni", etichetta: "Impostazioni", icona: "impostazioni", tour: "impostazioni" },
];

export function Shell({
  studio,
  utente,
  ruolo,
  tourVisti,
  children,
}: {
  studio: string;
  utente: string;
  ruolo: string;
  /** Quali guide questo utente ha già visto, con la versione. */
  tourVisti: Record<string, number>;
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

  /** `binario` distingue le due forme: rotaia sul desktop, colonna con le parole sul telefono. */
  const navigazione = (binario: boolean) => (
    <nav className="flex flex-col gap-0.5" aria-label="Navigazione principale">
      {MENU.map((voce) => {
        const Icona = ICONE[voce.icona];
        const attiva = percorso === voce.href || percorso.startsWith(`${voce.href}/`);
        const classi = cn(
          "group relative flex items-center gap-2.5 rounded-md py-2 text-sm transition-colors",
          binario ? "justify-center px-0" : "px-2.5",
          voce.futura
            ? "cursor-not-allowed text-sidebar-muted/60"
            : attiva
              ? "bg-sidebar-selected font-medium text-sidebar-foreground"
              : "text-sidebar-muted hover:bg-sidebar-selected/60 hover:text-sidebar-foreground",
        );

        const contenuto = (
          <>
            <Icona className="size-4 shrink-0" aria-hidden />
            {binario ? null : voce.etichetta}
            {!binario && voce.futura ? (
              <span className="ml-auto text-[9px] tracking-wide uppercase opacity-70">presto</span>
            ) : null}
            {/* L'ETICHETTA AL PASSAGGIO, che è la condizione perché il binario funzioni.
                Senza, cinque icone documentali sono un indovinello. Sta fuori dalla
                rotaia — `left-full` — quindi nessun antenato deve ritagliarla. */}
            {binario ? (
              <span
                className="pointer-events-none absolute left-full z-50 ml-2 hidden rounded-md bg-sidebar-selected px-2 py-1 text-xs whitespace-nowrap text-sidebar-foreground shadow-md group-hover:block"
                aria-hidden
              >
                {voce.etichetta}
                {voce.futura ? " · presto" : ""}
              </span>
            ) : null}
          </>
        );

        if (voce.futura) {
          return (
            <span
              key={voce.href}
              data-tour={voce.tour}
              aria-disabled="true"
              aria-label={`${voce.etichetta} · in costruzione`}
              className={classi}
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
            aria-label={voce.etichetta}
            aria-current={attiva ? "page" : undefined}
            onClick={() => setApertaSuMobile(false)}
            className={classi}
          >
            {contenuto}
          </Link>
        );
      })}
    </nav>
  );

  const iniziali = studio.slice(0, 2).toUpperCase();
  const inizialiUtente =
    utente
      .split(/[\s@.]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "?";

  return (
    <div className="min-h-dvh bg-background">
      <a
        href="#contenuto"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-surface focus:px-3 focus:py-2 focus:text-sm focus:shadow-md"
      >
        Salta al contenuto
      </a>

      <div className="flex">
        {/* IL BINARIO, solo da `lg` in su. Sotto, la navigazione entra dal cassetto: una
            rotaia da sessanta pixel su uno schermo da trecentonovanta è il quindici per
            cento, e su un telefono quel costo non si giustifica. */}
        <aside
          data-tour="barra-laterale"
          className="sticky top-0 hidden h-dvh w-15 shrink-0 flex-col items-center gap-4 bg-sidebar px-2 py-3 text-sidebar-foreground lg:flex"
        >
          <Link
            href="/cruscotto"
            aria-label={studio}
            title={studio}
            className="grid size-8 shrink-0 place-items-center rounded-md bg-sidebar-selected text-xs font-semibold"
          >
            {iniziali}
          </Link>

          <div className="w-full">{navigazione(true)}</div>

          <div className="mt-auto flex flex-col items-center gap-2">
            <Guida visti={tourVisti} />
            <SelettoreTema />
            <span
              className="grid size-7 place-items-center rounded-full bg-sidebar-selected text-[10px] font-semibold"
              title={`${utente} · ${ruolo}`}
            >
              {inizialiUtente}
            </span>
            <button
              type="button"
              onClick={esci}
              disabled={uscendo}
              data-tour="esci"
              aria-label="Esci"
              title="Esci"
              className="rounded-md p-1.5 text-sidebar-muted hover:bg-sidebar-selected hover:text-sidebar-foreground disabled:opacity-50"
            >
              <LogOut className="size-4" aria-hidden />
            </button>
          </div>
        </aside>

        {/* Il cassetto del telefono. Chiuso è `invisible` e non solo spostato fuori campo:
            `translate-x` da solo lo lascia nell'ordine di tabulazione, e chi naviga da
            tastiera attraverserebbe comandi che non vede. */}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-40 flex w-56 shrink-0 flex-col bg-sidebar px-3 py-4 text-sidebar-foreground transition-transform duration-200 ease-out lg:hidden",
            apertaSuMobile ? "translate-x-0" : "invisible -translate-x-full",
          )}
        >
          <div className="flex items-start justify-between gap-2 px-1.5">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-tight" title={studio}>
                {studio}
              </p>
              <p className="text-[10px] tracking-[0.1em] text-sidebar-muted uppercase">Suite Compliance</p>
            </div>
            <button
              type="button"
              onClick={() => setApertaSuMobile(false)}
              className="text-sidebar-muted hover:text-sidebar-foreground"
              aria-label="Chiudi la navigazione"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>

          <div className="mt-5">{navigazione(false)}</div>

          <div className="mt-auto space-y-2.5 border-t border-sidebar-border pt-3">
            <div className="px-1.5">
              <p className="truncate text-xs font-medium" title={utente}>
                {utente}
              </p>
              <p className="text-[10px] text-sidebar-muted capitalize">{ruolo}</p>
            </div>
            <div className="flex items-center justify-between px-1.5">
              <span className="flex items-center gap-1">
                <Guida visti={tourVisti} />
                <SelettoreTema />
              </span>
              <button
                type="button"
                onClick={esci}
                disabled={uscendo}
                className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-sidebar-muted hover:bg-sidebar-selected hover:text-sidebar-foreground disabled:opacity-50"
              >
                <LogOut className="size-3.5" aria-hidden />
                {uscendo ? "Uscita…" : "Esci"}
              </button>
            </div>
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
