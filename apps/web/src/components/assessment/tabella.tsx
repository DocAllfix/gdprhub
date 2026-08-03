"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useFiltriUrl } from "@/lib/filtri-url";
import { Link2, X } from "lucide-react";
import { ETICHETTE_DOMINIO, STATI_LAVORO, STATI_SCADENZA, type StatoLavoro } from "@gdpr/engine";
import type { RigaAssessment } from "@/features/assessment/dati";
import { cambiaStato } from "@/features/assessment/azioni";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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

export function TabellaAssessment({
  righe,
  modificabile,
}: {
  righe: readonly RigaAssessment[];
  modificabile: boolean;
}) {
  const router = useRouter();
  const [inCorso, avvia] = useTransition();
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
    avvia(async () => {
      await cambiaStato(riga.id, nuovo as StatoLavoro);
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

      <div className="pannello overflow-x-auto" data-tour="tabella-assessment">
        <Table>
          <TableHeader className="bg-surface-sunken">
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
                <TableCell colSpan={7} className="h-24 text-center text-sm text-muted-foreground">
                  Nessun adempimento corrisponde ai filtri attivi.
                </TableCell>
              </TableRow>
            ) : (
              conIntestazioni.map((voce) =>
                "intestazione" in voce ? (
                  <TableRow key={`cat-${voce.intestazione}`} className="hover:bg-transparent">
                    <TableCell
                      colSpan={7}
                      className="border-b border-border bg-surface-sunken/60 px-3 py-1 text-[10px] font-semibold tracking-[0.11em] uppercase"
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
                          value={voce.stato}
                          disabled={!modificabile || inCorso}
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
