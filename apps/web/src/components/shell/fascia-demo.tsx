import { env } from "@/lib/env";

// LA FASCIA DELLA DEMO PUBBLICA _(docs/07 §5.1)_.
//
// Dice tre cose che il visitatore deve sapere prima di toccare qualcosa: che è una demo, che
// i dati sono inventati, e che tornano com'erano ogni notte. Poi offre le due strade che il
// committente vuole dopo la prova: un appuntamento, o una richiesta d'acquisto.
//
// Colori dell'ACCENTO, non di stato: rosso, ambra e verde qui dentro parlano di scadenze, e
// una fascia informativa colorata come un allarme ruberebbe un canale che porta dati.

function scrivi(oggetto: string): string {
  return `mailto:${env.CONTATTO_EMAIL}?subject=${encodeURIComponent(oggetto)}`;
}

export function FasciaDemo() {
  return (
    <div
      data-tour="demo-fascia"
      className="mb-6 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-md border border-accento-border bg-accento-surface px-4 py-3 text-sm"
    >
      <p className="min-w-0 flex-1">
        <strong className="font-semibold">Demo.</strong> I dati sono di un&apos;azienda d&apos;esempio inventata, e ogni
        notte tornano com&apos;erano: cambiate pure gli stati.
      </p>
      {env.CONTATTO_EMAIL ? (
        <div className="flex flex-wrap items-center gap-3">
          <a
            href={scrivi("Legisboard · vorrei fissare un appuntamento")}
            className="inline-flex h-9 items-center rounded-md bg-primary px-3 font-medium text-primary-foreground hover:bg-primary-hover"
          >
            Fissa un appuntamento
          </a>
          <a href={scrivi("Legisboard · richiesta d'acquisto")} className="font-medium underline underline-offset-2">
            Richiedi l&apos;acquisto
          </a>
        </div>
      ) : null}
    </div>
  );
}
