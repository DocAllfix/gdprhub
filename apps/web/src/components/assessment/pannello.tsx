"use client";

import { useEffect, useState, useTransition } from "react";
import { AlertCircle, Check, History } from "lucide-react";
import { ETICHETTE_DOMINIO, STATI_LAVORO, formattaIt, type StatoLavoro } from "@gdpr/engine";
import type { RigaAssessment } from "@/features/assessment/dati";
import { ETICHETTA_CAMPO } from "@/features/assessment/etichette";
import {
  cambiaStato,
  impostaUltimaEsecuzione,
  salvaNote,
  storico,
  type EsitoModifica,
} from "@/features/assessment/azioni";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Codice, Scadenza, StatoLavoroEtichetta } from "@/components/stato";
import { Evidenze } from "@/components/assessment/evidenze";
import { elencoEvidenze } from "@/features/evidenze/azioni";
import type { Evidenza } from "@/features/evidenze/tipi";

// Il pannello di dettaglio di un adempimento.
//
// Qui vive tutto ciò che non sta in una riga: il testo della norma, l'annotazione operativa,
// la motivazione della non applicabilità, le note e lo STORICO — che è la risposta alla
// domanda che un ispettore fa sempre, «da quando è così?».
//
// La scadenza non è modificabile e non deve esserlo: si scrive l'ultima esecuzione e la
// scadenza si deriva. Renderla scrivibile permetterebbe di dichiarare una data che i fatti
// non sostengono, ed è esattamente il difetto dei prototipi di partenza.

type Voce = { campo: string; da: string | null; a: string | null; quando: Date | string };

export function PannelloAdempimento({
  riga,
  aperto,
  onChiudi,
  modificabile,
}: {
  riga: RigaAssessment | null;
  aperto: boolean;
  onChiudi: () => void;
  modificabile: boolean;
}) {
  if (!riga) return null;
  // La `key` rimonta il corpo quando cambia adempimento, e i campi ripartono dai valori
  // giusti senza un effetto che li risincronizzi. Sincronizzare uno stato locale a una prop
  // dentro `useEffect` provoca un render in più e, se la prop cambia in fretta, un lampo
  // con i dati della riga precedente.
  return <Corpo key={riga.id} riga={riga} aperto={aperto} onChiudi={onChiudi} modificabile={modificabile} />;
}

