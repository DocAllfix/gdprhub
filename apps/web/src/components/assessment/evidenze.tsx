"use client";

import { useActionState } from "react";
import { Download, FileCheck2, Paperclip, Trash2 } from "lucide-react";
import { caricaEvidenza, eliminaEvidenza, type EsitoEvidenza } from "@/features/evidenze/azioni";
import { pesoLeggibile, type Evidenza } from "@/features/evidenze/tipi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// LE EVIDENZE DI UN ADEMPIMENTO.
//
// Un adempimento «completato» senza documento è una dichiarazione; con il documento è una
// prova, e il prodotto esiste per produrre prove. Questa sezione è quindi il posto dove
// l'assessment smette di essere una lista di spunte.
//
// TRE COSE SI VEDONO SEMPRE, e ognuna serve a una domanda che un ispettore fa davvero:
//   la VERSIONE, perché caricare di nuovo non sostituisce — un documento cambiato in
//     silenzio rende indifendibile tutto il registro;
//   l'IMPRONTA, abbreviata ma mostrata, perché è ciò che permette di dire «questo è
//     esattamente il file depositato il 3 agosto» e non «uno che si chiama così»;
//   la VALIDITÀ, perché un certificato scaduto allegato a un adempimento in regola è la
//     situazione che il prodotto deve far vedere invece di nascondere.
//
// I controlli sul tipo e sulla dimensione stanno sul server e si rifanno lì: quelli qui
// servono solo a non far caricare venti megabyte per poi rifiutarli.

const ACCETTATI = ".pdf,.png,.jpg,.jpeg,.docx,.xlsx,.pptx";

export function Evidenze({
  istanzaId,
  elenco,
  modificabile,
}: {
  istanzaId: string;
  elenco: readonly Evidenza[];
  modificabile: boolean;
}) {
  const [carica, azioneCarica, caricando] = useActionState<EsitoEvidenza | null, FormData>(
    caricaEvidenza,
    null,
  );
  const [rimozione, azioneElimina, eliminando] = useActionState<EsitoEvidenza | null, FormData>(
    eliminaEvidenza,
    null,
  );

  // NESSUNA COPIA LOCALE DELL'ELENCO. La prima versione ne teneva una e la riallineava con
  // un effetto: il compilatore di React l'ha rifiutata, e aveva ragione — è uno stato che
  // duplica quello del genitore e che può restare indietro. Dopo ogni azione è il pannello
  // a rileggere l'elenco e a ripassarlo qui, quindi qui non c'è niente da ricordare.

  const errore = (carica && !carica.ok && carica.errore) || (rimozione && !rimozione.ok && rimozione.errore);

  return (
    <section className="space-y-3 border-t border-border pt-4" data-tour="evidenze">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-xs font-semibold tracking-[0.09em] uppercase">
          <Paperclip className="size-3.5" aria-hidden />
          Evidenze
        </h3>
        <span className="font-mono text-micro text-muted-foreground tabular-nums">{elenco.length}</span>
      </div>

      {elenco.length === 0 ? (
        <p className="text-nota leading-relaxed text-muted-foreground">
          Nessun documento allegato. Un adempimento chiuso senza evidenza resta una dichiarazione: davanti a
          un&apos;ispezione conta la carta che lo dimostra.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {elenco.map((e) => (
            <li key={e.id} className="rounded-lg bg-surface-sunken px-3 py-2">
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-micro text-muted-foreground">v{e.versione}</span>
                <a
                  href={`/api/evidenze/${e.id}`}
                  className="min-w-0 flex-1 truncate text-xs hover:underline"
                  title={e.nomeFile}
                >
                  {e.nomeFile}
                </a>
                <a
                  href={`/api/evidenze/${e.id}`}
                  aria-label={`Scarica ${e.nomeFile}`}
                  className="shrink-0 text-muted-foreground hover:text-foreground"
                >
                  <Download className="size-3.5" aria-hidden />
                </a>
                {modificabile ? (
                  <form action={azioneElimina} className="shrink-0">
                    <input type="hidden" name="evidenzaId" value={e.id} />
                    <button
                      type="submit"
                      disabled={eliminando}
                      aria-label={`Elimina ${e.nomeFile}`}
                      className="text-muted-foreground hover:text-scaduta disabled:opacity-50"
                    >
                      <Trash2 className="size-3.5" aria-hidden />
                    </button>
                  </form>
                ) : null}
              </div>
              <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-micro text-muted-foreground">
                <span className="font-mono">{pesoLeggibile(e.dimensione)}</span>
                {/* L'impronta si mostra troncata ma si mostra: è ciò che rende il documento
                    riconoscibile, e nasconderla vorrebbe dire chiedere fiducia. */}
                <span className="font-mono" title={`SHA-256 · ${e.hashSha256}`}>
                  sha256 {e.hashSha256.slice(0, 12)}…
                </span>
                {e.validoAl ? <span>valido fino al {e.validoAl}</span> : null}
                {e.caricatoDa ? <span>caricato da {e.caricatoDa}</span> : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      {modificabile ? (
        <form action={azioneCarica} className="space-y-2 rounded-lg border border-border p-3">
          <input type="hidden" name="istanzaId" value={istanzaId} />
          <div>
            <label htmlFor={`file-${istanzaId}`} className="text-nota font-medium">
              Allega un documento
            </label>
            <Input
              id={`file-${istanzaId}`}
              type="file"
              name="file"
              accept={ACCETTATI}
              required
              className="mt-1 h-8 text-xs"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor={`dal-${istanzaId}`} className="text-nota text-muted-foreground">
                Valido dal
              </label>
              <Input id={`dal-${istanzaId}`} type="date" name="validoDal" className="mt-1 h-8 text-xs" />
            </div>
            <div>
              <label htmlFor={`al-${istanzaId}`} className="text-nota text-muted-foreground">
                Valido fino al
              </label>
              <Input id={`al-${istanzaId}`} type="date" name="validoAl" className="mt-1 h-8 text-xs" />
            </div>
          </div>
          <Button type="submit" size="sm" disabled={caricando} className="h-8 text-xs">
            {caricando ? "Caricamento…" : "Allega"}
          </Button>
          <p className="text-micro leading-relaxed text-muted-foreground">
            PDF, immagini e documenti Office fino a 25 MB. Il tipo si verifica dal contenuto, non
            dall&apos;estensione.
          </p>
        </form>
      ) : null}

      {errore ? (
        <p role="alert" className="text-nota leading-relaxed text-scaduta">
          {errore}
        </p>
      ) : null}
      {carica?.ok ? (
        <p role="status" className="flex items-center gap-1.5 text-nota text-regolare">
          <FileCheck2 className="size-3.5" aria-hidden />
          {carica.nomeFile} allegato.
        </p>
      ) : null}
    </section>
  );
}
