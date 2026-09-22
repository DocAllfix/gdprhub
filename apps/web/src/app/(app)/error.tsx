"use client";

import { useEffect } from "react";
import { RotateCw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

// IL CONFINE CHE TIENE LA BARRA, e che prima non esisteva.
//
// `app/error.tsx` c'era già, ma sta SOPRA `(app)/layout.tsx`, cioè sopra il layout che
// disegna la shell. Un errore in una pagina protetta risaliva fin lassù e si portava via
// anche la barra laterale, la navigazione e il contesto dell'azienda — esattamente le tre
// cose che il commento di quel file dichiarava di salvare.
//
// Un confine dentro il gruppo `(app)` li salva davvero: il layout che sta sopra ha già
// disegnato la shell, e qui si sostituisce soltanto il contenuto della pagina. Chi incontra
// un guasto resta dov'era e può andare altrove con un clic, invece di trovarsi su una
// schermata nuda in mezzo al nulla.
//
// L'errore lato server è già stato registrato da `instrumentation.ts`, che lo intercetta
// prima di qui. Questo `useEffect` copre l'altro caso: un guasto nato nel browser, dove quel
// gancio non arriva.

export default function ErroreApplicazione({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Solo il riferimento e il tipo: il messaggio può contenere dati del cliente, e la
    // console del browser è un posto da cui si copiano e si incollano schermate.
    console.error(JSON.stringify({ livello: "errore", origine: "client", digest: error.digest }));
  }, [error.digest]);

  return (
    <div className="mx-auto max-w-[1600px] px-6 py-7">
      <header>
        <p className="text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">Errore</p>
        <h1 className="titolo mt-1.5 text-titolo">Questa pagina non si è caricata</h1>
      </header>

      <div className="pannello entra mt-6 max-w-2xl p-6">
        <TriangleAlert className="size-5 text-imminente" aria-hidden />
        <p className="mt-3 text-sm leading-relaxed">
          Il guasto è stato registrato. <strong>Nessun dato è stato toccato</strong>: la schermata
          compare prima che qualunque scrittura venga confermata.
        </p>
        <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted-foreground">
          Il resto dell&apos;applicazione continua a funzionare — la barra qui a fianco porta ovunque.
          Se riprovando succede di nuovo, il riferimento qui sotto ci dice esattamente cosa è
          successo.
        </p>

        {/* IL RIFERIMENTO SÌ, IL MESSAGGIO NO. Il `digest` identifica l'errore nei nostri
            registri; il testo dell'eccezione può contenere valori del database, e questa
            schermata la legge il cliente. */}
        {error.digest ? (
          <dl className="mt-5 flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t border-border-subtle pt-4">
            <dt className="text-xs text-muted-foreground">Riferimento per l&apos;assistenza</dt>
            <dd className="font-mono text-sm tabular-nums">{error.digest}</dd>
          </dl>
        ) : null}

        <div className="mt-5">
          <Button onClick={reset}>
            <RotateCw aria-hidden />
            Riprova
          </Button>
        </div>
      </div>
    </div>
  );
}
