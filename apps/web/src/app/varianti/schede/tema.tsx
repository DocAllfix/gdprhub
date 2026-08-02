"use client";

import { useState } from "react";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

// Interruttore di tema per l'anteprima.
//
// Non tocca la preferenza salvata: cambia solo l'attributo sulla radice, così il committente
// confronta i due registri senza portarsi dietro la scelta nel prodotto vero.

export function InterruttoreTema() {
  const [tema, setTema] = useState<"dark" | "light">("dark");
  const cambia = (t: "dark" | "light") => {
    setTema(t);
    document.documentElement.setAttribute("data-theme", t);
  };
  return (
    <div className="inline-flex items-center gap-0.5 rounded-lg border border-border bg-surface p-0.5">
      {(
        [
          { v: "dark", e: "Scuro", I: Moon },
          { v: "light", e: "Chiaro", I: Sun },
        ] as const
      ).map(({ v, e, I }) => (
        <button
          key={v}
          type="button"
          onClick={() => cambia(v)}
          aria-pressed={tema === v}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs",
            tema === v ? "bg-surface-raised font-medium text-foreground" : "text-muted-foreground",
          )}
        >
          <I className="size-3.5" aria-hidden />
          {e}
        </button>
      ))}
    </div>
  );
}
