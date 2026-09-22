"use client";

import { useCallback, useState } from "react";
import { useSearchParams } from "next/navigation";

// Filtri che vivono nell'URL senza far ripartire il server.
//
// IL PROBLEMA CHE RISOLVE. `router.replace()` su una pagina dinamica è una navigazione: il
// server component viene rieseguito, rilegge il database e rimanda tutto. Sui filtri va
// benissimo — si cambiano di rado — ma sul CAMPO DI RICERCA significa una richiesta per
// ogni carattere digitato, e con settemila adempimenti in tabella la digitazione diventa a
// scatti. Misurato: ogni battuta rileggeva l'intero portafoglio.
//
// Qui i filtri sono applicati dal client su dati già in memoria: al server non serve
// saperne nulla. `history.replaceState` aggiorna l'indirizzo — che resta condivisibile e
// ricaricabile — senza alcuna navigazione. È la via che Next indica per lo stato di
// interfaccia nell'URL.
//
// Lo stato locale resta la fonte per il disegno, così la reazione è immediata e non passa
// da un giro di rete nemmeno logico.

export type Filtri = Readonly<Record<string, string>>;

export function useFiltriUrl<T extends Filtri>(iniziali: T) {
  // La prima lettura passa da `useSearchParams` e NON da `window.location`: sul server
  // `window` non esiste, quindi il primo disegno userebbe i valori vuoti mentre il browser
  // usa quelli dell'indirizzo, e React boccia l'idratazione (errore #418). Con
  // `useSearchParams` server e client leggono la stessa cosa.
  //
  // Dopo il montaggio comanda lo stato locale: rileggere l'indirizzo a ogni render
  // riporterebbe indietro i valori appena scritti con `replaceState`.
  const parametri = useSearchParams();
  const [filtri, setFiltri] = useState<T>(() => {
    const letti = { ...iniziali };
    for (const chiave of Object.keys(iniziali)) {
      const v = parametri.get(chiave);
      if (v !== null) (letti as Record<string, string>)[chiave] = v;
    }
    return letti;
  });

  // ⚠️ L'AGGIORNATORE DI STATO DEV'ESSERE PURO, e qui non lo era.
  //
  // `replaceState` stava DENTRO la funzione passata a `setFiltri`. Gli aggiornatori li
  // chiama React in fase di render, e Next intercetta `history.replaceState` per tenere
  // allineato il proprio Router: il risultato era l'aggiornamento di un componente (il
  // Router) durante il render di un altro, che React segnala con
  // «Cannot update a component (Router) while rendering a different component».
  //
  // Non era teoria: il cancello visivo lo ha registrato trenta volte sullo scadenzario, il
  // 2026-09-19 — al primo giro in cui React si idratava davvero, perché finché la pagina
  // restava inerte nessun aggiornatore veniva mai eseguito.
  //
  // Ora l'aggiornatore calcola e basta; l'indirizzo si riscrive nel gestore dell'evento,
  // che è il posto degli effetti. L'indirizzo è comunque la fonte per la parte di query —
  // si rilegge da `window.location`, non dallo stato — quindi qui non serve conoscere i
  // valori precedenti.
  const imposta = useCallback((chiave: keyof T & string, valore: string) => {
    setFiltri((precedenti) => ({ ...precedenti, [chiave]: valore }));

    const p = new URLSearchParams(window.location.search);
    if (valore === "") p.delete(chiave);
    else p.set(chiave, valore);
    const query = p.toString();
    window.history.replaceState(null, "", query === "" ? window.location.pathname : `?${query}`);
  }, []);

  // Stesso difetto e stessa correzione. Qui però servono i valori correnti per i filtri che
  // si tengono, quindi la funzione dipende da `filtri`: cambia identità a ogni filtro
  // cambiato, il che va bene perché è il gestore di un pulsante e non una dipendenza di un
  // effetto.
  const azzera = useCallback(
    (tieni: readonly (keyof T & string)[] = []) => {
      const nuovi = { ...iniziali } as Record<string, string>;
      for (const k of tieni) nuovi[k] = filtri[k] as string;
      setFiltri(nuovi as T);

      const p = new URLSearchParams();
      for (const k of tieni) {
        const v = filtri[k] as string;
        if (v !== "") p.set(k, v);
      }
      const query = p.toString();
      window.history.replaceState(null, "", query === "" ? window.location.pathname : `?${query}`);
    },
    [filtri, iniziali],
  );

  return { filtri, imposta, azzera };
}
