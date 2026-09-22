"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RotateCw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

// IL CONFINE DI FUORI: le schermate che non hanno la shell.
//
// Accesso, invito, primo accesso. Dentro il gruppo `(app)` interviene prima
// `app/(app)/error.tsx`, che sta sotto il layout della shell e quindi salva la barra; qui
// non c'è barra da salvare, e la pagina si regge da sola.
//
// ⚠️ IL COMMENTO PRECEDENTE DICHIARAVA IL FALSO, e vale la pena scriverlo perché è la
// famiglia di difetti che questo progetto insegue: diceva che senza questo file «l'utente
// perdeva la barra, la navigazione e il contesto». Ma questo confine sta SOPRA il layout che
// disegna la barra, quindi la barra la perdeva comunque. Il file impediva al guasto di
// arrivare a `global-error`, che è un'altra cosa e un bene minore. La barra la salva il
// confine nuovo dentro `(app)`.
//
// L'errore lato server è già stato registrato da `instrumentation.ts`. Questo `useEffect`
// copre il guasto nato nel browser, dove quel gancio non arriva.

export default function Errore({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Solo il riferimento: il messaggio può contenere dati, e la console del browser è un
    // posto da cui si copiano e si incollano schermate.
    console.error(JSON.stringify({ livello: "errore", origine: "client", digest: error.digest }));
  }, [error.digest]);

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-6 py-16">
      <div className="pannello entra p-6">
        <TriangleAlert className="size-5 text-imminente" aria-hidden />
        <h1 className="titolo mt-3 text-xl">Questa pagina non si è caricata</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Il guasto è stato registrato e <strong className="text-foreground">nessun dato è stato
          toccato</strong>. Puoi riprovare: se succede di nuovo, il riferimento qui sotto ci dice cosa
          è andato storto.
        </p>

        {error.digest ? (
          <dl className="mt-5 flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t border-border-subtle pt-4">
            <dt className="text-xs text-muted-foreground">Riferimento per l&apos;assistenza</dt>
            <dd className="font-mono text-sm tabular-nums">{error.digest}</dd>
          </dl>
        ) : null}

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <Button onClick={reset}>
            <RotateCw aria-hidden />
            Riprova
          </Button>
          <Button asChild variant="ghost">
            <Link href="/accedi">Vai all&apos;accesso</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
