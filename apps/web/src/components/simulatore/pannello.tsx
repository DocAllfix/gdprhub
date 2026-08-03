"use client";

import { useState, useTransition } from "react";
import { ArrowRight, RotateCcw } from "lucide-react";
import { ETICHETTE_DOMINIO, formattaIt, type Dominio } from "@gdpr/engine";
import { simula } from "@/features/simulatore/azioni";
import type { Proiezione, VoceSimulabile } from "@/features/simulatore/dati";
import { Button } from "@/components/ui/button";
import { PastigliaDominio, Priorita } from "@/components/stato";
import { cn } from "@/lib/utils";

// IL SIMULATORE.
//
// La domanda che risolve non è «quanto siamo scoperti» — quello lo dice il cruscotto — ma
// «da dove conviene cominciare». Sono due domande diverse e la seconda è quella su cui si
// decide un budget.
//
// LA PROIEZIONE SI CALCOLA SUL SERVER, e non è pigrizia: gli adempimenti sono
// centosettantuno e il motore vive lì. Calcolarla nel browser vorrebbe dire spedire il
// motore al client e avere due implementazioni della stessa aritmetica, che il giorno in cui
// divergono producono un numero nella pagina e un altro nella relazione.
//
// NON SI SALVA NULLA. La tentazione opposta — «salvo lo scenario così lo ritrovo» —
// trasformerebbe una proiezione in un dato, e il giorno dopo nessuno saprebbe più
// distinguere ciò che è stato fatto da ciò che era stato ipotizzato.

