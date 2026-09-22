"use client";

import { useActionState } from "react";
import { Download, FileText, Lock, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { ETICHETTE_DOMINIO, formattaIt, type Dominio } from "@gdpr/engine";
import {
  eliminaBozza,
  generaRelazione,
  pubblicaRelazione,
  type EsitoRelazione,
} from "@/features/relazioni/azioni";
import type { RigaRelazione } from "@/features/relazioni/dati";
import { Button } from "@/components/ui/button";

// L'ELENCO DELLE RELAZIONI.
//
// Due gesti separati, e la separazione è tutto il meccanismo. Una BOZZA si rifà quante volte
// si vuole: è lì che ci si accorge che un'esclusione non ha motivazione o che un adempimento
// era stato dimenticato. Una PUBBLICATA è un atto, e da quel momento non si tocca più —
// nemmeno da psql, perché il divieto è un trigger sul database.
//
// L'IMPRONTA SI MOSTRA. È ciò che permette di dire «questa è la relazione che ti ho
// consegnato il 3 agosto», e nasconderla vorrebbe dire chiedere fiducia invece di darne
// prova.

const AMBITI: readonly { valore: string; etichetta: string }[] = [
  { valore: "suite", etichetta: "Integrata · tre decreti" },
  ...(["gdpr", "d231", "d81"] as Dominio[]).map((d) => ({
    valore: d,
    etichetta: `Solo ${ETICHETTE_DOMINIO[d].breve}`,
  })),
];

/** Gli organi che possono presentarsi, e cosa guardano. Il testo vive nel documento. */
const ORGANI_ELENCO = [
  { chiave: "garante", breve: "Garante privacy" },
  { chiave: "ispettorato", breve: "Ispettorato del Lavoro" },
  { chiave: "asl", breve: "ASL" },
  { chiave: "giudiziaria", breve: "Autorità giudiziaria / OdV" },
] as const;

const nomeAmbito = (a: string) =>
  a === "suite" ? "Integrata" : (ETICHETTE_DOMINIO[a as Dominio]?.breve ?? a);

export function ElencoRelazioni({
  aziendaId,
  elenco,
  modificabile,
}: {
  aziendaId: string;
  elenco: readonly RigaRelazione[];
  modificabile: boolean;
}) {
  const [gen, azioneGenera, generando] = useActionState<EsitoRelazione | null, FormData>(
    generaRelazione,
    null,
  );
  const [pub, azionePubblica, pubblicando] = useActionState<EsitoRelazione | null, FormData>(
    pubblicaRelazione,
    null,
  );
  const [del, azioneElimina, eliminando] = useActionState<EsitoRelazione | null, FormData>(
    eliminaBozza,
    null,
  );

  const errore =
    (gen && !gen.ok && gen.errore) || (pub && !pub.ok && pub.errore) || (del && !del.ok && del.errore);

  return (
    <div className="space-y-4" data-tour="relazioni">
      {modificabile ? (
        <form action={azioneGenera} className="pannello flex flex-wrap items-end gap-3 p-5">
          <input type="hidden" name="aziendaId" value={aziendaId} />
          <div>
            <label htmlFor="ambito" className="text-xs font-medium">
              Genera una relazione
            </label>
            <select
              id="ambito"
              name="ambito"
              defaultValue="suite"
              className="mt-1 h-9 rounded-md border border-border bg-surface px-2.5 text-sm"
            >
              {AMBITI.map((a) => (
                <option key={a.valore} value={a.valore}>
                  {a.etichetta}
                </option>
              ))}
            </select>
          </div>
          <Button type="submit" disabled={generando} data-tour="genera-relazione">
            <Plus className="size-4" aria-hidden />
            {generando ? "Generazione…" : "Genera bozza"}
          </Button>
          <p className="max-w-md text-nota leading-relaxed text-muted-foreground">
            La bozza congela i numeri di oggi e si rifà quante volte serve. Pubblicandola diventa un atto: da
            quel momento il contenuto non si tocca più, nemmeno dal database.
          </p>
        </form>
      ) : null}

      {/* IL FASCICOLO NON E' UNA RELAZIONE, e sta in un riquadro suo per dirlo.
          La relazione e' un atto: si numera, si pubblica, e da quel momento dice quello che
          diceva. Il fascicolo e' una fotografia che si stampa quando l'ispettore e' gia'
          seduto, e deve dire com'e' ADESSO: uno di tre mesi fa mostrerebbe uno stato che non
          corrisponde a quello che sta guardando. Per questo non ha protocollo e non si
          archivia. */}
      <section className="pannello p-5" data-tour="fascicolo">
        <h2 className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          <ShieldCheck className="size-4 text-muted-foreground" aria-hidden />
          Fascicolo ispettivo
        </h2>
        <p className="mt-1 max-w-2xl text-nota leading-relaxed text-muted-foreground">
          Si genera sul momento e riporta lo stato di oggi. Elenca gli adempimenti ordinati per articolo di
          norma — non per categoria interna — con la casella di riscontro stampata vuota e lo spazio per le
          annotazioni: chi verifica non vuole essere convinto, vuole controllare.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {ORGANI_ELENCO.map((o) => (
            <a
              key={o.chiave}
              href={`/api/fascicolo/${aziendaId}/${o.chiave}`}
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs hover:bg-accent"
            >
              <Download className="size-3.5" aria-hidden />
              {o.breve}
            </a>
          ))}
        </div>
      </section>

      {errore ? (
        <p role="alert" className="text-sm leading-relaxed text-scaduta">
          {errore}
        </p>
      ) : null}

      {elenco.length === 0 ? (
        <div className="pannello px-6 py-12 text-center">
          <FileText className="mx-auto size-6 text-faint-foreground" aria-hidden />
          <h2 className="mt-3 text-sm font-semibold">Nessuna relazione</h2>
          <p className="mx-auto mt-1.5 max-w-md text-sm text-muted-foreground">
            La relazione è ciò che il cliente porta a un&apos;ispezione. Generane una: fotografa i numeri di
            oggi e resta valida anche quando i dati cambiano.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {elenco.map((r) => (
            <li key={r.id} className="pannello p-4">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="cifra text-lg">n. {r.numero}</span>
                <span className="text-sm font-medium">{nomeAmbito(r.ambito)}</span>
                {r.stato === "pubblicata" ? (
                  <span className="inline-flex items-center gap-1 rounded-md bg-selected px-2 py-0.5 text-nota font-medium">
                    <Lock className="size-3" aria-hidden />
                    Pubblicata
                  </span>
                ) : (
                  <span className="rounded-md border border-border px-2 py-0.5 text-nota text-muted-foreground">
                    Bozza
                  </span>
                )}
                <span className="font-mono text-xs text-muted-foreground">
                  {formattaIt(r.dataRiferimento)}
                </span>

                <span className="ml-auto flex items-center gap-1.5">
                  <a
                    href={`/api/relazioni/${r.id}`}
                    className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs hover:bg-accent"
                  >
                    <Download className="size-3.5" aria-hidden />
                    PDF
                  </a>
                  {modificabile && r.stato === "bozza" ? (
                    <>
                      <form action={azionePubblica}>
                        <input type="hidden" name="relazioneId" value={r.id} />
                        <Button type="submit" size="sm" disabled={pubblicando} className="h-8 text-xs">
                          <Lock className="size-3.5" aria-hidden />
                          Pubblica
                        </Button>
                      </form>
                      <form action={azioneElimina}>
                        <input type="hidden" name="relazioneId" value={r.id} />
                        <button
                          type="submit"
                          disabled={eliminando}
                          aria-label={`Elimina la bozza n. ${r.numero}`}
                          className="rounded-md p-1.5 text-muted-foreground hover:text-scaduta disabled:opacity-50"
                        >
                          <Trash2 className="size-3.5" aria-hidden />
                        </button>
                      </form>
                    </>
                  ) : null}
                </span>
              </div>

              <dl className="mt-2.5 flex flex-wrap gap-x-6 gap-y-1 text-nota text-muted-foreground">
                <span>
                  <dt className="inline">conformità </dt>
                  <dd className="inline font-mono font-medium text-foreground tabular-nums">
                    {r.conformita === null ? "—" : `${r.conformita}%`}
                  </dd>
                </span>
                <span>
                  <dt className="inline">esposizione </dt>
                  <dd className="inline font-mono font-medium text-foreground tabular-nums">
                    {r.esposizione ?? "—"}/100
                  </dd>
                </span>
                <span>
                  <dt className="inline">adempimenti </dt>
                  <dd className="inline font-mono tabular-nums">{r.totale}</dd>
                </span>
                {/* L'impronta si mostra: è ciò che permette di dire «questa è quella che ti
                    ho consegnato». Nasconderla vorrebbe dire chiedere fiducia. */}
                <span title={`SHA-256 · ${r.hashSnapshot}`}>
                  <dt className="inline">impronta </dt>
                  <dd className="inline font-mono">{r.hashSnapshot.slice(0, 12)}…</dd>
                </span>
                {r.generataDa ? <span>generata da {r.generataDa}</span> : null}
                {r.pubblicataIl ? (
                  <span>pubblicata il {formattaIt(r.pubblicataIl.toISOString().slice(0, 10))}</span>
                ) : null}
              </dl>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
