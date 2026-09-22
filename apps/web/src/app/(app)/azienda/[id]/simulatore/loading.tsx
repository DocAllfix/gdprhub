import { Scheletro, ScheletroTestata } from "@/components/ui/scheletro";

// IL SEGNAPOSTO CHE NON C'ERA, e la sua assenza era peggio di un rettangolo grigio.
//
// Senza un `loading.tsx` proprio, Next riusa quello dell'antenato più vicino — qui
// `azienda/[id]/loading.tsx`, che disegna i tre moduli, sei schede di registro e una tabella
// di scadenze. Il simulatore non è niente di tutto questo: è un pannello di proiezione e un
// elenco di caselle da spuntare. Il segnaposto non era generico, era BUGIARDO: prometteva
// una pagina che non sarebbe mai arrivata, e chi guardava vedeva l'impaginato cambiare
// completamente sotto gli occhi.
//
// Era anche l'unica rotta dinamica autenticata dichiarata nel cancello visivo senza un
// segnaposto suo.
//
// La forma che arriva: testata, il pannello «se chiudo questi, dove arrivo» con le due cifre
// a confronto, e sotto la lastra con l'elenco degli adempimenti da spuntare.
export default function Caricamento() {
  return (
    <div className="mx-auto max-w-[1600px] px-6 py-8">
      <Scheletro className="h-3 w-24" />
      <div className="mt-3">
        <ScheletroTestata conCifra={false} />
      </div>
      <Scheletro className="mt-1.5 h-3 w-96 max-w-full" />

      <div className="mt-6 space-y-4">
        {/* La proiezione: due cifre affiancate con la freccia in mezzo. */}
        <section className="pannello p-5">
          <Scheletro className="h-4 w-56" />
          <div className="mt-4 grid gap-6 sm:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i}>
                <Scheletro className="h-3 w-28" />
                <div className="mt-2 flex items-center gap-3">
                  <Scheletro className="h-8 w-16" />
                  <Scheletro className="size-4 rounded-full" />
                  <Scheletro className="h-8 w-16" />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* L'elenco da spuntare. */}
        <section className="pannello overflow-clip">
          <div className="border-b border-border-subtle p-5">
            <Scheletro className="h-4 w-56" />
            <Scheletro className="mt-2 h-3 w-80 max-w-full" />
          </div>
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex items-center gap-3 border-b border-border-subtle px-5 py-2.5 last:border-0">
              <Scheletro className="size-4 shrink-0 rounded-xs" />
              <Scheletro className="h-3 w-12 shrink-0" />
              <Scheletro className="h-3 min-w-0 flex-1" style={{ maxWidth: `${54 - i * 5}%` }} />
              <Scheletro className="hidden h-3 w-20 shrink-0 sm:block" />
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
