import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";

// La pagina che non c'è.
//
// Vale anche per le rotte che in produzione spariscono di proposito — `/varianti`, `/design`,
// i prototipi, lo spike PDF: `soloFuoriProduzione()` chiama `notFound()`, e un 404 dice che
// non c'è niente invece di confermare che esiste qualcosa di protetto.
//
// PER QUESTO IL TESTO NON PROMETTE NULLA. Scrivere «non hai i permessi» o «questa sezione è
// riservata» distinguerebbe una rotta inesistente da una nascosta, e a chi tira a indovinare
// gli indirizzi direbbe quale dei due tentativi ha colpito qualcosa. Qui le due cose si
// leggono uguali, ed è deliberato.

export default function NonTrovata() {
  return (
    <main data-schermata="non-trovata" className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-6 py-16">
      <div className="pannello entra p-6">
        <FileQuestion className="size-5 text-faint-foreground" aria-hidden />
        {/* `text-muted-foreground` e non `faint`: a dieci pixel su carta il token più
            tenue dà 3,57:1 e la soglia AA è 4,5. Misurato, non supposto. */}
        <p className="mt-3 font-mono text-micro tracking-[0.12em] text-muted-foreground">404</p>
        <h1 className="titolo mt-1 text-xl">Pagina non trovata</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          L&apos;indirizzo non corrisponde a nessuna pagina di questa istanza. Può essere un
          collegamento vecchio, oppure un refuso.
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <Button asChild>
            <Link href="/cruscotto">Torna al cruscotto</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/portafoglio">Vai al portafoglio</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
