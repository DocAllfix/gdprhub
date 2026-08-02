import { CATALOGHI, DOMINI, ETICHETTE_DOMINIO, TUTTI_I_TEMPLATES, categorieDi } from "@gdpr/engine";

// Segnaposto della Fase 1. Esiste per dimostrare che l'impalcatura regge: il motore è
// raggiungibile dall'app, i tre cataloghi sono caricati, la pagina supera il cancello
// visivo. Viene sostituita alla Fase 6 dal portafoglio reale.

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center gap-10 px-6 py-24">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
          Fase 1 · Motore di calcolo
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
          Suite Compliance
        </h1>
        <p className="mt-3 max-w-prose text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          {TUTTI_I_TEMPLATES.length} adempimenti sui tre decreti, caricati dal motore di calcolo. Questa
          pagina è un segnaposto tecnico: viene sostituita dal portafoglio alla Fase 6.
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
        <table className="w-full text-left text-sm tabular-nums">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 dark:bg-slate-900 dark:text-slate-400">
            <tr>
              <th className="px-4 py-2 font-medium">Modulo</th>
              <th className="px-4 py-2 font-medium">Norma</th>
              <th className="px-4 py-2 text-right font-medium">Adempimenti</th>
              <th className="px-4 py-2 text-right font-medium">Categorie</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-800 dark:bg-slate-950">
            {DOMINI.map((d) => (
              <tr key={d}>
                <td className="px-4 py-2.5 font-medium text-slate-900 dark:text-slate-50">
                  {ETICHETTE_DOMINIO[d].breve}
                  <span className="ml-2 text-xs font-normal text-slate-500 dark:text-slate-400">
                    {ETICHETTE_DOMINIO[d].esteso}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">
                  {ETICHETTE_DOMINIO[d].norma}
                </td>
                <td className="px-4 py-2.5 text-right text-slate-900 dark:text-slate-50">
                  {CATALOGHI[d].length}
                </td>
                <td className="px-4 py-2.5 text-right text-slate-600 dark:text-slate-300">
                  {categorieDi(d).length}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
            <tr>
              <td className="px-4 py-2.5 font-semibold text-slate-900 dark:text-slate-50" colSpan={2}>
                Totale
              </td>
              <td className="px-4 py-2.5 text-right font-semibold text-slate-900 dark:text-slate-50">
                {TUTTI_I_TEMPLATES.length}
              </td>
              <td className="px-4 py-2.5" />
            </tr>
          </tfoot>
        </table>
      </div>

      <p className="text-xs text-slate-500 dark:text-slate-400">
        Verifica tecnica in corso ·{" "}
        <a
          href="/api/health"
          className="underline underline-offset-4 hover:text-slate-900 dark:hover:text-slate-100"
        >
          stato dell&apos;istanza
        </a>
      </p>
    </main>
  );
}
