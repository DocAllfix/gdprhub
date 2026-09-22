"use client";

import { useMemo, useOptimistic, useState, useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useFiltriUrl } from "@/lib/filtri-url";
import { Link2, SearchX, X } from "lucide-react";
import { ETICHETTE_DOMINIO, STATI_LAVORO, STATI_SCADENZA, type StatoLavoro } from "@gdpr/engine";
import type { RigaAssessment } from "@/features/assessment/dati";
import { cambiaStato } from "@/features/assessment/azioni";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { VuotoFiltro } from "@/components/ui/vuoto";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Codice, Priorita, Scadenza } from "@/components/stato";
import { PannelloAdempimento } from "@/components/assessment/pannello";
import { cn } from "@/lib/utils";

// L'assessment: la schermata dove il consulente passa le sue sei ore.
//
// I FILTRI STANNO NELL'URL. Un consulente che guarda «le critiche scadute del datore di
// lavoro» deve poter mandare quel link a un collega, o ritrovarlo domani dai preferiti. Uno
// stato di filtro chiuso dentro il componente muore a ogni ricaricamento.
//
// Lo stato del lavoro si cambia DALLA RIGA, con un menù a tendina nativo: su 171 righe è la
// cosa più veloce da usare con la tastiera e la più leggera da disegnare. «Non applicabile»
// fa eccezione e apre il pannello, perché richiede una motivazione scritta.

const INIZIALI = { q: "", lavoro: "", scadenza: "", categoria: "", ruolo: "" };

/**
 * I filtri attivi, in parole. Serve allo stato vuoto: «nessun adempimento corrisponde»
 * lascia chi guarda a chiedersi cosa stia escludendo, e chi ha filtrato dieci minuti fa se
 * n'è già dimenticato.
 */
function filtriAttivi(f: typeof INIZIALI): string[] {
  const fuori: string[] = [];
  if (f.q) fuori.push(`il testo «${f.q}»`);
  if (f.lavoro) fuori.push(`lavoro: ${f.lavoro}`);
  if (f.scadenza) fuori.push(`scadenza: ${f.scadenza}`);
  if (f.categoria) fuori.push(`categoria: ${f.categoria}`);
  if (f.ruolo) fuori.push(`responsabile: ${f.ruolo}`);
  return fuori;
}

