"use client";

import { useActionState, useState } from "react";
import { AlertTriangle, Check, ChevronDown, Clock, Link2, Plus } from "lucide-react";
import Link from "next/link";
import { formattaIt, registroPerTipo, type DefinizioneRegistro, type LegameRegistri } from "@legisboard/engine";
import { apriVoce, assolviVoce, cambiaStatoVoce, type EsitoRegistro } from "@/features/registri/azioni";
import type { VoceRegistro } from "@/features/registri/dati";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// UN REGISTRO, undici volte.
//
// La schermata si costruisce dalla DEFINIZIONE del motore: campi, etichette, opzioni e note
// arrivano da lì. Undici schermate scritte a mano sarebbero undici posti in cui il testo di
// una norma resta indietro rispetto al motore, e la norma è l'unica cosa che qui non può
// essere approssimativa.
//
// IL TERMINE È LA PRIMA COSA CHE SI VEDE, prima del titolo. In un registro di violazioni la
// domanda non è «quali ci sono» ma «quali stanno per scadere»: mettere il tempo residuo in
// fondo alla riga costringerebbe a leggerle tutte per trovare quella che brucia.

const CLASSE_TERMINE: Record<string, string> = {
  scaduto: "text-scaduta",
  "in-scadenza": "text-imminente",
  "in-termine": "text-regolare",
  assolto: "text-regolare",
  "assolto-tardi": "text-imminente",
  "senza-termine": "text-muted-foreground",
};

const STATI = [
  { valore: "aperto", etichetta: "Aperta" },
  { valore: "in-istruttoria", etichetta: "In istruttoria" },
  { valore: "chiuso", etichetta: "Chiusa" },
  { valore: "archiviato", etichetta: "Archiviata" },
] as const;

