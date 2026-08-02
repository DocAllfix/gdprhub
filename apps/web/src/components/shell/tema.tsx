"use client";

import { useSyncExternalStore } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

// Il selettore del tema. Tre stati, non due: «sistema» è un valore, non l'assenza di una
// scelta, e va detto esplicitamente perché il DPO che apre lo strumento alle dieci del
// mattino e lo richiude alle otto di sera vuole che segua la macchina.
//
// Lo script sincrono in `layout.tsx` ha già stampato l'attributo prima del disegno: qui non
// si applica un tema per la prima volta, si cambia una preferenza già in vigore.
//
// `useSyncExternalStore` e non `useState` più `useEffect`: la preferenza vive in
// `localStorage`, che è una sorgente esterna a React. Il beneficio concreto non è
// accademico — nella scena che ha deciso il tema chiaro il consulente ha DUE FINESTRE
// AFFIANCATE, e l'evento `storage` fa cambiare tema anche all'altra.

type Scelta = "light" | "dark" | "system";

const CHIAVE = "tema";

const ascoltatori = new Set<() => void>();

function sottoscrivi(callback: () => void) {
  ascoltatori.add(callback);
  // `storage` scatta nelle ALTRE schede, non in quella che scrive: le due vie insieme
  // coprono entrambi i casi.
  window.addEventListener("storage", callback);
  return () => {
    ascoltatori.delete(callback);
    window.removeEventListener("storage", callback);
  };
}

function leggi(): Scelta {
  const v = localStorage.getItem(CHIAVE);
  return v === "light" || v === "dark" ? v : "system";
}

/** Sul server la preferenza non è leggibile: si dichiara «sistema» e si corregge al montaggio. */
const leggiSulServer = (): Scelta => "system";

function scegli(scelta: Scelta) {
  if (scelta === "system") localStorage.removeItem(CHIAVE);
  else localStorage.setItem(CHIAVE, scelta);

  const scuro =
    scelta === "system" ? window.matchMedia("(prefers-color-scheme: dark)").matches : scelta === "dark";
  document.documentElement.setAttribute("data-theme", scuro ? "dark" : "light");

  for (const notifica of ascoltatori) notifica();
}

const OPZIONI: readonly { valore: Scelta; etichetta: string; Icona: typeof Sun }[] = [
  { valore: "light", etichetta: "Chiaro", Icona: Sun },
  { valore: "dark", etichetta: "Scuro", Icona: Moon },
  { valore: "system", etichetta: "Sistema", Icona: Monitor },
];

export function SelettoreTema() {
  const scelta = useSyncExternalStore(sottoscrivi, leggi, leggiSulServer);

  return (
    <div
      className="inline-flex items-center gap-0.5 rounded-md border border-border bg-surface-sunken p-0.5"
      role="group"
      aria-label="Tema dell'interfaccia"
      data-tour="tema"
    >
      {OPZIONI.map(({ valore, etichetta, Icona }) => (
        <button
          key={valore}
          type="button"
          onClick={() => scegli(valore)}
          aria-pressed={scelta === valore}
          title={etichetta}
          className={cn(
            "inline-flex size-6 items-center justify-center rounded",
            scelta === valore
              ? "bg-surface text-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Icona className="size-3.5" aria-hidden />
          <span className="sr-only">{etichetta}</span>
        </button>
      ))}
    </div>
  );
}
