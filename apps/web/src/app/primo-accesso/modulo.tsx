"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cambiaPassword, type EsitoCambio } from "./azione";

// Il modulo del cambio password forzato. La pagina non ha navigazione: finché la password
// iniziale è in vigore non si va da nessuna parte, ed è il punto.
//
// Il guard sta nella pagina che lo racchiude, sul server: chi ha già cambiato la password
// non deve nemmeno vedere questo modulo.

export function ModuloPrimoAccesso() {
  const router = useRouter();
  const [esito, azione, inCorso] = useActionState<EsitoCambio | null, FormData>(cambiaPassword, null);

  useEffect(() => {
    if (esito?.ok) {
      router.replace("/portafoglio");
      router.refresh();
    }
  }, [esito, router]);

  return (
    <main className="flex min-h-dvh items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <ShieldCheck className="size-5 text-muted-foreground" aria-hidden />
        <h1 className="mt-3 text-xl font-semibold tracking-tight">Cambia la password</h1>
        <p className="mt-1 mb-6 text-sm text-muted-foreground">
          Le credenziali iniziali sono scritte nel file di configurazione dell&apos;istanza. Restano valide
          finché non le sostituisci: fallo adesso.
        </p>

        <form action={azione} className="space-y-4" data-tour="primo-accesso" noValidate>
          <div className="space-y-1.5">
            <label htmlFor="attuale" className="text-xs font-medium">
              Password attuale
            </label>
            <Input id="attuale" name="attuale" type="password" autoComplete="current-password" required />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="nuova" className="text-xs font-medium">
              Nuova password
            </label>
            <Input
              id="nuova"
              name="nuova"
              type="password"
              autoComplete="new-password"
              minLength={12}
              required
            />
            <p className="text-xs text-muted-foreground">Almeno dodici caratteri.</p>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="conferma" className="text-xs font-medium">
              Ripeti la nuova password
            </label>
            <Input
              id="conferma"
              name="conferma"
              type="password"
              autoComplete="new-password"
              minLength={12}
              required
            />
          </div>

          {esito && !esito.ok ? (
            <p role="alert" className="flex items-start gap-1.5 text-xs text-scaduta">
              <AlertCircle className="mt-px size-3.5 shrink-0" aria-hidden />
              {esito.errore}
            </p>
          ) : null}

          <Button type="submit" disabled={inCorso} className="w-full">
            {inCorso ? "Aggiornamento…" : "Aggiorna la password"}
          </Button>
        </form>
      </div>
    </main>
  );
}
