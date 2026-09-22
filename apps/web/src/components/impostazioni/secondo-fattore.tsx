"use client";

import { useState } from "react";
import { Check, Copy, ShieldCheck, TriangleAlert } from "lucide-react";
import { authClient } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// L'ATTIVAZIONE DEL SECONDO FATTORE, che era dichiarata e non esisteva.
//
// Il plugin `twoFactor` era configurato, la colonna `two_factor_enabled` c'era, la schermata
// di accesso sapeva già verificare un TOTP. Mancava l'unica cosa che serviva davvero:
// un modo per ACCENDERLO. Nel frattempo l'installazione stampava al cliente che «al primo
// accesso saranno forzati il cambio password e il secondo fattore».
//
// TRE PASSI, e nessuno si può saltare:
//
//   1. la password, perché accendere il secondo fattore è un'operazione che non deve poter
//      fare chi ha trovato una sessione aperta su un computer incustodito;
//   2. il codice dall'app, perché un segreto generato e mai verificato produce un'utenza
//      bloccata fuori — il difetto peggiore di questa funzione, e il motivo per cui il
//      passo 2 esiste;
//   3. i codici di recupero, mostrati UNA VOLTA SOLA.
//
// ── Rifatto il 2026-09-19 ────────────────────────────────────────────────────────────────
//
// Non era solo una questione di forma: c'erano tre difetti che rendevano la funzione più
// pericolosa di quanto sembrasse.
//
// IL SEGRETO ERA UN URI GREZZO. Il passo 2 stampava `otpauth://totp/...?secret=...` dentro un
// blocco di codice. È la forma peggiore possibile: le app di autenticazione o scansionano un
// QR o vogliono il segreto in base32 digitato a mano, e nessuna accetta un URI incollato.
// Ora il segreto si estrae dall'URI e si presenta in gruppi di quattro, che è la forma in cui
// si digita senza perdere il segno; l'URI resta come collegamento, perché da telefono apre
// l'app direttamente.
//
// ⚠️ IL QR CONTINUA A MANCARE, ed è dichiarato in `docs/05-arretrato.md` §1.1. Disegnarlo
// richiede una libreria, e questo progetto ha un metro alto sulle dipendenze (TanStack
// rimosso a 55 KB misurati). La strada giusta costa zero al bundle — un'azione di server che
// restituisce l'SVG, così la libreria resta sul server — ma è una decisione, non una
// vestizione.
//
// I CODICI DI RECUPERO NON SI POTEVANO SALVARE. Comparivano una volta sola, senza un modo di
// copiarli, accanto alla frase «non verranno mostrati di nuovo». Perdere il telefono senza
// codici, su un'istanza dove la registrazione pubblica è chiusa, significa chiamare noi: è il
// difetto peggiore di questa funzione, e la schermata lo invitava.
//
// I CAMPI NON ERANO IN UN MODULO. Si digitava la password, si premeva Invio e non succedeva
// niente. Ogni passo ora è un `<form>`: Invio fa la cosa che uno si aspetta.

type Passo = "spento" | "verifica" | "recupero" | "acceso";

/** Il segreto base32 dentro l'URI `otpauth://`. È quello che si digita nell'app. */
function segretoDa(uri: string | null): string | null {
  return uri?.match(/[?&]secret=([A-Z2-7]+)/i)?.[1] ?? null;
}

/** In gruppi di quattro: un base32 di trentadue caratteri di fila non si digita. */
function aGruppi(s: string): string {
  return s.replace(/(.{4})/g, "$1 ").trim();
}

function Avviso({ testo }: { testo: string }) {
  return (
    <p
      // `role="alert"` perché compare dopo un'azione: chi usa un lettore di schermo deve
      // sentirlo senza doverlo andare a cercare.
      role="alert"
      className="flex items-start gap-2 rounded-md border border-scaduta-border bg-scaduta-surface px-3 py-2 text-sm text-scaduta"
    >
      <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
      {testo}
    </p>
  );
}

function Passi({ corrente }: { corrente: 1 | 2 | 3 }) {
  const nomi = ["Password", "Codice dall'app", "Codici di recupero"] as const;
  return (
    <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-micro tracking-[0.09em] uppercase">
      {nomi.map((n, i) => (
        <li key={n} className="flex items-center gap-2">
          <span className={i + 1 === corrente ? "font-medium text-foreground" : "text-muted-foreground"}>
            {i + 1}. {n}
          </span>
          {i < 2 ? (
            <span aria-hidden className="text-muted-foreground">
              ·
            </span>
          ) : null}
        </li>
      ))}
    </ol>
  );
}

