import { CONTROL_TEMPLATES } from "@gdpr/engine";

// Segnaposto della Fase 0. Esiste per dimostrare che l'impalcatura regge: il motore è
// raggiungibile dall'app, il catalogo è caricato, la pagina supera il cancello visivo.
// Viene sostituita alla Fase 5 dalla home reale (portafoglio o cruscotto, secondo il
// profilo dell'istanza).

const perRuolo = ["Titolare", "Responsabile", "DPO"].map((ruolo) => ({
  ruolo,
  quanti: CONTROL_TEMPLATES.filter((t) => t.ruolo === ruolo).length,
}));

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center gap-10 px-6 py-24">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
          Fase 0 · Impalcatura
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
          GDPR Compliance Hub
        </h1>
        <p className="mt-3 max-w-prose text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          Catalogo dei controlli caricato dal motore di calcolo. Questa pagina è un segnaposto tecnico: viene
          sostituita dalla schermata reale alla Fase 5.
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200 sm:grid-cols-4 dark:border-slate-800 dark:bg-slate-800">
        <div className="bg-white p-4 dark:bg-slate-950">
          <dt className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Controlli
          </dt>
          <dd className="mt-1 text-2xl font-semibold tabular-nums text-slate-900 dark:text-slate-50">
            {CONTROL_TEMPLATES.length}
          </dd>
        </div>
        {perRuolo.map(({ ruolo, quanti }) => (
          <div key={ruolo} className="bg-white p-4 dark:bg-slate-950">
            <dt className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {ruolo}
            </dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums text-slate-900 dark:text-slate-50">
              {quanti}
            </dd>
          </div>
        ))}
      </dl>

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
