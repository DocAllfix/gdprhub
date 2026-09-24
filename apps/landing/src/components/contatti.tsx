import { CONTATTO_EMAIL } from "@/lib/sito";
import { PULSANTE_PIENO, PULSANTE_VUOTO } from "./pulsanti";

// IL CONTATTO SENZA MODULO: tre email con l'oggetto già scritto.
//
// Il modulo della landing ha bisogno di un relay SMTP, che oggi non c'è. Un indirizzo invece
// funziona subito, non raccoglie niente su questa pagina, e porta chi ha provato la demo dove
// voleva arrivare — un appuntamento o una richiesta d'acquisto — invece che su una pagina che
// promette e non mantiene.

const scrivi = (oggetto: string) => `mailto:${CONTATTO_EMAIL}?subject=${encodeURIComponent(oggetto)}`;

export function Contatti() {
  if (!CONTATTO_EMAIL) return null;
  return (
    <section id="richiesta" aria-labelledby="richiesta-titolo" className="border-b bg-surface-sunken">
      <div className="mx-auto grid w-full max-w-6xl items-center gap-10 px-5 py-24 lg:grid-cols-[1fr_1.2fr]">
        <div>
          <h2 id="richiesta-titolo" className="text-display-sm font-semibold tracking-tight">
            Parliamone.
          </h2>
          <p className="mt-4 leading-relaxed text-muted-foreground">
            Scriveteci a{" "}
            <a href={`mailto:${CONTATTO_EMAIL}`} className="font-medium text-foreground underline underline-offset-2">
              {CONTATTO_EMAIL}
            </a>
            . Vi rispondiamo entro due giorni lavorativi.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <a href={scrivi("Legisboard · vorrei fissare un appuntamento")} className={PULSANTE_PIENO}>
            Fissa un appuntamento
          </a>
          <a href={scrivi("Legisboard · richiesta d'acquisto")} className={PULSANTE_VUOTO}>
            Richiedi l&apos;acquisto
          </a>
          <a href={scrivi("Legisboard · vorrei una presentazione")} className={PULSANTE_VUOTO}>
            Una presentazione
          </a>
        </div>
      </div>
    </section>
  );
}
