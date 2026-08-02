"use client";

import { useActionState } from "react";
import { Check, Power } from "lucide-react";
import { DOMINI, ETICHETTE_DOMINIO, type Dominio } from "@gdpr/engine";
import { commutaModulo, type Esito } from "@/features/portafoglio/azioni";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// L'attivazione dei moduli per una singola azienda.
//
// Attivare popola: il modulo compare con tutti gli adempimenti del catalogo, pronti da
// lavorare. Disattivare NON cancella: l'assessment e le evidenze restano, e riattivando il
// lavoro ricompare. Una disattivazione distruttiva sarebbe un modo eccellente di perdere due
// anni di documentazione con un clic, e il pulsante lo dice invece di lasciarlo indovinare.

const TINTA: Readonly<Record<Dominio, string>> = {
  gdpr: "text-gdpr",
  d231: "text-d231",
  d81: "text-d81",
};

export function ModuliAzienda({
  aziendaId,
  attivi,
  conteggi,
  modificabile,
}: {
  aziendaId: string;
  attivi: readonly Dominio[];
  /** Adempimenti già censiti per dominio: dice cosa si perde di vista disattivando. */
  conteggi: Readonly<Record<Dominio, number>>;
  modificabile: boolean;
}) {
  const [esito, azione, inCorso] = useActionState<Esito | null, FormData>(commutaModulo, null);

  return (
    <div className="space-y-3" data-tour="moduli-azienda">
      <div className="grid gap-px overflow-hidden rounded-md border border-border bg-border sm:grid-cols-3">
        {DOMINI.map((d) => {
          const attivo = attivi.includes(d);
          const censiti = conteggi[d] ?? 0;
          return (
            <div key={d} className="flex flex-col gap-3 bg-surface p-4">
              <div>
                <p className={cn("text-sm font-semibold", TINTA[d])}>{ETICHETTE_DOMINIO[d].breve}</p>
                <p className="text-xs text-muted-foreground">{ETICHETTE_DOMINIO[d].esteso}</p>
                <p className="mt-0.5 font-mono text-[10px] text-faint-foreground">
                  {ETICHETTE_DOMINIO[d].norma}
                </p>
              </div>

              <p className="text-xs">
                {attivo ? (
                  <span className="inline-flex items-center gap-1 text-regolare">
                    <Check className="size-3.5" aria-hidden />
                    Attivo · {censiti} adempimenti
                  </span>
                ) : (
                  <span className="text-faint-foreground">
                    Non attivo{censiti > 0 ? ` · ${censiti} adempimenti conservati` : ""}
                  </span>
                )}
              </p>

              <form action={azione} className="mt-auto">
                <input type="hidden" name="aziendaId" value={aziendaId} />
                <input type="hidden" name="dominio" value={d} />
                <Button
                  type="submit"
                  size="sm"
                  variant={attivo ? "outline" : "default"}
                  disabled={inCorso || !modificabile}
                  data-tour={`modulo-${d}`}
                  className="w-full"
                  title={
                    modificabile
                      ? attivo
                        ? "I dati restano conservati e ricompaiono riattivando"
                        : "Crea gli adempimenti del catalogo per questa azienda"
                      : "Serve il ruolo consulente o superiore"
                  }
                >
                  <Power className="size-3.5" aria-hidden />
                  {attivo ? "Disattiva" : "Attiva"}
                </Button>
              </form>
            </div>
          );
        })}
      </div>

      {esito && !esito.ok ? (
        <p role="alert" className="text-xs text-scaduta">
          {esito.errore}
        </p>
      ) : null}
      {!modificabile ? (
        <p className="text-xs text-muted-foreground">
          Il tuo ruolo consente la sola lettura: i moduli li attiva un consulente.
        </p>
      ) : null}
    </div>
  );
}
