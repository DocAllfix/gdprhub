import Link from "next/link";
import { AlertTriangle, ArrowUpRight } from "lucide-react";
import { DOMINI, ETICHETTE_DOMINIO, REGISTRI, type Dominio } from "@gdpr/engine";
import { PastigliaDominio } from "@/components/stato";

// L'INDICE DEI REGISTRI, sulla scheda azienda.
//
// Si mostrano solo i registri dei moduli attivi. Un'azienda senza modello 231 non deve
// vedere il registro dei flussi verso l'OdV: comparirebbe vuoto per sempre, e un elenco
// che contiene righe che non riguardano nessuno è un elenco che si smette di leggere.
//
// IL NUMERO CHE SI VEDE È QUANTE VOCI RICHIEDONO UN INTERVENTO ADESSO, non quante ce ne
// sono in tutto. «14 violazioni» non dice niente; «2 da presidiare» dice cosa fare oggi.

export function IndiceRegistri({
  aziendaId,
  attivi,
  sommario,
}: {
  aziendaId: string;
  attivi: readonly Dominio[];
  sommario: Map<string, { quante: number; daPresidiare: number }>;
}) {
  const perDominio = DOMINI.filter((d) => attivi.includes(d)).map((d) => ({
    dominio: d,
    registri: REGISTRI.filter((r) => r.dominio === d),
  }));

  if (perDominio.length === 0) return null;

  return (
    <div className="space-y-5" data-tour="registri">
      {perDominio.map(({ dominio, registri }) => (
        <div key={dominio}>
          <div className="mb-2 flex items-center gap-2">
            <PastigliaDominio dominio={dominio} />
            <span className="text-xs text-muted-foreground">{ETICHETTE_DOMINIO[dominio].norma}</span>
          </div>
          <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {registri.map((r) => {
              const s = sommario.get(r.tipo);
              return (
                <li key={r.tipo}>
                  <Link
                    href={`/azienda/${aziendaId}/registro/${r.tipo}`}
                    className="pannello tocca group block h-full p-3.5"
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-sm font-medium">{r.nome}</span>
                      <span className="flex shrink-0 items-baseline gap-1">
                        <span className="cifra text-base">{s?.quante ?? 0}</span>
                        <ArrowUpRight
                          className="size-3.5 self-center text-faint-foreground opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                          aria-hidden
                        />
                      </span>
                    </div>
                    <p className="mt-1 font-mono text-micro text-muted-foreground">{r.norma}</p>
                    {s && s.daPresidiare > 0 ? (
                      <p className="mt-1.5 flex items-center gap-1 text-nota font-medium text-scaduta">
                        <AlertTriangle className="size-3.5" aria-hidden />
                        {s.daPresidiare} da presidiare
                      </p>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
