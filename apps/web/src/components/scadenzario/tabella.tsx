"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useFiltriUrl } from "@/lib/filtri-url";
import { X } from "lucide-react";
import { DOMINI, ETICHETTE_DOMINIO } from "@gdpr/engine";
import type { VoceScadenzario } from "@/features/scadenzario/dati";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Codice, PastigliaDominio, Priorita, Scadenza, StatoLavoroEtichetta } from "@/components/stato";
import { cn } from "@/lib/utils";

// Lo scadenzario: una lista sola su tre decreti e tutte le aziende.
//
// LA FINESTRA È IL FILTRO PRINCIPALE, e va scelta per prima: «cosa scade questa settimana»
// non è la stessa domanda di «cosa è già scaduto». Le finestre sono disgiunte e cumulative
// come le pensa un consulente: scadute, 7, 30, 90 giorni.
//
// Il nome dell'azienda è la prima colonna perché è la prima cosa che serve: da qui si decide
// chi chiamare, non cosa fare.

const INIZIALI = { q: "", finestra: "30", dominio: "", azienda: "", ruolo: "", priorita: "" };

/** Quante righe si disegnano alla volta. Duecento riempiono abbondantemente uno schermo
 *  e restano leggere: sono milleseicento celle invece di diecimila. */
const PASSO = 200;

const FINESTRE = [
  { chiave: "", etichetta: "Tutte", limite: Number.MAX_SAFE_INTEGER, min: Number.MIN_SAFE_INTEGER },
  { chiave: "scadute", etichetta: "Scadute", limite: -1, min: Number.MIN_SAFE_INTEGER },
  { chiave: "7", etichetta: "7 giorni", limite: 7, min: 0 },
  { chiave: "30", etichetta: "30 giorni", limite: 30, min: 0 },
  { chiave: "90", etichetta: "90 giorni", limite: 90, min: 0 },
] as const;

