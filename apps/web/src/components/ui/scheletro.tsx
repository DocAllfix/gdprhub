import { cn } from "@/lib/utils";

// I SEGNAPOSTO DI CARICAMENTO.
//
// Servono a una cosa sola: dare una risposta immediata al clic.
//
// Ogni pagina di questo prodotto è `force-dynamic`, e deve esserlo: i numeri devono
// riflettere l'ultima scrittura, e una pagina di assessment servita da una cache è il dato
// di ieri presentato come quello di oggi. Ma la conseguenza è che ogni navigazione aspetta
// il server — e il server sta a Francoforte.
//
// Senza un `loading.tsx` che renda questi segnaposto, fra il clic e la pagina **non succede
// niente**: la schermata vecchia resta ferma, l'utente non sa se il clic è arrivato, e il
// prodotto si legge come lento anche quando la query impiega centottanta millisecondi.
// È la differenza fra «lento» e «morto», e si percepisce come lentezza.
//
// La forma del segnaposto conta. Un rettangolo grigio generico dice «sto caricando»; un
// segnaposto che ha la STESSA impaginazione della pagina che arriverà dice «sto caricando
// QUESTO», e quando il contenuto sostituisce lo scheletro non c'è salto — il contenuto si
// posa dove l'occhio lo stava già aspettando.
//
// L'animazione si ferma con `prefers-reduced-motion`: il segnaposto resta, pulsa soltanto
// per chi ha accettato il movimento.

export function Scheletro({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      aria-hidden
      className={cn("rounded-md bg-surface-sunken motion-safe:animate-pulse", className)}
      {...props}
    />
  );
}

/** L'intestazione di pagina: soprattitolo, titolo, e la cifra grande a destra. */
export function ScheletroTestata({ conCifra = true }: { conCifra?: boolean }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <Scheletro className="h-3 w-20" />
        <Scheletro className="mt-2.5 h-7 w-72 max-w-full" />
      </div>
      {conCifra ? (
        <div className="text-right">
          <Scheletro className="ml-auto h-8 w-20" />
          <Scheletro className="mt-2 ml-auto h-3 w-32" />
        </div>
      ) : null}
    </div>
  );
}

/** Una fascia di pannelli affiancati: cruscotto, moduli, indicatori. */
export function ScheletroFascia({ quanti = 4, altezza = "h-56" }: { quanti?: number; altezza?: string }) {
  return (
    <div className={cn("grid gap-3", quanti === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3")}>
      {Array.from({ length: quanti }).map((_, i) => (
        <div key={i} className={cn("pannello p-5", altezza)}>
          <Scheletro className="h-4 w-24" />
          <Scheletro className="mt-2 h-3 w-40 max-w-full" />
          <Scheletro className="mt-5 h-9 w-20" />
          <Scheletro className="mt-4 h-2 w-full rounded-full" />
          <div className="mt-4 space-y-2">
            <Scheletro className="h-3 w-full" />
            <Scheletro className="h-3 w-4/5" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Un elenco di righe dentro un pannello: portafoglio, registri, relazioni. */
export function ScheletroElenco({ righe = 6, altezza = "h-14" }: { righe?: number; altezza?: string }) {
  return (
    <div className="pannello divide-y divide-border-subtle overflow-clip">
      {Array.from({ length: righe }).map((_, i) => (
        <div key={i} className={cn("flex items-center gap-4 px-5", altezza)}>
          <Scheletro className="h-3.5 w-16 shrink-0" />
          <Scheletro className="h-3.5 min-w-0 flex-1" style={{ maxWidth: `${52 - i * 4}%` }} />
          <Scheletro className="hidden h-3 w-24 shrink-0 sm:block" />
          <Scheletro className="h-3 w-12 shrink-0" />
        </div>
      ))}
    </div>
  );
}

/** Una tabella densa: assessment, scadenzario. */
export function ScheletroTabella({ righe = 12 }: { righe?: number }) {
  return (
    <div className="pannello overflow-clip">
      <div className="flex items-center gap-4 border-b border-border-subtle bg-surface-sunken px-4 py-2.5">
        {[14, 40, 12, 12, 10].map((w, i) => (
          <Scheletro key={i} className="h-3" style={{ width: `${w}%` }} />
        ))}
      </div>
      {Array.from({ length: righe }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-2.5">
          {[14, 40, 12, 12, 10].map((w, j) => (
            <Scheletro key={j} className="h-3" style={{ width: `${w}%` }} />
          ))}
        </div>
      ))}
    </div>
  );
}
