import { Scheletro, ScheletroTabella, ScheletroTestata } from "@/components/ui/scheletro";

// L'assessment è la pagina più pesante del prodotto: 171 righe. È anche quella in cui
// l'assenza di un segnaposto si nota di più, perché il server ci mette di più.
//
// ⚠️ MANCAVA LA MATRICE DEI DUE ASSI, e il salto era il peggiore del prodotto.
//
// Fra la testata e i filtri la pagina rende `DueAssi`, un `.pannello p-5` alto circa
// centottanta pixel: il segnaposto non lo prevedeva, quindi all'arrivo del contenuto la
// tabella — cioè la cosa che si stava aspettando — scendeva di colpo di quell'altezza. È
// esattamente il difetto che un segnaposto esiste per evitare: «il contenuto si posa dove
// l'occhio lo stava già aspettando, senza salti».
//
// Non si vedeva leggendo il codice: si vede rallentando la rete e guardando.
export default function Caricamento() {
  return (
    <div className="mx-auto max-w-[1600px] px-6 py-8">
      <Scheletro className="h-3 w-24" />
      <div className="mt-3">
        <ScheletroTestata />
      </div>

      {/* La matrice dei due assi: quattro righe per quattro colonne, con la spiegazione a
          sinistra. Le proporzioni contano più del dettaglio — quello che deve combaciare è
          l'ALTEZZA, perché è lei che sposta la tabella. */}
      <section className="pannello mt-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-3">
          <div className="max-w-md">
            <Scheletro className="h-4 w-40" />
            <Scheletro className="mt-2 h-3 w-full" />
            <Scheletro className="mt-1.5 h-3 w-4/5" />
          </div>
          <div className="space-y-1.5">
            {[0, 1, 2, 3, 4].map((r) => (
              <div key={r} className="flex gap-3">
                {[0, 1, 2, 3, 4].map((c) => (
                  <Scheletro key={c} className={r === 0 || c === 0 ? "h-3 w-16" : "h-3 w-8"} />
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="mt-5 flex flex-wrap gap-2">
        {[220, 90, 90, 90, 70].map((w, i) => (
          <Scheletro key={i} className="h-9 rounded-md" style={{ width: w }} />
        ))}
      </div>
      <div className="mt-4">
        <ScheletroTabella righe={14} />
      </div>
    </div>
  );
}
