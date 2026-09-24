import { Logotipo } from "@legisboard/ui/marchio";
import { INGRESSO_DEMO } from "@/lib/sito";
import { ANCORE } from "./intestazione";

// Nessuna ragione sociale e nessuna partita IVA: decisione del committente del 2026-09-24, che
// le ha giudicate non necessarie per il lancio. La pagina entra comunque negli indici. Se un
// giorno servissero, stanno qui, nella riga del copyright.
export function Piede() {
  return (
    <footer className="border-t bg-surface">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-5 py-16 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Logotipo className="h-6 w-auto" />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
            Il registro unico degli adempimenti GDPR, D.Lgs 231/2001 e D.Lgs 81/2008, con lo stato del lavoro separato
            dalla scadenza.
          </p>
        </div>
        <nav aria-label="Pagina">
          <p className="text-micro font-semibold tracking-widest text-muted-foreground uppercase">Pagina</p>
          <ul className="mt-4 space-y-2 text-sm">
            {ANCORE.map(([href, testo]) => (
              <li key={href}>
                <a href={href} className="hover:underline">
                  {testo}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div>
          <p className="text-micro font-semibold tracking-widest text-muted-foreground uppercase">Prodotto</p>
          <ul className="mt-4 space-y-2 text-sm">
            <li>
              <a href={INGRESSO_DEMO} className="hover:underline">
                Entra nella demo
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap justify-between gap-4 px-5 py-6 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} Legisboard</p>
          <p>La demo gira a Francoforte, con il database nell&apos;Unione europea.</p>
        </div>
      </div>
    </footer>
  );
}
