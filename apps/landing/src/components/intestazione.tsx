import { Logotipo, Simbolo } from "@gdpr/ui/marchio";
import { Menu } from "lucide-react";
import Link from "next/link";
import { INGRESSO_DEMO, RICHIESTE_ATTIVE } from "@/lib/sito";
import { PULSANTE_PIENO } from "./pulsanti";

export const ANCORE = [
  ["#problema", "Il problema"],
  ["#decreti", "I tre decreti"],
  ["#come-funziona", "Come funziona"],
  ["#distribuzione", "Distribuzione"],
  ["#domande", "Domande"],
] as const;

// Il menu da telefono è un <details>: si apre e si chiude senza una riga di JavaScript, ed è
// già un controllo accessibile — il lettore di schermo annuncia «compresso» ed «espanso».
export function Intestazione() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-6 px-5">
        {/* 24 px d'altezza: il logotipo è largo 139 px a questa misura (rapporto fisso dichiarato
            nel file consegnato), quindi il browser conosce l'ingombro prima di disegnarlo. */}
        <Link href="/" className="shrink-0 rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
          {/* Sotto `sm` il logotipo intero non ci sta accanto al pulsante e al menu: misurato,
              l'intestazione arrivava a 389 px su un telefono da 320. Il simbolo da solo è
              disegnato per essere leggibile a 24 px, ed è il suo uso. */}
          <Simbolo className="size-6 text-primary sm:hidden" titolo="Legisboard" />
          <Logotipo className="hidden h-6 w-auto sm:block" />
        </Link>

        <nav aria-label="Sezioni" className="hidden lg:block">
          <ul className="flex items-center gap-6 text-sm text-muted-foreground">
            {ANCORE.map(([href, testo]) => (
              <li key={href}>
                <a href={href} className="transition-colors hover:text-foreground">
                  {testo}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-3">
          {RICHIESTE_ATTIVE ? (
            <a href="#richiesta" className="hidden text-sm font-medium text-foreground hover:underline sm:inline">
              Richiedi una presentazione
            </a>
          ) : null}
          <a href={INGRESSO_DEMO} className={PULSANTE_PIENO}>
            Entra nella demo
          </a>
          <details className="relative lg:hidden">
            <summary className="flex size-11 cursor-pointer list-none items-center justify-center rounded-md border border-border-strong">
              <Menu className="size-5" aria-hidden />
              <span className="sr-only">Menu</span>
            </summary>
            <nav aria-label="Sezioni" className="absolute right-0 mt-2 w-56 rounded-md border bg-surface p-2 shadow-md">
              <ul className="flex flex-col">
                {ANCORE.map(([href, testo]) => (
                  <li key={href}>
                    <a href={href} className="block rounded-sm px-3 py-2 text-sm hover:bg-surface-sunken">
                      {testo}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </details>
        </div>
      </div>
    </header>
  );
}