/** Copia negli appunti e lo dice. Senza conferma non si sa se ha funzionato. */
function Copia({ testo, etichetta }: { testo: string; etichetta: string }) {
  const [fatto, setFatto] = useState(false);
  const [fallito, setFallito] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(testo);
          setFatto(true);
          setFallito(false);
          window.setTimeout(() => setFatto(false), 2000);
        } catch {
          // Contesto non sicuro o permesso negato: si dice, invece di fingere.
          setFallito(true);
        }
      }}
    >
      {fatto ? <Check aria-hidden /> : <Copy aria-hidden />}
      {fallito ? "Copia a mano" : fatto ? "Copiato" : etichetta}
    </Button>
  );
}

export function SecondoFattore({ attivo }: { attivo: boolean }) {
  const [passo, setPasso] = useState<Passo>(attivo ? "acceso" : "spento");
  const [password, setPassword] = useState("");
  const [codice, setCodice] = useState("");
  const [uri, setUri] = useState<string | null>(null);
  const [recupero, setRecupero] = useState<string[]>([]);
  const [errore, setErrore] = useState<string | null>(null);
  const [inCorso, setInCorso] = useState(false);

  async function avvia() {
    setErrore(null);
    setInCorso(true);
    const esito = await authClient.twoFactor.enable({ password });
    setInCorso(false);
    if (esito.error) {
      setErrore(esito.error.message ?? "Password non corretta.");
      return;
    }
    setUri(esito.data?.totpURI ?? null);
    setRecupero(esito.data?.backupCodes ?? []);
    setPassword("");
    setPasso("verifica");
  }

  async function conferma() {
    setErrore(null);
    setInCorso(true);
    // LA VERIFICA È IL PUNTO DELLA SCHERMATA. Senza, l'utente esce credendo di avere il
    // secondo fattore e lo scopre al prossimo accesso, quando non può più entrare.
    const esito = await authClient.twoFactor.verifyTotp({ code: codice });
    setInCorso(false);
    if (esito.error) {
      setErrore("Codice non valido. Controlla che l'orologio del telefono sia sincronizzato.");
      return;
    }
    setCodice("");
    setPasso("recupero");
  }

  async function disattiva() {
    setErrore(null);
    setInCorso(true);
    const esito = await authClient.twoFactor.disable({ password });
    setInCorso(false);
    if (esito.error) {
      setErrore(esito.error.message ?? "Password non corretta.");
      return;
    }
    setPassword("");
    setPasso("spento");
  }

  // --- Acceso ----------------------------------------------------------------------------

  if (passo === "acceso") {
    return (
      <div className="pannello max-w-xl p-5">
        <p className="flex items-center gap-2 text-sm">
          <ShieldCheck className="size-4 text-regolare" aria-hidden />
          Il secondo fattore è <strong>attivo</strong> su questa utenza.
        </p>
        <form
          className="mt-5 border-t border-border-subtle pt-4"
          onSubmit={(e) => {
            e.preventDefault();
            void disattiva();
          }}
        >
          <label className="text-xs font-medium" htmlFor="pwd-off">
            Password, per disattivarlo
          </label>
          <div className="mt-1.5 flex max-w-sm items-center gap-2">
            <Input
              id="pwd-off"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="flex-1"
            />
            <Button type="submit" variant="outline" disabled={inCorso || password.length < 1}>
              Disattiva
            </Button>
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            Disattivarlo invalida anche i codici di recupero.
          </p>
          {errore ? <div className="mt-3">{<Avviso testo={errore} />}</div> : null}
        </form>
      </div>
    );
  }

  // --- Passo 3: i codici di recupero -------------------------------------------------------

  if (passo === "recupero") {
    return (
      <div className="pannello max-w-xl p-5">
        <Passi corrente={3} />
        <p className="mt-3 flex items-center gap-2 text-sm">
          <ShieldCheck className="size-4 text-regolare" aria-hidden />
          Secondo fattore <strong>attivato</strong>.
        </p>
        <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted-foreground">
          Conserva questi codici in un posto che non sia il telefono che hai appena registrato.
          Servono se lo perdi: senza, l&apos;unico modo di rientrare è chiedere all&apos;assistenza.{" "}
          <strong className="text-foreground">Non verranno mostrati di nuovo.</strong>
        </p>

        <ol className="mt-4 grid max-w-sm grid-cols-2 gap-x-4 gap-y-1 rounded-md bg-surface-sunken p-3 font-mono text-sm tabular-nums">
          {recupero.map((c, i) => (
            <li key={c} className="flex items-baseline gap-2">
              <span className="text-micro text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
              {c}
            </li>
          ))}
        </ol>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Copia testo={recupero.join("\n")} etichetta="Copia i codici" />
          <Button onClick={() => setPasso("acceso")}>Li ho conservati</Button>
        </div>
      </div>
    );
  }

  // --- Passo 2: il codice dall'app ---------------------------------------------------------

  if (passo === "verifica") {
    const segreto = segretoDa(uri);
    return (
      <div className="pannello max-w-xl p-5">
        <Passi corrente={2} />
        <p className="mt-3 max-w-prose text-sm leading-relaxed">
          Apri l&apos;app di autenticazione, aggiungi un account nuovo scegliendo{" "}
          <strong>«inserisci una chiave»</strong>, e digita questo segreto.
        </p>

        {segreto ? (
          <div className="mt-4">
            <p className="text-micro tracking-[0.09em] text-muted-foreground uppercase">
              Chiave segreta
            </p>
            <p className="mt-1 font-mono text-base break-all select-all">{aGruppi(segreto)}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Copia testo={segreto} etichetta="Copia la chiave" />
              {uri ? (
                // Da telefono questo collegamento apre l'app di autenticazione e la compila
                // da solo: è la scorciatoia che sostituisce la scansione del QR, finché il QR
                // non c'è.
                <Button asChild variant="ghost" size="sm">
                  <a href={uri}>Apri nell&apos;app</a>
                </Button>
              ) : null}
            </div>
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">
            Il segreto non è arrivato dal server. Ricarica la pagina e riprova.
          </p>
        )}

        <form
          className="mt-5 border-t border-border-subtle pt-4"
          onSubmit={(e) => {
            e.preventDefault();
            void conferma();
          }}
        >
          <label className="text-xs font-medium" htmlFor="totp">
            Il codice a sei cifre che l&apos;app mostra adesso
          </label>
          <div className="mt-1.5 flex max-w-sm items-center gap-2">
            <Input
              id="totp"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={codice}
              onChange={(e) => setCodice(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="flex-1 font-mono tracking-[0.3em] tabular-nums"
              placeholder="000000"
            />
            <Button type="submit" disabled={inCorso || codice.length !== 6}>
              Conferma
            </Button>
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            Il codice cambia ogni trenta secondi: se scade mentre lo digiti, usa il successivo.
          </p>
          {errore ? <div className="mt-3">{<Avviso testo={errore} />}</div> : null}
        </form>
      </div>
    );
  }

  // --- Passo 1: la password ----------------------------------------------------------------

  return (
    <div className="pannello max-w-xl p-5">
      <Passi corrente={1} />
      <p className="mt-3 max-w-prose text-sm leading-relaxed text-muted-foreground">
        Una password sola non basta per un archivio che contiene le evidenze di conformità di
        aziende terze. Serve un&apos;app di autenticazione sul telefono.
      </p>
      <form
        className="mt-4"
        onSubmit={(e) => {
          e.preventDefault();
          void avvia();
        }}
      >
        <label className="text-xs font-medium" htmlFor="pwd-on">
          Conferma la password
        </label>
        <div className="mt-1.5 flex max-w-sm items-center gap-2">
          <Input
            id="pwd-on"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            className="flex-1"
          />
          <Button type="submit" disabled={inCorso || password.length < 1}>
            Attiva
          </Button>
        </div>
        <p className="mt-1.5 text-xs text-muted-foreground">
          Si richiede qui perché accendere il secondo fattore non deve poterlo fare chi ha trovato
          una sessione aperta su un computer incustodito.
        </p>
        {errore ? <div className="mt-3">{<Avviso testo={errore} />}</div> : null}
      </form>
    </div>
  );
}