export function ElencoRegistro({
  aziendaId,
  def,
  voci,
  legami,
  modificabile,
}: {
  aziendaId: string;
  def: DefinizioneRegistro;
  voci: readonly VoceRegistro[];
  legami: readonly LegameRegistri[];
  modificabile: boolean;
}) {
  const [apriModulo, setApriModulo] = useState(false);
  const [aperta, setAperta] = useState<string | null>(null);

  const [nuova, azioneApri, aprendo] = useActionState<EsitoRegistro | null, FormData>(apriVoce, null);
  const [chiusura, azioneAssolvi, chiudendo] = useActionState<EsitoRegistro | null, FormData>(
    assolviVoce,
    null,
  );
  const [statoEsito, azioneStato] = useActionState<EsitoRegistro | null, FormData>(cambiaStatoVoce, null);

  const errore =
    (nuova && !nuova.ok && nuova.errore) ||
    (chiusura && !chiusura.ok && chiusura.errore) ||
    (statoEsito && !statoEsito.ok && statoEsito.errore);

  const daPresidiare = voci.filter(
    (v) => v.termine.stato === "scaduto" || v.termine.stato === "in-scadenza",
  ).length;

  return (
    <div className="space-y-4" data-tour="registro">
      <section className="pannello p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <p className="font-mono text-nota text-muted-foreground">{def.norma}</p>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{def.scopo}</p>
            <p className="mt-2 text-nota text-muted-foreground">
              <b className="text-muted-foreground">Termine:</b> {def.termine.obbligo}
              {def.termine.tipo === "ore" ? ` · entro ${def.termine.ore} ore dalla conoscenza` : null}
              {def.termine.tipo === "giorni"
                ? ` · entro ${def.termine.giorni} giorni${def.termine.prorogabileA ? `, prorogabili a ${def.termine.prorogabileA}` : ""}`
                : null}
            </p>
          </div>
          <div className="text-right">
            <p className="cifra text-cifra leading-none">{voci.length}</p>
            <p className="text-xs text-muted-foreground">
              {voci.length === 1 ? "voce" : "voci"}
              {daPresidiare > 0 ? (
                <>
                  {" · "}
                  <b className="text-scaduta">{daPresidiare} da presidiare</b>
                </>
              ) : null}
            </p>
          </div>
        </div>

        {modificabile ? (
          <div className="mt-4 border-t border-border-subtle pt-4">
            <Button
              type="button"
              onClick={() => setApriModulo((v) => !v)}
              data-tour="apri-voce"
              variant={apriModulo ? "outline" : "default"}
            >
              <Plus className="size-4" aria-hidden />
              {apriModulo ? "Annulla" : `Apri ${def.nomeSingolare.toLowerCase()}`}
            </Button>
          </div>
        ) : null}

        {apriModulo && modificabile ? (
          <form action={azioneApri} className="mt-4 space-y-4 border-t border-border-subtle pt-4">
            <input type="hidden" name="aziendaId" value={aziendaId} />
            <input type="hidden" name="tipo" value={def.tipo} />

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs font-medium">Oggetto</span>
                <Input
                  name="titolo"
                  required
                  className="mt-1"
                  placeholder="In due parole, di cosa si tratta"
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium">{def.etichettaData}</span>
                {/* NON SI PREIMPOSTA «ADESSO», e il compilatore di React che ha rifiutato
                    `Date.now()` durante il rendering ha portato alla scelta giusta.
                    Il momento della conoscenza è quasi mai adesso: è quando qualcuno se n'è
                    accorto, che può essere ieri sera o venerdì scorso. Un campo precompilato
                    con l'ora corrente invita ad accettarlo, e su un termine di 72 ore quella
                    disattenzione sposta la scadenza di giorni. Meglio obbligare a dirlo. */}
                <Input name="conosciutoIl" type="datetime-local" required className="mt-1" />
                {def.termine.tipo === "ore" ? (
                  <span className="mt-1 block text-micro leading-relaxed text-muted-foreground">
                    Il termine decorre da QUI, non dal momento in cui il fatto è avvenuto: l&apos;art. 33 dice
                    «da quando ne viene a conoscenza».
                  </span>
                ) : null}
              </label>
            </div>

            {def.termine.tipo === "ore" ? (
              <label className="block sm:w-1/2">
                <span className="text-xs font-medium">Avvenuto il (se noto)</span>
                <Input name="avvenutoIl" type="datetime-local" className="mt-1" />
                <span className="mt-1 block text-micro text-muted-foreground">
                  Serve alla ricostruzione dei fatti, non al calcolo del termine.
                </span>
              </label>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
              {def.campi.map((c) => (
                <label key={c.chiave} className={cn("block", c.tipo === "testo-lungo" && "sm:col-span-2")}>
                  <span className="text-xs font-medium">
                    {c.etichetta}
                    {c.obbligatorio ? <span className="text-scaduta"> *</span> : null}
                  </span>
                  {c.tipo === "scelta" ? (
                    <select
                      name={`d_${c.chiave}`}
                      required={c.obbligatorio}
                      defaultValue=""
                      className="mt-1 h-9 w-full rounded-md border border-border bg-surface px-2.5 text-sm"
                    >
                      <option value="">—</option>
                      {c.opzioni?.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  ) : c.tipo === "testo-lungo" ? (
                    <textarea
                      name={`d_${c.chiave}`}
                      rows={3}
                      className="mt-1 w-full rounded-md border border-border bg-surface px-2.5 py-2 text-sm"
                    />
                  ) : c.tipo === "booleano" ? (
                    <span className="mt-1 flex h-9 items-center">
                      <input type="checkbox" name={`d_${c.chiave}`} className="size-4 accent-primary" />
                    </span>
                  ) : (
                    <Input
                      name={`d_${c.chiave}`}
                      type={c.tipo === "numero" ? "number" : c.tipo === "data" ? "date" : "text"}
                      required={c.obbligatorio}
                      className="mt-1"
                    />
                  )}
                  {c.nota ? (
                    <span className="mt-1 block text-micro leading-relaxed text-muted-foreground">
                      {c.nota}
                    </span>
                  ) : null}
                </label>
              ))}
            </div>

            <label className="block">
              <span className="text-xs font-medium">Descrizione</span>
              <textarea
                name="descrizione"
                rows={3}
                className="mt-1 w-full rounded-md border border-border bg-surface px-2.5 py-2 text-sm"
              />
            </label>

            <Button type="submit" disabled={aprendo}>
              {aprendo ? "Apertura…" : `Apri ${def.nomeSingolare.toLowerCase()}`}
            </Button>
          </form>
        ) : null}
      </section>

      {/* IL FATTO È UNO, I DECRETI SONO DUE, e l'avviso viene DOPO il pannello.
          Prima si legge che registro è, con la sua norma e il suo termine; poi cosa altro
          quello stesso fatto fa scattare. Messo in cima parlava dell'Organismo di
          Vigilanza a chi non aveva ancora letto di stare in un registro di violazioni.

          Il prototipo del committente annotava «Coordinamento DPO-OdV 72h» a margine di una
          riga: una nota su un foglio, che non avvisa nessuno. Non apre niente da sé — un
          atto che nessuno ha scritto, con una data che nessuno ha deciso, sarebbe magia. */}
      {legami.map((l) => {
        const dove = registroPerTipo(l.a);
        return (
          <div key={l.a} className="pannello flex flex-wrap items-start gap-3 p-4">
            <Link2 className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-sm leading-relaxed">{l.avviso}</p>
              <p className="mt-1 font-mono text-micro text-muted-foreground">{l.norma}</p>
            </div>
            <Link
              href={`/azienda/${aziendaId}/registro/${l.a}`}
              className="shrink-0 rounded-md border border-border px-3 py-1.5 text-xs hover:bg-accent"
            >
              {dove?.nome ?? l.a}
            </Link>
          </div>
        );
      })}

      {errore ? (
        <p role="alert" className="text-sm leading-relaxed text-scaduta">
          {errore}
        </p>
      ) : null}

      {voci.length === 0 ? (
        <div className="pannello px-6 py-12 text-center">
          <Clock className="mx-auto size-6 text-faint-foreground" aria-hidden />
          <h2 className="mt-3 text-sm font-semibold">Registro vuoto</h2>
          <p className="mx-auto mt-1.5 max-w-md text-sm text-muted-foreground">
            Un registro vuoto non è un registro in ordine: è un registro che nessuno ha ancora compilato.{" "}
            {def.scopo}
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {voci.map((v) => (
            <li key={v.id} className="pannello p-4">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                {/* IL TERMINE PRIMA DEL TITOLO: la domanda è «quale brucia», non «quali ci sono». */}
                <span
                  className={cn(
                    "font-mono text-xs font-medium",
                    CLASSE_TERMINE[v.termine.stato] ?? "text-muted-foreground",
                  )}
                >
                  {v.termine.stato === "scaduto" ? (
                    <AlertTriangle className="mr-1 inline size-3.5" aria-hidden />
                  ) : v.termine.stato === "assolto" || v.termine.stato === "assolto-tardi" ? (
                    <Check className="mr-1 inline size-3.5" aria-hidden />
                  ) : null}
                  {v.termine.descrizione}
                </span>
                <span className="font-mono text-nota text-muted-foreground">n. {v.numero}</span>
                <span className="text-sm font-medium">{v.titolo}</span>
                <span className="ml-auto flex items-center gap-2">
                  <span className="font-mono text-nota text-muted-foreground">
                    {formattaIt(v.conosciutoIl.toISOString().slice(0, 10))}
                  </span>
                  <button
                    type="button"
                    onClick={() => setAperta(aperta === v.id ? null : v.id)}
                    aria-expanded={aperta === v.id}
                    aria-label={`Dettagli della voce n. ${v.numero}`}
                    className="rounded-md p-1 text-muted-foreground hover:bg-accent"
                  >
                    <ChevronDown
                      className={cn("size-4 transition-transform", aperta === v.id && "rotate-180")}
                      aria-hidden
                    />
                  </button>
                </span>
              </div>

              {aperta === v.id ? (
                <div className="mt-3 space-y-3 border-t border-border-subtle pt-3">
                  {v.descrizione ? <p className="text-sm leading-relaxed">{v.descrizione}</p> : null}

                  <dl className="grid gap-x-6 gap-y-1.5 text-nota sm:grid-cols-2">
                    {def.campi.map((c) => {
                      const valore = v.dettagli[c.chiave];
                      if (valore === undefined || valore === "" || valore === null) return null;
                      return (
                        <div key={c.chiave} className="flex justify-between gap-3">
                          <dt className="text-muted-foreground">{c.etichetta}</dt>
                          <dd className="text-right font-medium">
                            {typeof valore === "boolean" ? (valore ? "sì" : "no") : String(valore)}
                          </dd>
                        </div>
                      );
                    })}
                  </dl>

                  {v.assoltoIl ? (
                    <p className="rounded-lg bg-surface-sunken p-3 text-nota leading-relaxed">
                      <b>{def.termine.obbligo}</b> · {formattaIt(v.assoltoIl.toISOString().slice(0, 10))}
                      <span className="mt-1 block text-muted-foreground">{v.esito}</span>
                    </p>
                  ) : modificabile ? (
                    <form action={azioneAssolvi} className="space-y-2">
                      <input type="hidden" name="voceId" value={v.id} />
                      <label className="block">
                        <span className="text-xs font-medium">{def.termine.obbligo}</span>
                        <textarea
                          name="esito"
                          rows={2}
                          required
                          placeholder="Come è stato assolto: a chi, quando, con quale atto"
                          className="mt-1 w-full rounded-md border border-border bg-surface px-2.5 py-2 text-sm"
                        />
                        <span className="mt-1 block text-micro text-muted-foreground">
                          Una spunta senza descrizione non è dimostrabile: in sede di verifica vale quanto una
                          casella vuota.
                        </span>
                      </label>
                      <Button type="submit" size="sm" disabled={chiudendo} className="h-8 text-xs">
                        <Check className="size-3.5" aria-hidden />
                        Registra l&apos;assolvimento
                      </Button>
                    </form>
                  ) : null}

                  {modificabile ? (
                    <form action={azioneStato} className="flex items-center gap-2">
                      <input type="hidden" name="voceId" value={v.id} />
                      <span className="text-nota text-muted-foreground">Stato</span>
                      <select
                        name="stato"
                        defaultValue={v.stato}
                        className="h-7 rounded-md border border-border bg-surface px-2 text-xs"
                      >
                        {STATI.map((s) => (
                          <option key={s.valore} value={s.valore}>
                            {s.etichetta}
                          </option>
                        ))}
                      </select>
                      <Button type="submit" size="sm" variant="outline" className="h-7 text-xs">
                        Applica
                      </Button>
                      {v.apertoDa ? (
                        <span className="ml-auto text-micro text-muted-foreground">
                          aperta da {v.apertoDa}
                        </span>
                      ) : null}
                    </form>
                  ) : null}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
