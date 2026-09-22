import { Scheletro, ScheletroTestata } from "@/components/ui/scheletro";

// Il segnaposto del cruscotto.
//
// ⚠️ RIFATTO IL 2026-09-19, perché contraddiceva nel proprio segnaposto la regola che la
// pagina rispetta. Rendeva QUATTRO pannelli separati in fascia, mentre il cruscotto apre con
// UNA SUPERFICIE SOLA divisa da un capello — che è esattamente la distinzione su cui
// DESIGN.md insiste: «quattro schede uguali dicono quattro oggetti indipendenti e si leggono
// una per una; una superficie sola divisa da un capello dice un fatto in tre parti, e l'occhio
// confronta invece di enumerare». Il segnaposto insegnava all'occhio la forma sbagliata e poi
// consegnava l'altra.
//
// Il commento diceva «ha la STESSA impaginazione della pagina che arriva». Non era vero, e
// nessuno l'aveva verificato: un segnaposto lo si vede per qualche centinaio di millisecondi,
// e per accorgersene bisogna rallentare la rete apposta.
//
// La forma vera, fascia per fascia:
//   1.  1fr + 340px   la lastra dei tre decreti, e il Complessivo di fianco
//   2.  tre colonne   orizzonte · rischio e priorità · esposizione
//   3.  tre colonne   carico dei dodici mesi (due) · composizione
//   4.  tre colonne   per categoria · per responsabile · andamento
export default function Caricamento() {
  return (
    <div className="mx-auto max-w-[1600px] px-6 py-7">
      <ScheletroTestata conCifra={false} />

      {/* Fascia 1: la lastra. Un pannello solo, tre parti separate dal capello. */}
      <section className="mt-6 grid gap-3 lg:grid-cols-[1fr_340px]">
        <div className="pannello overflow-clip">
          <div className="grid md:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className={i > 0 ? "p-5 md:border-l md:border-border-subtle" : "p-5"}>
                <Scheletro className="h-3 w-28" />
                <Scheletro className="mt-4 h-9 w-20" />
                <Scheletro className="mt-2 h-3 w-36 max-w-full" />
                <Scheletro className="mt-4 h-2 w-full rounded-full" />
              </div>
            ))}
          </div>
        </div>
        <div className="pannello p-5">
          <Scheletro className="h-3 w-24" />
          <Scheletro className="mt-4 h-9 w-24" />
          <Scheletro className="mt-2 h-3 w-32" />
          <Scheletro className="mt-5 h-2 w-full rounded-full" />
          <div className="mt-4 space-y-2">
            <Scheletro className="h-3 w-full" />
            <Scheletro className="h-3 w-4/5" />
          </div>
        </div>
      </section>

      {/* Fasce 2, 3 e 4: tre colonne ciascuna. */}
      {[0, 1, 2].map((fascia) => (
        <section key={fascia} className="mt-3 grid gap-3 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="pannello h-60 p-5">
              <Scheletro className="h-4 w-32" />
              <Scheletro className="mt-2 h-3 w-48 max-w-full" />
              <Scheletro className="mt-5 h-28 w-full" />
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