function Corpo({
  riga,
  aperto,
  onChiudi,
  modificabile,
}: {
  riga: RigaAssessment;
  aperto: boolean;
  onChiudi: () => void;
  modificabile: boolean;
}) {
  const [inCorso, avvia] = useTransition();
  const [errore, setErrore] = useState<string | null>(null);
  const [salvato, setSalvato] = useState<string | null>(null);
  const [motivazione, setMotivazione] = useState(riga.motivazione ?? "");
  const [note, setNote] = useState(riga.note ?? "");
  const [data, setData] = useState(riga.ultimaEsecuzione ?? "");
  const [voci, setVoci] = useState<Voce[] | null>(null);
  const [evidenze, setEvidenze] = useState<readonly Evidenza[] | null>(null);
  // L'INTENZIONE, non lo stato salvato. Il campo della motivazione deve comparire appena si
  // preme «Non applicabile», non dopo che il salvataggio è riuscito: legandolo allo stato
  // già scritto si creava un vicolo cieco — il sistema chiedeva una motivazione e non dava
  // nessun posto dove scriverla. Trovato provando il flusso, non leggendo il codice.
  const [chiedeNonApplicabile, setChiedeNonApplicabile] = useState(riga.stato === "Non applicabile");

  const id = riga.id;

  // Lo storico si carica solo quando il pannello si apre: farlo per tutte le righe
  // significherebbe 171 query per mostrare qualcosa che si guarda una volta ogni tanto.
  useEffect(() => {
    if (!aperto) return;
    let vivo = true;
    void storico(id).then((s) => {
      if (vivo) setVoci(s as Voce[]);
    });
    // Le evidenze seguono la stessa regola dello storico: si leggono all'apertura, non per
    // tutte le righe.
    void elencoEvidenze(id).then((e) => {
      if (vivo) setEvidenze(e);
    });
    return () => {
      vivo = false;
    };
  }, [aperto, id]);

  const applica = (fn: () => Promise<EsitoModifica>, cosa: string) => {
    setErrore(null);
    setSalvato(null);
    avvia(async () => {
      const esito = await fn();
      if (esito.ok) {
        setSalvato(cosa);
        void storico(riga.id).then((s) => setVoci(s as Voce[]));
        void elencoEvidenze(riga.id).then(setEvidenze);
      } else setErrore(esito.errore);
    });
  };

  const serveMotivazione = riga.stato === "Non applicabile" || chiedeNonApplicabile;
  // Un presidio di un altro modulo si guarda, non si tocca: si modifica dov'è censito.
  const scrivibile = modificabile && riga.letturaDa === null;

  return (
    <Sheet open={aperto} onOpenChange={(v) => !v && onChiudi()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg" data-tour="dettaglio-adempimento">
        <SheetHeader>
          <SheetTitle className="flex items-start gap-2.5">
            <Codice codice={riga.codice} />
            <span className="min-w-0 flex-1">{riga.titolo}</span>
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6 px-4 pb-8">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
            <dt className="text-xs text-muted-foreground">Norma</dt>
            <dd className="font-mono text-xs">{riga.riferimento}</dd>
            <dt className="text-xs text-muted-foreground">Modulo</dt>
            <dd className="text-xs">{ETICHETTE_DOMINIO[riga.dominio].esteso}</dd>
            <dt className="text-xs text-muted-foreground">Categoria</dt>
            <dd className="text-xs">{riga.categoria}</dd>
            <dt className="text-xs text-muted-foreground">Responsabile</dt>
            <dd className="text-xs">{riga.ruolo}</dd>
            <dt className="text-xs text-muted-foreground">Periodicità</dt>
            <dd className="text-xs">{riga.periodicitaTesto}</dd>
            <dt className="text-xs text-muted-foreground">Priorità</dt>
            <dd className="text-xs">{riga.priorita}</dd>
          </dl>

          {riga.descrizione ? (
            <p className="text-sm leading-relaxed text-muted-foreground">{riga.descrizione}</p>
          ) : null}

          {riga.nota ? (
            <p className="rounded-md border-t border-border bg-surface-sunken px-3 py-2 text-xs leading-relaxed">
              <span className="font-medium">Annotazione operativa · </span>
              {riga.nota}
            </p>
          ) : null}

          {riga.lettoDa.length > 0 ? (
            <p className="text-xs text-muted-foreground">
              Questo presidio è letto anche da{" "}
              {riga.lettoDa.map((l, i) => (
                <span key={`${l.dominio}-${l.codice}`}>
                  {i > 0 ? ", " : ""}
                  {ETICHETTE_DOMINIO[l.dominio].breve} {l.codice}
                </span>
              ))}
              . Chiudendolo qui si aggiorna anche lì: non esistono due scadenze per lo stesso fatto.
            </p>
          ) : null}

          {riga.letturaDa ? (
            <div className="rounded-md border border-border bg-surface-sunken px-3 py-2.5 text-xs leading-relaxed">
              <p className="font-medium">Presidio condiviso, censito altrove</p>
              <p className="mt-1 text-muted-foreground">
                Questo adempimento è presidiato in{" "}
                <span className="font-medium">
                  {ETICHETTE_DOMINIO[riga.letturaDa.dominio].breve} {riga.letturaDa.codice} ·{" "}
                  {riga.letturaDa.titolo}
                </span>
                . Lo stato e la scadenza che vedi sono i suoi, e si modificano da lì: due verità sullo stesso
                fatto sarebbero peggio di nessuna.
              </p>
              <p className="mt-1 font-mono text-[10px] text-faint-foreground">{riga.letturaDa.riferimento}</p>
            </div>
          ) : null}

          {/* --- Stato del lavoro ---------------------------------------------------- */}
          <section className="space-y-2 border-t border-border pt-4">
            <h3 className="text-xs font-semibold tracking-[0.09em] uppercase">Stato del lavoro</h3>
            <div className="flex flex-wrap gap-1.5">
              {STATI_LAVORO.map((s) => (
                <Button
                  key={s}
                  size="sm"
                  variant={riga.stato === s ? "default" : "outline"}
                  disabled={!scrivibile || inCorso}
                  data-tour={`stato-${s.replace(/\s/g, "-").toLowerCase()}`}
                  onClick={() => {
                    setChiedeNonApplicabile(s === "Non applicabile");
                    applica(
                      () =>
                        cambiaStato(
                          riga.id,
                          s as StatoLavoro,
                          s === "Non applicabile" ? motivazione : undefined,
                        ),
                      `stato: ${s}`,
                    );
                  }}
                >
                  {s}
                </Button>
              ))}
            </div>

            {serveMotivazione || motivazione !== "" ? (
              <div className="space-y-1.5 pt-1">
                <label htmlFor="motivazione" className="text-xs font-medium">
                  Motivazione della non applicabilità
                </label>
                <textarea
                  id="motivazione"
                  value={motivazione}
                  onChange={(e) => setMotivazione(e.target.value)}
                  disabled={!scrivibile}
                  rows={2}
                  className="w-full rounded-md border border-input bg-surface px-2.5 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="Perché questo adempimento non si applica a questa azienda"
                />
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!scrivibile || inCorso}
                  onClick={() =>
                    applica(() => cambiaStato(riga.id, "Non applicabile", motivazione), "motivazione")
                  }
                >
                  Salva la motivazione
                </Button>
                <p className="text-xs text-muted-foreground">
                  Un adempimento escluso senza una ragione scritta è un buco nella relazione. Il vincolo
                  esiste anche sul database.
                </p>
              </div>
            ) : null}
          </section>

          {/* --- Scadenza ------------------------------------------------------------ */}
          <section className="space-y-2 border-t border-border pt-4">
            <h3 className="text-xs font-semibold tracking-[0.09em] uppercase">Scadenza</h3>
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1.5">
                <label htmlFor="ultima" className="text-xs font-medium">
                  Ultima esecuzione
                </label>
                <Input
                  id="ultima"
                  type="date"
                  value={data}
                  disabled={!scrivibile}
                  onChange={(e) => setData(e.target.value)}
                  className="h-8 w-40 text-sm"
                  data-tour="ultima-esecuzione"
                />
              </div>
              <Button
                size="sm"
                disabled={!scrivibile || inCorso || data === (riga.ultimaEsecuzione ?? "")}
                onClick={() =>
                  applica(() => impostaUltimaEsecuzione(riga.id, data || null), "ultima esecuzione")
                }
              >
                Aggiorna
              </Button>
              {riga.ultimaEsecuzione ? (
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={!scrivibile || inCorso}
                  onClick={() => {
                    setData("");
                    applica(() => impostaUltimaEsecuzione(riga.id, null), "ultima esecuzione azzerata");
                  }}
                >
                  Azzera
                </Button>
              ) : null}
            </div>

            <div className="flex items-center gap-3 pt-1 text-sm">
              <span className="text-xs text-muted-foreground">Scadenza derivata:</span>
              <Scadenza
                data={riga.scadenza}
                giorni={riga.giorniAllaScadenza}
                statoScadenza={riga.statoScadenza}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              La scadenza non si scrive: si calcola da ultima esecuzione più periodicità (
              {riga.periodicitaTesto.toLowerCase()}). Renderla modificabile permetterebbe di dichiarare una
              data che i fatti non sostengono.
            </p>
          </section>

          {/* --- Note ---------------------------------------------------------------- */}
          <section className="space-y-2 border-t border-border pt-4">
            <h3 className="text-xs font-semibold tracking-[0.09em] uppercase">Note</h3>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={!scrivibile}
              rows={3}
              className="w-full rounded-md border border-input bg-surface px-2.5 py-1.5 text-sm outline-none"
              placeholder="Annotazioni interne su questo adempimento"
            />
            <Button
              size="sm"
              variant="outline"
              disabled={!scrivibile || inCorso || note === (riga.note ?? "")}
              onClick={() => applica(() => salvaNote(riga.id, note), "note")}
            >
              Salva le note
            </Button>
          </section>

          {errore ? (
            <p role="alert" className="flex items-start gap-1.5 text-xs text-scaduta">
              <AlertCircle className="mt-px size-3.5 shrink-0" aria-hidden />
              {errore}
            </p>
          ) : null}
          {salvato ? (
            <p role="status" className="flex items-center gap-1.5 text-xs text-regolare">
              <Check className="size-3.5" aria-hidden />
              Salvato · {salvato}
            </p>
          ) : null}

          <Evidenze istanzaId={riga.id} elenco={evidenze ?? []} modificabile={scrivibile} />

          {/* --- Storico ------------------------------------------------------------- */}
          <section className="space-y-2 border-t border-border pt-4">
            <h3 className="flex items-center gap-1.5 text-xs font-semibold tracking-[0.09em] uppercase">
              <History className="size-3.5" aria-hidden />
              Storico
            </h3>
            {voci === null ? (
              <p className="text-xs text-muted-foreground">Caricamento…</p>
            ) : voci.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Nessuna modifica registrata: l&apos;adempimento è come è stato creato.
              </p>
            ) : (
              <ol className="space-y-1.5">
                {voci.map((v, i) => (
                  <li key={i} className="flex gap-2.5 text-xs">
                    <span className="w-24 shrink-0 font-mono text-faint-foreground">
                      {formattaIt(new Date(v.quando).toISOString().slice(0, 10))}
                    </span>
                    <span>
                      <span className="text-muted-foreground">{ETICHETTA_CAMPO[v.campo] ?? v.campo}: </span>
                      <span className="text-faint-foreground">{v.da ?? "—"}</span>
                      <span className="text-muted-foreground"> → </span>
                      <span className="font-medium">{v.a ?? "—"}</span>
                    </span>
                  </li>
                ))}
              </ol>
            )}
            <p className="text-xs text-faint-foreground">
              Lo storico è irreversibile per vincolo sul database: nemmeno da qui si può correggere il
              passato.
            </p>
          </section>

          <div className="flex items-center justify-between border-t border-border pt-4">
            <StatoLavoroEtichetta stato={riga.stato} />
            <Button variant="ghost" size="sm" onClick={onChiudi}>
              Chiudi
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