export function TabellaAssessment({
  righe,
  modificabile,
}: {
  righe: readonly RigaAssessment[];
  modificabile: boolean;
}) {
  const router = useRouter();
  const [, avvia] = useTransition();

  // AGGIORNAMENTO OTTIMISTICO, riga per riga.
  //
  // Prima c'era un solo `useTransition` per tutta la tabella, e ogni `<select>` portava
  // `disabled={… || inCorso}`: cambiare lo stato di UNA riga congelava tutte le sessantaquattro
  // fino al ritorno del server e al ricaricamento. In una sessione da otto ore sono decine di
  // attese, ognuna un giro fino a Francoforte con la tabella morta nel frattempo.
  //
  // Ora la riga mostra subito il valore scelto, e si blocca SOLO lei finché la scrittura non
  // torna. Se il server rifiuta, `useOptimistic` rimette il valore di prima da solo alla fine
  // della transizione: non c'è uno stato da ripristinare a mano, e quindi niente da dimenticare.
  const [provvisori, applica] = useOptimistic<
    Readonly<Record<string, StatoLavoro>>,
    { readonly id: string; readonly stato: StatoLavoro }
  >({}, (precedenti, modifica) => ({ ...precedenti, [modifica.id]: modifica.stato }));
  const [apertaId, setApertaId] = useState<string | null>(null);
  const { filtri, imposta, azzera } = useFiltriUrl(INIZIALI);

  const categorie = useMemo(() => [...new Set(righe.map((r) => r.categoria))], [righe]);
  const ruoli = useMemo(() => [...new Set(righe.map((r) => r.ruolo))].sort(), [righe]);

  const visibili = useMemo(() => {
    const q = filtri.q.toLowerCase();
    return righe.filter(
      (r) =>
        (q === "" ||
          r.codice.toLowerCase().includes(q) ||
          r.titolo.toLowerCase().includes(q) ||
          r.riferimento.toLowerCase().includes(q)) &&
        (filtri.lavoro === "" || r.stato === filtri.lavoro) &&
        (filtri.scadenza === "" || r.statoScadenza === filtri.scadenza) &&
        (filtri.categoria === "" || r.categoria === filtri.categoria) &&
        (filtri.ruolo === "" || r.ruolo === filtri.ruolo),
    );
  }, [righe, filtri.q, filtri.lavoro, filtri.scadenza, filtri.categoria, filtri.ruolo]);

  // Le intestazioni di categoria si inseriscono nel flusso solo quando la categoria cambia,
  // e solo se non si sta già filtrando per una sola categoria: lì sarebbero rumore.
  const conIntestazioni = useMemo(() => {
    const fuori: (RigaAssessment | { intestazione: string })[] = [];
    let corrente = "";
    for (const r of visibili) {
      if (filtri.categoria === "" && r.categoria !== corrente) {
        fuori.push({ intestazione: r.categoria });
        corrente = r.categoria;
      }
      fuori.push(r);
    }
    return fuori;
  }, [visibili, filtri.categoria]);

  const aperta = righe.find((r) => r.id === apertaId) ?? null;
  const attivi = Object.entries(filtri).filter(([, v]) => v !== "").length;

  const cambia = (riga: RigaAssessment, nuovo: string) => {
    if (nuovo === "Non applicabile") {
      // Serve una motivazione: si apre il pannello invece di scrivere un dato monco.
      setApertaId(riga.id);
      return;
    }
    const stato = nuovo as StatoLavoro;
    avvia(async () => {
      applica({ id: riga.id, stato });
      const esito = await cambiaStato(riga.id, stato);
      // ⚠️ L'ESITO SI LEGGE. Prima veniva ignorato: se il server rifiutava la modifica — sola
      // lettura, modalità dimostrativa, validazione — la riga tornava al valore vecchio senza
      // una parola, e l'utente non sapeva se aveva sbagliato lui o se il prodotto era rotto.
      // Il cancello visivo non poteva vederlo: non è un errore HTTP, è una risposta regolare
      // con un rifiuto dentro.
      if (!esito.ok) {
        toast.error(`${riga.codice} non è stato aggiornato`, { description: esito.errore });
        return;
      }
      toast.success(`${riga.codice} · ${stato}`);
      router.refresh();
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2" data-tour="filtri-assessment">
        <Input
          value={filtri.q}
          onChange={(e) => imposta("q", e.target.value)}
          placeholder="Cerca per codice, adempimento o norma"
          className="h-8 max-w-xs text-sm"
          aria-label="Cerca fra gli adempimenti"
        />
        <Menu
          etichetta="Lavoro"
          valore={filtri.lavoro}
          opzioni={STATI_LAVORO}
          onCambia={(v) => imposta("lavoro", v)}
        />
        <Menu
          etichetta="Scadenza"
          valore={filtri.scadenza}
          opzioni={STATI_SCADENZA}
          onCambia={(v) => imposta("scadenza", v)}
        />
        <Menu
          etichetta="Categoria"
          valore={filtri.categoria}
          opzioni={categorie}
          onCambia={(v) => imposta("categoria", v)}
        />
        <Menu
          etichetta="Responsabile"
          valore={filtri.ruolo}
          opzioni={ruoli}
          onCambia={(v) => imposta("ruolo", v)}
        />

        {attivi > 0 ? (
          <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={() => azzera()}>
            <X className="size-3.5" aria-hidden />
            Azzera i filtri
          </Button>
        ) : null}

        <span className="ml-auto text-xs tabular-nums text-muted-foreground">
          {visibili.length} di {righe.length}
        </span>
      </div>

      {/* L'INTESTAZIONE SI FISSA ALLA FINESTRA, e perché qui non ci sia più un contenitore
          con overflow da 'lg' in su è la parte che si dimentica: 'position: sticky' si àncora
          al più vicino antenato che scorre, e un 'overflow-x-auto' ne crea uno anche quando
          non si vede scorrere. È il difetto già incontrato in F5d e scritto in DESIGN.md.

          Sotto 'lg' l'overflow resta, perché lì la tabella non ci sta in larghezza e lo
          scorrimento orizzontale serve davvero: a quelle larghezze l'intestazione fissata
          vale poco, perché di righe se ne vedono comunque poche.

          MISURATO, non supposto: con la scatola di scorrimento si vedevano 14 righe
          sull'assessment e 10 sullo scadenzario; così se ne vedono 24. DESIGN.md ne chiede 22. */}
      <div
        className="pannello entra overflow-x-auto lg:overflow-x-visible"
        data-tour="tabella-assessment"
      >
        <Table>
          <TableHeader className="bg-surface-sunken lg:sticky lg:top-0 lg:z-10 lg:[&_th]:bg-surface-sunken">
            <TableRow className="border-b border-border-strong hover:bg-transparent">
              <TableHead className="h-8 px-3">Cod.</TableHead>
              <TableHead className="h-8 px-3">Adempimento</TableHead>
              <TableHead className="h-8 px-3">Responsabile</TableHead>
              <TableHead className="h-8 px-3">Periodicità</TableHead>
              <TableHead className="h-8 px-3">Priorità</TableHead>
              <TableHead className="h-8 px-3">Lavoro</TableHead>
              <TableHead className="h-8 px-3">Scadenza</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {conIntestazioni.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={7} className="p-0">
                  {/* Il vuoto da filtro è il più frequente in una sessione di lavoro, ed era
                      l'unico senza un'azione: il pulsante «Azzera» esiste, ma sta in cima ai
                      filtri, fuori dal campo visivo di chi sta guardando la tabella vuota. */}
                  <VuotoFiltro
                    icona={SearchX}
                    filtri={filtriAttivi(filtri)}
                    azzera={
                      <Button variant="outline" size="sm" onClick={() => azzera()}>
                        Azzera i filtri
                      </Button>
                    }
                  />
                </TableCell>
              </TableRow>
            ) : (
              conIntestazioni.map((voce) =>
                "intestazione" in voce ? (
                  <TableRow key={`cat-${voce.intestazione}`} className="hover:bg-transparent">
                    <TableCell
                      colSpan={7}
                      className="border-b border-border bg-surface-sunken/60 px-3 py-1 text-micro font-semibold tracking-[0.11em] uppercase"
                    >
                      {voce.intestazione}
                    </TableCell>
                  </TableRow>
                ) : (
                  <TableRow
                    key={voce.id}
                    className={cn(
                      "h-riga border-b border-border-subtle last:border-0 hover:bg-accent",
                      voce.stato === "Non applicabile" && "opacity-60",
                    )}
                  >
                    <TableCell className="px-3 py-0">
                      <button
                        type="button"
                        onClick={() => setApertaId(voce.id)}
                        className="hover:underline"
                        data-tour="apri-adempimento"
                      >
                        <Codice
                          codice={voce.codice}
                          {...(voce.letturaDa ? { origine: voce.letturaDa.dominio } : {})}
                        />
                      </button>
                    </TableCell>
                    <TableCell className="px-3 py-0">
                      <button
                        type="button"
                        onClick={() => setApertaId(voce.id)}
                        className="block max-w-md truncate text-left text-sm hover:underline"
                        title={voce.titolo}
                      >
                        {voce.titolo}
                      </button>
                    </TableCell>
                    <TableCell className="px-3 py-0 text-xs text-muted-foreground">{voce.ruolo}</TableCell>
                    <TableCell className="px-3 py-0 text-xs text-muted-foreground">
                      {voce.periodicitaTesto}
                    </TableCell>
                    <TableCell className="px-3 py-0">
                      <Priorita priorita={voce.priorita} />
                    </TableCell>
                    <TableCell className="px-3 py-0">
                      {voce.letturaDa ? (
                        // Presidio di un altro modulo: si mostra il suo stato e non si tocca.
                        // Renderlo modificabile qui creerebbe due verità sullo stesso fatto.
                        <span
                          className="inline-flex items-center gap-1 text-xs text-muted-foreground"
                          title={`Presidiato in ${ETICHETTE_DOMINIO[voce.letturaDa.dominio].breve} ${voce.letturaDa.codice} · ${voce.letturaDa.riferimento}`}
                        >
                          <Link2 className="size-3 shrink-0" aria-hidden />
                          {voce.stato}
                        </span>
                      ) : (
                        <select
                          value={provvisori[voce.id] ?? voce.stato}
                          // Si blocca solo la riga che sta salvando: le altre restano azionabili.
                          disabled={!modificabile || voce.id in provvisori}
                          aria-busy={voce.id in provvisori}
                          aria-label={`Stato del lavoro di ${voce.codice}`}
                          data-tour="stato-riga"
                          onChange={(e) => cambia(voce, e.target.value)}
                          className="h-6 rounded border border-border bg-surface px-1.5 text-xs outline-none hover:border-border-strong focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                        >
                          {STATI_LAVORO.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      )}
                    </TableCell>
                    <TableCell className="px-3 py-0">
                      <Scadenza
                        data={voce.scadenza}
                        giorni={voce.giorniAllaScadenza}
                        statoScadenza={voce.statoScadenza}
                      />
                    </TableCell>
                  </TableRow>
                ),
              )
            )}
          </TableBody>
        </Table>
      </div>

      <PannelloAdempimento
        riga={aperta}
        aperto={aperta !== null}
        onChiudi={() => {
          setApertaId(null);
          router.refresh();
        }}
        modificabile={modificabile}
      />
    </div>
  );
}

/** Un menù a tendina di filtro. Nativo: è denso, veloce da tastiera e non serve altro. */
function Menu({
  etichetta,
  valore,
  opzioni,
  onCambia,
}: {
  etichetta: string;
  valore: string;
  opzioni: readonly string[];
  onCambia: (v: string) => void;
}) {
  return (
    <select
      value={valore}
      onChange={(e) => onCambia(e.target.value)}
      aria-label={`Filtra per ${etichetta.toLowerCase()}`}
      className={cn(
        "h-8 max-w-44 rounded-md border bg-surface px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring",
        valore === "" ? "border-border text-muted-foreground" : "border-border-strong font-medium",
      )}
    >
      <option value="">{etichetta}: tutti</option>
      {opzioni.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}
