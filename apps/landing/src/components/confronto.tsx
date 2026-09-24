import { formattaIt } from "@legisboard/engine";
import { Codice, PastigliaDominio, Scadenza, StatoLavoroEtichetta } from "@legisboard/ui/stato";
import { Check } from "lucide-react";
import { TESI } from "@/lib/dati";

// PRIMA E DOPO: lo stesso adempimento, due modi di mostrarlo.
//
// È la tesi del prodotto in due secondi. A sinistra un campo solo, come lo tengono quasi tutti
// gli strumenti: dice «Completata», e ha ragione, ed è una bugia. A destra i due assi, con i
// componenti veri del prodotto.
//
// La colonna di sinistra NON usa il verde, anche se il «fatto» di uno strumento generico
// sarebbe verde: da noi il verde appartiene allo stato della scadenza, e usarlo per raffigurare
// l'errore altrui ruberebbe il canale che porta il dato. Basta il segno di spunta.
//
// Le due colonne hanno trattamenti diversi di proposito: non sono due schede gemelle da
// confrontare alla pari, sono un prima spento e un dopo vivo.

export function Confronto() {
  if (!TESI?.scadenza) return null;
  const data = formattaIt(TESI.scadenza);
  const giorni = Math.abs(TESI.giorni ?? 0);

  return (
    <div className="grid gap-6 lg:grid-cols-2 lg:gap-0">
      <figure className="flex min-w-0 flex-col justify-between gap-8 rounded-lg bg-surface-sunken p-6 lg:rounded-r-none lg:p-8">
        <figcaption className="text-micro font-semibold tracking-widest text-muted-foreground uppercase">
          Un campo solo
        </figcaption>
        <div>
          <div className="flex items-center gap-3 text-muted-foreground">
            <Codice codice={TESI.codice} />
            <span className="truncate">{TESI.titolo}</span>
          </div>
          <p className="mt-4 inline-flex items-center gap-2 rounded-md border border-border-strong bg-surface px-3 py-1.5 font-medium">
            <Check className="size-4" aria-hidden />
            Completata
          </p>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Il campo dice «fatto». Il ciclo è scaduto il {data}, e da questa riga non lo vedrà nessuno.
        </p>
      </figure>

      <figure className="flex min-w-0 flex-col justify-between gap-8 rounded-lg border-2 border-foreground bg-surface p-6 lg:-ml-px lg:rounded-l-none lg:p-8">
        <figcaption className="text-micro font-semibold tracking-widest text-primary uppercase">Due assi</figcaption>
        <div>
          <div className="flex items-center gap-3">
            <PastigliaDominio dominio={TESI.dominio} />
            <Codice codice={TESI.codice} />
            <span className="truncate font-medium">{TESI.titolo}</span>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <StatoLavoroEtichetta stato={TESI.stato} />
            <Scadenza data={TESI.scadenza} giorni={TESI.giorni} statoScadenza={TESI.statoScadenza} />
          </div>
        </div>
        <p className="text-sm leading-relaxed">
          Il lavoro è completato, e la scadenza è passata da {giorni} giorni. Due fatti, due posti: nessuno dei due copre
          l&apos;altro.
        </p>
      </figure>
    </div>
  );
}
