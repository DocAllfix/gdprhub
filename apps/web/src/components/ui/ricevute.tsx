"use client";

import { Toaster } from "sonner";

// LE RICEVUTE DELLE SCRITTURE.
//
// Fino al 2026-09-19 il prodotto non confermava nessuna scrittura. Si cambiava lo stato di un
// adempimento, la tabella si congelava, poi si ricaricava — e se il server aveva RIFIUTATO la
// modifica (sola lettura, modalità dimostrativa, validazione), la riga tornava al valore di
// prima senza una parola. `cambiaStato` restituiva il motivo del rifiuto, e nessuno lo leggeva.
//
// È `sonner`, e non una cosa scritta a mano, per una ragione misurata: nessun `eval` né
// `new Function` nel pacchetto — la CSP di produzione li blocca — e gestisce da sé la regione
// `aria-live`, cioè la parte difficile da fare bene: una ricevuta che un lettore di schermo
// non annuncia è una ricevuta per metà degli utenti.
//
// VESTITO COI NOSTRI TOKEN, per la regola di DESIGN.md nata da driver.js: una libreria col suo
// tema predefinito incollato sopra si nota più di qualunque altra cosa, perché compare proprio
// nel momento in cui l'utente sta guardando. `unstyled` toglie tutto il suo; le classi sotto
// rimettono il nostro, e cambiano col tema da sole.
//
// ⚠️ IL SUCCESSO NON È VERDE. Rosso, ambra e verde sono riservati allo stato della scadenza
// (DESIGN.md, gerarchia del colore, livello 1): una ricevuta verde accanto a una data verde
// direbbe «regolare» a una cosa che significa «salvato». La conferma è neutra; l'errore usa
// `destructive`, che è già l'alias dichiarato di quel rosso per i rifiuti.
export function Ricevute() {
  return (
    <Toaster
      position="bottom-right"
      // Sopra la sovrapposizione di sviluppo e sotto i menù: le ricevute non devono coprire un
      // comando che l'utente sta per toccare.
      offset={16}
      gap={8}
      visibleToasts={3}
      toastOptions={{
        unstyled: true,
        duration: 2800,
        classNames: {
          toast:
            "flex w-full items-start gap-2.5 rounded-lg bg-surface-raised px-3.5 py-2.5 text-sm text-foreground shadow-md ring-1 ring-border",
          title: "font-medium leading-snug",
          description: "mt-0.5 text-xs leading-relaxed text-muted-foreground",
          icon: "mt-0.5 shrink-0 text-accento",
          error: "ring-scaduta-border [&_[data-icon]]:text-destructive",
          closeButton: "text-muted-foreground",
        },
      }}
    />
  );
}
