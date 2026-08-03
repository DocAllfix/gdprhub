"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BookMarked, Building2, CornerDownLeft, FileText, LayoutGrid, Search } from "lucide-react";
import { cercaGlobale } from "@/features/ricerca/azioni";
import type { Risultato } from "@/features/ricerca/dati";
import { cn } from "@/lib/utils";

// LA PALETTE, ⌘K.
//
// È il secondo comando più usato di questo prodotto dopo il cambio cliente, e per un motivo
// preciso: un consulente non naviga, cerca. Sa il nome dell'azienda o il codice
// dell'adempimento, e ogni clic in mezzo è tempo perso.
//
// SI APRE DA TASTIERA E BASTA, senza un pulsante nella barra. È una scelta: un pulsante
// «cerca» insegna a usare il mouse per una cosa che si fa con le dita già sulla tastiera, e
// occuperebbe uno dei sessanta pixel del binario. La scorciatoia si impara dal tour e dal
// suggerimento nella pagina vuota — chi non la impara usa la navigazione, che c'è.
//
// LA RICERCA GIRA SUL SERVER, e il ritardo è dichiarato: 180 millisecondi dopo l'ultimo
// tasto. Senza, digitare «ferrarini» manderebbe nove richieste, otto delle quali per
// risultati che nessuno leggerà. Con un ritardo più lungo la palette sembra lenta.

const ICONA = {
  azienda: Building2,
  adempimento: FileText,
  registro: BookMarked,
  schermata: LayoutGrid,
} as const;
const ETICHETTA_TIPO = {
  azienda: "Azienda",
  adempimento: "Adempimento",
  registro: "Registro",
  schermata: "Vai a",
} as const;

export function Palette() {
  const router = useRouter();
  const [aperta, setAperta] = useState(false);
  const [query, setQuery] = useState("");
  const [risultati, setRisultati] = useState<readonly Risultato[]>([]);
  const [scelto, setScelto] = useState(0);
  const [inCorso, avvia] = useTransition();
  const campo = useRef<HTMLInputElement>(null);

  // UN SOLO PUNTO DI CHIUSURA, e azzera tutto lì dentro.
  //
  // La prima versione azzerava in un effetto che osservava `aperta`, e il compilatore di
  // React l'ha rifiutata: è un ridisegno a catena. Aveva ragione anche nella sostanza —
  // reagire a un cambiamento che si è provocati da soli significa avere due posti in cui
  // succede la stessa cosa, e prima o poi divergono.
  const chiudi = useCallback(() => {
    setAperta(false);
    setQuery("");
    setRisultati([]);
    setScelto(0);
  }, []);

  // ⌘K su Mac, Ctrl+K altrove. Si ferma l'evento: su Firefox Ctrl+K porta alla barra di
  // ricerca del browser, e lasciarlo passare significherebbe che la scorciatoia funziona su
  // due browser su tre.
  useEffect(() => {
    const suTasto = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setAperta((v) => {
          if (v) {
            setQuery("");
            setRisultati([]);
            setScelto(0);
          }
          return !v;
        });
      }
      if (e.key === "Escape") chiudi();
    };
    window.addEventListener("keydown", suTasto);
    return () => window.removeEventListener("keydown", suTasto);
  }, [chiudi]);

  // Il ritardo evita una richiesta per tasto. `avvia` tiene l'interfaccia reattiva mentre
  // il server risponde: la lista precedente resta a schermo invece di sparire.
  useEffect(() => {
    if (!aperta) return;
    const t = setTimeout(() => {
      avvia(async () => {
        const r = await cercaGlobale(query);
        setRisultati(r);
        setScelto(0);
      });
    }, 180);
    return () => clearTimeout(t);
  }, [query, aperta]);

  const vai = useCallback(
    (r: Risultato) => {
      chiudi();
      router.push(r.percorso);
    },
    [router, chiudi],
  );

  const suTastoLista = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setScelto((i) => Math.min(i + 1, risultati.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setScelto((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const r = risultati[scelto];
      if (r) vai(r);
    }
  };

  if (!aperta) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-foreground/40 px-4 pt-[12vh]"
      role="dialog"
      aria-modal="true"
      aria-label="Cerca"
      data-tour="palette"
      onClick={(e) => {
        if (e.target === e.currentTarget) chiudi();
      }}
    >
      <div className="pannello w-full max-w-xl overflow-clip bg-surface-raised">
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <input
            ref={campo}
            // Il fuoco si mette qui e non con un effetto: chi preme ⌘K sta già scrivendo,
            // e un effetto che sposta il fuoco sarebbe il ridisegno a catena che il
            // compilatore rifiuta.
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={suTastoLista}
            placeholder="Cerca un'azienda, un codice, un registro"
            aria-label="Cerca"
            // I RUOLI NON SONO DECORAZIONE. Le frecce spostano una selezione che
            // esiste solo come colore di sfondo: senza `aria-activedescendant` un
            // lettore di schermo continua ad annunciare il campo di testo vuoto
            // mentre l'utente scorre i risultati, e la ricerca diventa inutilizzabile
            // per chi non vede l'evidenziazione.
            role="combobox"
            aria-expanded={risultati.length > 0}
            aria-controls="risultati-ricerca"
            aria-activedescendant={risultati[scelto] ? `risultato-${scelto}` : undefined}
            autoComplete="off"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-faint-foreground"
          />
          <kbd className="rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
            esc
          </kbd>
        </div>

        {risultati.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            {query.trim().length < 2
              ? "Scrivi almeno due caratteri."
              : inCorso
                ? "Cerco…"
                : `Nessun risultato per «${query}».`}
          </p>
        ) : (
          <ul
            id="risultati-ricerca"
            role="listbox"
            aria-label="Risultati"
            className="max-h-[52vh] overflow-y-auto py-1.5"
          >
            {risultati.map((r, i) => {
              const I = ICONA[r.tipo];
              return (
                <li key={`${r.tipo}-${r.percorso}-${r.codice ?? ""}`} role="presentation">
                  <button
                    type="button"
                    id={`risultato-${i}`}
                    role="option"
                    aria-selected={i === scelto}
                    onClick={() => vai(r)}
                    onMouseEnter={() => setScelto(i)}
                    className={cn(
                      "flex w-full items-center gap-3 px-4 py-2 text-left",
                      i === scelto ? "bg-selected" : "hover:bg-accent",
                    )}
                  >
                    <I className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm">{r.titolo}</span>
                      <span className="block truncate text-[11px] text-muted-foreground">
                        {r.sottotitolo}
                      </span>
                    </span>
                    <span className="shrink-0 text-[10px] tracking-[0.09em] text-faint-foreground uppercase">
                      {ETICHETTA_TIPO[r.tipo]}
                    </span>
                    {i === scelto ? (
                      <CornerDownLeft className="size-3.5 shrink-0 text-faint-foreground" aria-hidden />
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <p className="border-t border-border px-4 py-2 text-[10px] text-faint-foreground">
          ↑↓ per scorrere · invio per aprire · ⌘K per richiudere
        </p>
      </div>
    </div>
  );
}
