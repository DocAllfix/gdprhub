import { Scheletro } from "@/components/ui/scheletro";

// IL SEGNAPOSTO CHE MANCAVA. `/invito/[id]` era l'unica rotta dinamica del prodotto senza,
// e DESIGN.md dice «ogni rotta ha il suo `loading.tsx`».
//
// Qui pesa più che altrove: chi arriva viene da un collegamento in una email, quindi apre a
// freddo, senza cache e spesso da un'altra rete. La pagina interroga il database per sapere
// se l'invito è valido, e senza segnaposto fra il clic e la schermata non succede niente —
// su un indirizzo che l'utente non ha mai visto, una pagina bianca si legge come un
// collegamento rotto, non come un'attesa.
//
// La forma è quella che arriva: la colonna di marca a sinistra e il modulo a destra. La
// colonna NON è uno scheletro grigio ma già il fondo oliva definitivo — è l'unica parte che
// non dipende dalla query, quindi farla tremolare sarebbe fingere un'attesa che non c'è.

export default function CaricamentoInvito() {
  return (
    <main className="grid min-h-dvh lg:grid-cols-[1fr_460px]">
      <section className="hidden flex-col justify-between bg-sidebar px-12 py-10 lg:flex">
        <div className="mx-auto w-full max-w-lg border-t-2 border-b border-sidebar-foreground/70 pt-2 pb-2.5">
          <Scheletro className="h-4 w-48 bg-sidebar-border" />
        </div>
        <div className="mx-auto w-full max-w-lg">
          <Scheletro className="h-3 w-28 bg-sidebar-border" />
          <Scheletro className="mt-3 h-8 w-full max-w-md bg-sidebar-border" />
          <Scheletro className="mt-4 h-3 w-full bg-sidebar-border" />
          <Scheletro className="mt-2 h-3 w-4/5 bg-sidebar-border" />
          <div className="mt-8 border-t border-sidebar-border">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center justify-between gap-4 border-b border-sidebar-border/60 py-2.5">
                <Scheletro className="h-3 w-56 max-w-[60%] bg-sidebar-border" />
                <Scheletro className="h-3 w-8 bg-sidebar-border" />
              </div>
            ))}
          </div>
        </div>
        <Scheletro className="mx-auto h-3 w-full max-w-lg bg-sidebar-border" />
      </section>

      <section className="flex flex-col justify-center px-6 py-16 sm:px-12">
        <div className="mx-auto w-full max-w-sm">
          <Scheletro className="h-6 w-48" />
          {/* I tre dati dell'invito: indirizzo, ruolo, scadenza. */}
          <div className="mt-5 divide-y divide-border-subtle border-y border-border-subtle">
            {[36, 28, 24].map((w, i) => (
              <div key={i} className="flex items-center justify-between gap-4 py-2.5">
                <Scheletro className="h-3 w-20" />
                <Scheletro className="h-3" style={{ width: `${w}%` }} />
              </div>
            ))}
          </div>
          {/* I due campi e il pulsante. */}
          <div className="mt-6 space-y-5">
            {[0, 1].map((i) => (
              <div key={i}>
                <Scheletro className="h-3 w-24" />
                <Scheletro className="mt-1.5 h-8 w-full" />
                <Scheletro className="mt-1.5 h-3 w-3/4" />
              </div>
            ))}
            <Scheletro className="h-8 w-full" />
          </div>
        </div>
      </section>
    </main>
  );
}
