"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useFormStatus } from "react-dom";
import { Check, Loader2, Power } from "lucide-react";
import { CATALOGHI, DOMINI, ETICHETTE_DOMINIO, type Dominio } from "@legisboard/engine";
import { commutaModulo, type Esito } from "@/features/portafoglio/azioni";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// L'attivazione dei moduli per una singola azienda.
//
// Attivare popola: il modulo compare con tutti gli adempimenti del catalogo, pronti da
// lavorare. Disattivare NON cancella: l'assessment e le evidenze restano, e riattivando il
// lavoro ricompare. Una disattivazione distruttiva sarebbe un modo eccellente di perdere due
// anni di documentazione con un clic, e il pulsante lo dice invece di lasciarlo indovinare.

/** Quanti adempimenti crea l'attivazione: il pulsante lo dice prima di farlo. */
const ATTESI = Object.fromEntries(DOMINI.map((d) => [d, CATALOGHI[d].length])) as Record<Dominio, number>;

const TINTA: Readonly<Record<Dominio, string>> = {
  gdpr: "text-gdpr",
  d231: "text-d231",
  d81: "text-d81",
};

/**
 * Il pulsante di un singolo modulo.
 *
 * Vive in un componente suo per usare `useFormStatus`, che dà lo stato di attesa DEL SUO
 * form: `useActionState` è condiviso fra i tre e li farebbe girare tutti insieme.
 *
 * Perché serve davvero: misurato su Vercel, attivare un modulo richiede quasi cinque
 * secondi — sessantacinque adempimenti da scrivere e un giro di rete verso il database.
 * Con il solo `disabled` il consulente clicca e per cinque secondi non succede niente di
 * visibile. Il pulsante dice cosa sta facendo e quanto lavoro comporta.
 */
function PulsanteModulo({
  attivo,
  dominio,
  quanti,
  disabilitato,
  titolo,
}: {
  attivo: boolean;
  dominio: Dominio;
  quanti: number;
  disabilitato: boolean;
  titolo: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      size="sm"
      variant={attivo ? "outline" : "default"}
      disabled={pending || disabilitato}
      data-tour={`modulo-${dominio}`}
      // IL CANCELLO VISIVO NON TOCCA QUESTO INTERRUTTORE.
      //
      // Il cancello preme ogni comando per verificare che nessuno esploda. Questo comando
      // però non cambia una pagina: cambia l'AZIENDA, e tutto ciò che il cancello visita
      // dopo vede un cliente diverso da quello che doveva verificare. Nella stessa corsa la
      // scheda azienda ha contato venti collegamenti in tema chiaro e sei in tema scuro,
      // perché fra i due un clic aveva spento il GDPR: nessun errore, verdetto verde,
      // metà del prodotto non verificata.
      //
      // L'attivazione e la disattivazione si provano in `percorso.mjs`, che è il collaudo
      // del FLUSSO: lì il gesto è voluto, l'ordine è deciso e lo stato viene rimesso a
      // posto. Qui sarebbe un effetto collaterale su tutte le pagine successive.
      data-cancello="salta"
      className="w-full"
      title={titolo}
    >
      {pending ? (
        <Loader2 className="size-3.5 animate-spin" aria-hidden />
      ) : (
        <Power className="size-3.5" aria-hidden />
      )}
      {pending
        ? attivo
          ? "Disattivazione…"
          : `Creo ${quanti} adempimenti…`
        : attivo
          ? "Disattiva"
          : "Attiva"}
    </Button>
  );
}

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
  const [esito, azione] = useActionState<Esito | null, FormData>(commutaModulo, null);

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
                <p className="mt-0.5 font-mono text-micro text-muted-foreground">
                  {ETICHETTE_DOMINIO[d].norma}
                </p>
              </div>

              <p className="text-xs">
                {attivo ? (
                  <Link
                    href={`/azienda/${aziendaId}/${d}`}
                    data-tour={`apri-${d}`}
                    className="inline-flex items-center gap-1 text-regolare hover:underline"
                  >
                    <Check className="size-3.5" aria-hidden />
                    Attivo · {censiti} adempimenti
                  </Link>
                ) : (
                  <span className="text-muted-foreground">
                    Non attivo{censiti > 0 ? ` · ${censiti} adempimenti conservati` : ""}
                  </span>
                )}
              </p>

              <form action={azione} className="mt-auto">
                <input type="hidden" name="aziendaId" value={aziendaId} />
                <input type="hidden" name="dominio" value={d} />
                <PulsanteModulo
                  attivo={attivo}
                  dominio={d}
                  quanti={ATTESI[d]}
                  disabilitato={!modificabile}
                  titolo={
                    modificabile
                      ? attivo
                        ? "I dati restano conservati e ricompaiono riattivando"
                        : "Crea gli adempimenti del catalogo per questa azienda"
                      : "Serve il ruolo consulente o superiore"
                  }
                />
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