export function Simulatore({
  aziendaId,
  candidati,
  partenza,
}: {
  aziendaId: string;
  candidati: readonly VoceSimulabile[];
  partenza: {
    conformita: number | null;
    numeratore: number;
    applicabili: number;
    esposizione: number;
    giudizio: string;
  };
}) {
  const [scelti, setScelti] = useState<readonly string[]>([]);
  const [proiezione, setProiezione] = useState<Proiezione | null>(null);
  const [inCorso, avvia] = useTransition();

  const commuta = (codice: string) => {
    const nuovi = scelti.includes(codice) ? scelti.filter((c) => c !== codice) : [...scelti, codice];
    setScelti(nuovi);
    if (nuovi.length === 0) {
      setProiezione(null);
      return;
    }
    avvia(async () => {
      const p = await simula(aziendaId, nuovi);
      setProiezione(p);
    });
  };

  const azzera = () => {
    setScelti([]);
    setProiezione(null);
  };

  const espDopo = proiezione?.esposizioneDopo ?? partenza.esposizione;
  const confDopo = proiezione?.conformitaDopo ?? partenza.conformita;
  const guadagnoEsp = partenza.esposizione - espDopo;
  const guadagnoConf = (confDopo ?? 0) - (partenza.conformita ?? 0);

  return (
    <div className="space-y-4" data-tour="simulatore">
      {/* IL RISULTATO STA IN ALTO e resta visibile mentre si spuntano le voci: è la cosa
          che si guarda, e metterlo in fondo obbligherebbe a scorrere a ogni scelta. */}
      <section className="pannello p-5" data-tour="proiezione">
        <h2 className="text-sm font-semibold tracking-tight">Se chiudo questi, dove arrivo</h2>

        <div className="mt-4 flex flex-wrap items-end gap-x-8 gap-y-4">
          <Misura
            etichetta="esposizione"
            prima={partenza.esposizione}
            dopo={espDopo}
            suffisso="/100"
            /* Sull'esposizione scendere è un guadagno. */
            miglioraScendendo
          />
          <Misura
            etichetta="conformità effettiva"
            prima={partenza.conformita}
            dopo={confDopo}
            suffisso="%"
          />
          <p className="text-xs text-muted-foreground">
            {scelti.length === 0 ? (
              <>
                Spunta gli adempimenti che pensi di chiudere. Il calcolo è lo stesso del cruscotto e
                della relazione: nessuna stima a parte.
              </>
            ) : (
              <>
                <b className="text-foreground">
                  {scelti.length} {scelti.length === 1 ? "intervento" : "interventi"}
                </b>
                {guadagnoEsp > 0 ? (
                  <>
                    {" "}
                    tolgono <b className="text-foreground">{guadagnoEsp}</b> punti di esposizione
                    {guadagnoConf > 0 ? (
                      <>
                        {" "}
                        e ne aggiungono <b className="text-foreground">{Math.round(guadagnoConf)}</b> di
                        conformità
                      </>
                    ) : null}
                    . Il giudizio passa a <b className="text-foreground">{proiezione?.giudizioDopo}</b>.
                  </>
                ) : (
                  <> non spostano l&apos;esposizione: incidono su rischi già coperti da altro.</>
                )}
              </>
            )}
          </p>
          {scelti.length > 0 ? (
            <Button variant="ghost" size="sm" onClick={azzera} className="ml-auto h-8 text-xs">
              <RotateCcw className="size-3.5" aria-hidden />
              Azzera
            </Button>
          ) : null}
        </div>

        <p className="mt-4 border-t border-border-subtle pt-3 text-[11px] leading-relaxed text-faint-foreground">
          È una proiezione e non si salva: chiudere un adempimento davvero si fa
          dall&apos;assessment, registrando l&apos;ultima esecuzione. Tenere memoria di uno scenario
          significherebbe non poter più distinguere ciò che è stato fatto da ciò che era stato
          ipotizzato.
        </p>
      </section>

      <section className="pannello overflow-clip">
        <div className="border-b border-border px-5 py-3">
          <h2 className="text-sm font-semibold tracking-tight">Da dove conviene cominciare</h2>
          <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
            Ordinati per rischio pesato, che è il criterio con cui l&apos;esposizione è costruita. La
            colonna «resa» è misurata simulando davvero la chiusura di quel solo adempimento, non
            stimata.
          </p>
        </div>

        <ul className="divide-y divide-border-subtle">
          {candidati.map((v) => {
            const scelto = scelti.includes(v.codice);
            return (
              <li key={`${v.dominio}-${v.codice}`}>
                <label
                  className={cn(
                    "flex cursor-pointer items-center gap-3 px-5 py-2.5 hover:bg-accent",
                    scelto && "bg-selected",
                  )}
                >
                  <input
                    type="checkbox"
                    checked={scelto}
                    onChange={() => commuta(v.codice)}
                    className="size-4 shrink-0 accent-primary"
                    aria-label={`Includi ${v.codice} nella proiezione`}
                  />
                  <span className="w-12 shrink-0 font-mono text-xs text-muted-foreground">
                    {v.codice}
                  </span>
                  <span className="w-20 shrink-0">
                    <PastigliaDominio dominio={v.dominio} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">{v.titolo}</span>
                    <span className="block text-[10px] text-muted-foreground">
                      {v.ruolo} · {v.periodicita} ·{" "}
                      {v.scadenza ? formattaIt(v.scadenza) : "mai programmato"}
                    </span>
                  </span>
                  <span className="hidden w-24 shrink-0 sm:block">
                    <Priorita priorita={v.priorita as "Critica" | "Alta" | "Media" | "Bassa"} />
                  </span>
                  <span className="w-16 shrink-0 text-right">
                    <span className="block font-mono text-sm font-medium tabular-nums">
                      −{v.guadagno}
                    </span>
                    <span className="block text-[10px] text-faint-foreground">resa</span>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      </section>

      {inCorso ? <p className="text-xs text-muted-foreground">Calcolo…</p> : null}
      {proiezione && proiezione.ignorati.length > 0 ? (
        <p role="alert" className="text-xs text-scaduta">
          Codici non trovati nell&apos;insieme: {proiezione.ignorati.join(", ")}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Una misura prima e dopo.
 *
 * Le due cifre stanno affiancate con una freccia in mezzo, e non sovrapposte con un delta
 * accanto: «71 → 48» si legge in un colpo, «48 (−23)» costringe a fare la somma per sapere
 * da dove si partiva. E il valore di partenza resta sempre visibile, perché è il termine di
 * paragone che rende il secondo numero interessante.
 */
function Misura({
  etichetta,
  prima,
  dopo,
  suffisso,
  miglioraScendendo,
}: {
  etichetta: string;
  prima: number | null;
  dopo: number | null;
  suffisso: string;
  miglioraScendendo?: boolean;
}) {
  const cambiato = prima !== dopo;
  const migliorato = miglioraScendendo ? (dopo ?? 0) < (prima ?? 0) : (dopo ?? 0) > (prima ?? 0);
  return (
    <div>
      <p className="flex items-baseline gap-2">
        <span className={cn("cifra text-[1.9rem] leading-none", cambiato && "text-muted-foreground")}>
          {prima === null ? "—" : prima}
          {prima === null ? "" : suffisso}
        </span>
        {cambiato ? (
          <>
            <ArrowRight className="size-4 shrink-0 text-faint-foreground" aria-hidden />
            <span
              className={cn(
                "cifra text-[1.9rem] leading-none",
                migliorato ? "text-regolare" : "text-scaduta",
              )}
            >
              {dopo === null ? "—" : dopo}
              {dopo === null ? "" : suffisso}
            </span>
          </>
        ) : null}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{etichetta}</p>
    </div>
  );
}

export const NOMI_DOMINIO = ETICHETTE_DOMINIO as Readonly<Record<Dominio, { breve: string }>>;
