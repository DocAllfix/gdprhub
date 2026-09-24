"use client";

import { useEffect, useRef, useState } from "react";
import { PULSANTE_PIENO } from "./pulsanti";

// IL MODULO DELLE RICHIESTE. Esiste solo con `RICHIESTE_ATTIVE=1` (vedi `lib/sito.ts`).
//
// Tre protezioni senza terze parti — niente reCAPTCHA, che porta cookie e trasferimento verso
// gli USA su un prodotto che vende GDPR:
//   1. un campo trappola che una persona non vede e un programma compila;
//   2. il tempo trascorso dall'apertura: sotto tre secondi non scrive un essere umano;
//   3. la validazione lato server, che rifiuta i collegamenti nel messaggio.
//
// Il motivo arriva da `?motivo=` — la demo manda qui con «appuntamento» o «acquisto» già scelto.

const MOTIVI = [
  ["presentazione", "Una presentazione"],
  ["appuntamento", "Un appuntamento"],
  ["acquisto", "Una richiesta d'acquisto"],
] as const;

const RUOLI = ["DPO", "Avvocato", "Organismo di Vigilanza", "RSPP", "Consulente", "Altro"] as const;

type Esito = { stato: "inattivo" } | { stato: "invio" } | { stato: "fatto" } | { stato: "errore"; messaggio: string };

const CAMPO =
  "mt-1.5 block w-full rounded-md border border-border-strong bg-surface px-3 py-2.5 text-sm " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function ModuloRichiesta() {
  const aperto = useRef(0);
  const modulo = useRef<HTMLFormElement>(null);
  const [esito, setEsito] = useState<Esito>({ stato: "inattivo" });

  // I pulsanti del motivo non sono controllati: l'effetto sceglie quello indicato nell'indirizzo
  // direttamente sul modulo. Con uno stato React sarebbe un secondo render solo per questo.
  useEffect(() => {
    aperto.current = Date.now();
    const scelto = new URLSearchParams(window.location.search).get("motivo");
    const campo = modulo.current?.elements.namedItem("motivo");
    if (scelto && campo instanceof RadioNodeList && MOTIVI.some(([v]) => v === scelto)) campo.value = scelto;
  }, []);

  async function invia(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setEsito({ stato: "invio" });
    const dati = Object.fromEntries(new FormData(evento.currentTarget));
    try {
      const r = await fetch("/api/richieste", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...dati, trascorsi: Date.now() - aperto.current }),
      });
      if (r.ok) return setEsito({ stato: "fatto" });
      const corpo = (await r.json().catch(() => null)) as { errore?: string } | null;
      setEsito({ stato: "errore", messaggio: corpo?.errore ?? "La richiesta non è partita. Riprovate fra qualche minuto." });
    } catch {
      setEsito({ stato: "errore", messaggio: "La richiesta non è partita: la connessione si è interrotta." });
    }
  }

  return (
    <section id="richiesta" aria-labelledby="richiesta-titolo" className="border-b bg-surface-sunken">
      <div className="mx-auto grid w-full max-w-6xl gap-12 px-5 py-24 lg:grid-cols-[1fr_1.4fr]">
        <div>
          <h2 id="richiesta-titolo" className="text-display-sm font-semibold tracking-tight">
            Parliamone.
          </h2>
          <p className="mt-4 leading-relaxed text-muted-foreground">
            Vi rispondiamo per email entro due giorni lavorativi. Nessuna newsletter, nessun uso diverso da questa
            richiesta.
          </p>
        </div>

        {esito.stato === "fatto" ? (
          <p role="status" className="rounded-lg border bg-surface p-6 leading-relaxed">
            Richiesta ricevuta. Vi scriviamo all&apos;indirizzo che avete indicato.
          </p>
        ) : (
          <form ref={modulo} onSubmit={invia} className="rounded-lg border bg-surface p-6">
            <fieldset>
              <legend className="text-sm font-semibold">Che cosa vi serve</legend>
              <div className="mt-3 flex flex-wrap gap-2">
                {MOTIVI.map(([valore, etichetta]) => (
                  <label
                    key={valore}
                    className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-border-strong px-3 text-sm has-checked:border-primary has-checked:bg-selected"
                  >
                    <input
                      type="radio"
                      name="motivo"
                      value={valore}
                      defaultChecked={valore === "presentazione"}
                    />
                    {etichetta}
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="text-sm">
                Nome e cognome
                <input name="nome" required autoComplete="name" className={CAMPO} />
              </label>
              <label className="text-sm">
                Email
                <input name="email" type="email" required autoComplete="email" className={CAMPO} />
              </label>
              <label className="text-sm">
                Studio od organizzazione
                <input name="studio" required autoComplete="organization" className={CAMPO} />
              </label>
              <label className="text-sm">
                Ruolo
                <select name="ruolo" required defaultValue="" className={CAMPO}>
                  <option value="" disabled>
                    Scegliete…
                  </option>
                  {RUOLI.map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              </label>
            </div>
            <label className="mt-4 block text-sm">
              Messaggio <span className="text-muted-foreground">(facoltativo)</span>
              <textarea name="messaggio" rows={4} maxLength={2000} className={CAMPO} />
            </label>

            {/* La trappola: fuori dallo schermo e fuori dall'ordine di tabulazione. */}
            <div aria-hidden className="absolute -left-[9999px]">
              <label>
                Non compilare
                <input name="sito" tabIndex={-1} autoComplete="off" />
              </label>
            </div>

            {/* Art. 13 GDPR: l'informativa al momento della raccolta, non un collegamento sepolto. */}
            <p className="mt-5 text-xs leading-relaxed text-muted-foreground">
              Usiamo questi dati solo per rispondere alla vostra richiesta, come misura precontrattuale (art. 6.1.b GDPR),
              e li conserviamo per il tempo necessario a darvi seguito.{" "}
              <a href="/privacy" className="underline underline-offset-2">
                Informativa completa
              </a>
              .
            </p>

            {esito.stato === "errore" ? (
              <p role="alert" className="mt-4 rounded-md border border-scaduta-border bg-scaduta-surface px-3 py-2 text-sm text-scaduta">
                {esito.messaggio}
              </p>
            ) : null}

            <button type="submit" disabled={esito.stato === "invio"} className={`${PULSANTE_PIENO} mt-6`}>
              {esito.stato === "invio" ? "Invio…" : "Invia la richiesta"}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