export function TabellaScadenzario({
  voci,
  aziende,
}: {
  voci: readonly VoceScadenzario[];
  aziende: readonly { id: string; nome: string }[];
}) {
  const { filtri: f, imposta, azzera } = useFiltriUrl(INIZIALI);

  const ruoli = useMemo(() => [...new Set(voci.map((v) => v.ruolo))].sort(), [voci]);

  const visibili = useMemo(() => {
    const q = f.q.toLowerCase();
    const finestra = FINESTRE.find((x) => x.chiave === f.finestra) ?? FINESTRE[0];
    return voci.filter(
      (v) =>
        v.giorni <= finestra.limite &&
        v.giorni >= finestra.min &&
        (q === "" ||
          v.codice.toLowerCase().includes(q) ||
          v.titolo.toLowerCase().includes(q) ||
          v.azienda.toLowerCase().includes(q)) &&
        (f.dominio === "" || v.dominio === f.dominio) &&
        (f.azienda === "" || v.aziendaId === f.azienda) &&
        (f.ruolo === "" || v.ruolo === f.ruolo) &&
        (f.priorita === "" || v.priorita === f.priorita),
    );
  }, [voci, f.q, f.finestra, f.dominio, f.azienda, f.ruolo, f.priorita]);

  const attivi = [f.q, f.dominio, f.azienda, f.ruolo, f.priorita].filter((x) => x !== "").length;

  // SI DISEGNA UNA FINESTRA, NON L'INTERO ELENCO.
  //
  // Con quaranta aziende per tre moduli le voci sono più di mille, e mille righe da otto
  // celle sono dodicimila nodi nel documento. Non è una preoccupazione teorica: il cancello
  // visivo è esploso proprio qui, con un `reload` andato in timeout a trenta secondi. Prima
  // ancora, ogni digitazione nella ricerca costringeva il browser a ridisegnare tutto.
  //
  // Non è impaginazione con i numeri delle pagine: è un tetto che si alza. Chi cerca una
  // scadenza usa i filtri e la trova nelle prime righe; chi vuole scorrere tutto preme una
  // volta e ne ottiene altre duecento. Un impaginatore costringerebbe a ricordarsi a che
  // pagina si era, che è lavoro per l'utente al posto del computer.
  const [tetto, setTetto] = useState(PASSO);
  // Il tetto torna al minimo quando cambiano i filtri: restare a mille righe dopo aver
  // ristretto la ricerca a tre significa pagare il costo senza il motivo.
  const chiaveFiltri = `${f.q}|${f.finestra}|${f.dominio}|${f.azienda}|${f.ruolo}|${f.priorita}`;
  const [ultimaChiave, setUltimaChiave] = useState(chiaveFiltri);
  if (chiaveFiltri !== ultimaChiave) {
    setUltimaChiave(chiaveFiltri);
    setTetto(PASSO);
  }
  const disegnate = visibili.length > tetto ? visibili.slice(0, tetto) : visibili;

  return (
    <div className="space-y-3">
      {/* La finestra sta da sola e in evidenza: è la domanda, non un filtro fra tanti. */}
      <div
        className="inline-flex rounded-md border border-border bg-surface-sunken p-0.5"
        role="group"
        aria-label="Finestra temporale"
        data-tour="finestre"
      >
        {FINESTRE.map((x) => (
          <button
            key={x.chiave}
            type="button"
            onClick={() => imposta("finestra", x.chiave)}
            aria-pressed={f.finestra === x.chiave}
            className={cn(
              "rounded px-2.5 py-1 text-xs",
              f.finestra === x.chiave
                ? "bg-surface font-medium text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {x.etichetta}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2" data-tour="filtri-scadenzario">
        <Input
          value={f.q}
          onChange={(e) => imposta("q", e.target.value)}
          placeholder="Cerca per azienda, codice o adempimento"
          className="h-8 max-w-xs text-sm"
          aria-label="Cerca nello scadenzario"
        />
        <Menu
          etichetta="Azienda"
          valore={f.azienda}
          opzioni={aziende.map((a) => ({ valore: a.id, testo: a.nome }))}
          onCambia={(v) => imposta("azienda", v)}
        />
        <Menu
          etichetta="Decreto"
          valore={f.dominio}
          opzioni={DOMINI.map((d) => ({ valore: d, testo: ETICHETTE_DOMINIO[d].breve }))}
          onCambia={(v) => imposta("dominio", v)}
        />
        <Menu
          etichetta="Responsabile"
          valore={f.ruolo}
          opzioni={ruoli.map((r) => ({ valore: r, testo: r }))}
          onCambia={(v) => imposta("ruolo", v)}
        />
        <Menu
          etichetta="Priorità"
          valore={f.priorita}
          opzioni={["Critica", "Alta", "Media", "Bassa"].map((p) => ({ valore: p, testo: p }))}
          onCambia={(v) => imposta("priorita", v)}
        />
        {attivi > 0 ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs"
            // Azzerare NON tocca la finestra: è la domanda che si sta facendo, non un filtro.
            onClick={() => azzera(["finestra"])}
          >
            <X className="size-3.5" aria-hidden />
            Azzera i filtri
          </Button>
        ) : null}
        <span className="ml-auto text-xs tabular-nums text-muted-foreground">
          {visibili.length} di {voci.length}
        </span>
      </div>

      <div
        className="pannello overflow-x-auto"
        data-tour="tabella-scadenzario"
      >
        <Table>
          <TableHeader className="bg-surface-sunken">
            <TableRow className="border-b border-border-strong hover:bg-transparent">
              <TableHead className="h-8 px-3">Azienda</TableHead>
              <TableHead className="h-8 px-3">Modulo</TableHead>
              <TableHead className="h-8 px-3">Cod.</TableHead>
              <TableHead className="h-8 px-3">Adempimento</TableHead>
              <TableHead className="h-8 px-3">Responsabile</TableHead>
              <TableHead className="h-8 px-3">Priorità</TableHead>
              <TableHead className="h-8 px-3">Lavoro</TableHead>
              <TableHead className="h-8 px-3">Scadenza</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibili.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={8} className="h-24 text-center text-sm text-muted-foreground">
                  {voci.length === 0
                    ? "Nessuna scadenza da presidiare in tutto il portafoglio."
                    : "Nessuna scadenza corrisponde ai filtri attivi."}
                </TableCell>
              </TableRow>
            ) : (
              disegnate.map((v) => (
                <TableRow
                  key={`${v.aziendaId}-${v.dominio}-${v.codice}`}
                  className="h-riga border-b border-border-subtle last:border-0 hover:bg-accent"
                >
                  <TableCell className="px-3 py-0">
                    {/* `prefetch={false}`: Next precarica i collegamenti che entrano nel
                        campo visivo, e qui le righe possono essere milleduecento. Misurato
                        digitando nella ricerca: cinquanta richieste al server per dieci
                        caratteri, tutte per pagine che nessuno aprirà. */}
                    <Link
                      href={`/azienda/${v.aziendaId}/${v.dominio}?q=${v.codice}`}
                      prefetch={false}
                      className="block max-w-48 truncate text-sm hover:underline"
                      title={v.azienda}
                    >
                      {v.azienda}
                    </Link>
                  </TableCell>
                  <TableCell className="px-3 py-0">
                    <PastigliaDominio dominio={v.dominio} />
                  </TableCell>
                  <TableCell className="px-3 py-0">
                    <Codice codice={v.codice} />
                  </TableCell>
                  <TableCell className="px-3 py-0">
                    <span className="block max-w-sm truncate text-sm" title={v.titolo}>
                      {v.titolo}
                    </span>
                  </TableCell>
                  <TableCell className="px-3 py-0 text-xs text-muted-foreground">{v.ruolo}</TableCell>
                  <TableCell className="px-3 py-0">
                    <Priorita priorita={v.priorita} />
                  </TableCell>
                  <TableCell className="px-3 py-0">
                    <StatoLavoroEtichetta stato={v.stato} />
                  </TableCell>
                  <TableCell className="px-3 py-0">
                    <Scadenza
                      data={v.scadenza}
                      giorni={v.giorniAllaScadenza}
                      statoScadenza={v.statoScadenza}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Il resto non è nascosto: è dichiarato, con quante righe mancano e un comando per
          averle. Un elenco troncato in silenzio è il modo migliore per far credere a un
          consulente che una scadenza non esiste. */}
      {visibili.length > disegnate.length ? (
        <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
          <p className="text-xs text-muted-foreground">
            Ne vedi <b className="tabular-nums">{disegnate.length}</b> di{" "}
            <b className="tabular-nums">{visibili.length}</b>. Restringi con i filtri, oppure
          </p>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setTetto((t) => t + PASSO)}>
            Mostra altre {Math.min(PASSO, visibili.length - disegnate.length)}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function Menu({
  etichetta,
  valore,
  opzioni,
  onCambia,
}: {
  etichetta: string;
  valore: string;
  opzioni: readonly { valore: string; testo: string }[];
  onCambia: (v: string) => void;
}) {
  return (
    <select
      value={valore}
      onChange={(e) => onCambia(e.target.value)}
      aria-label={`Filtra per ${etichetta.toLowerCase()}`}
      className={cn(
        "h-8 max-w-48 rounded-md border bg-surface px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring",
        valore === "" ? "border-border text-muted-foreground" : "border-border-strong font-medium",
      )}
    >
      <option value="">{etichetta}: tutte</option>
      {opzioni.map((o) => (
        <option key={o.valore} value={o.valore}>
          {o.testo}
        </option>
      ))}
    </select>
  );
}
