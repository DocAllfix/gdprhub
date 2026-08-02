"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { authClient } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// L'accesso, in due passi: credenziali e, se attivo, secondo fattore.
//
// Il messaggio d'errore NON dice mai se l'indirizzo esiste. «Credenziali non valide» copre
// entrambi i casi: distinguere significherebbe regalare a chiunque un modo per sapere chi
// ha un accesso a questa istanza, e in un archivio di evidenze di compliance quell'elenco
// è già un'informazione.

type Passo = "credenziali" | "secondo-fattore";

export function ModuloAccesso({ studio }: { studio: string }) {
  const router = useRouter();
  const [passo, setPasso] = useState<Passo>("credenziali");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [codice, setCodice] = useState("");
  const [errore, setErrore] = useState<string | null>(null);
  const [inCorso, setInCorso] = useState(false);

  const entra = () => {
    router.push("/cruscotto");
    router.refresh();
  };

  async function inviaCredenziali(e: React.FormEvent) {
    e.preventDefault();
    setErrore(null);
    setInCorso(true);
    try {
      const esito = await authClient.signIn.email({ email, password });
      if (esito.error) {
        // Un 429 NON è «credenziali non valide»: è il limitatore di tentativi. Dirlo male
        // manda una persona a cambiare password quando doveva solo aspettare un minuto.
        setErrore(
          esito.error.status === 429
            ? "Troppi tentativi ravvicinati. Attendi qualche istante e riprova."
            : "Credenziali non valide.",
        );
        return;
      }
      // Con il secondo fattore attivo la libreria non apre la sessione: chiede il codice.
      if ((esito.data as { twoFactorRedirect?: boolean } | null)?.twoFactorRedirect) {
        setPasso("secondo-fattore");
        return;
      }
      entra();
    } catch {
      setErrore("Non è stato possibile contattare il server. Riprova.");
    } finally {
      setInCorso(false);
    }
  }

  async function inviaCodice(e: React.FormEvent) {
    e.preventDefault();
    setErrore(null);
    setInCorso(true);
    try {
      const esito = await authClient.twoFactor.verifyTotp({ code: codice.trim() });
      if (esito.error) {
        setErrore("Codice non valido o scaduto.");
        return;
      }
      entra();
    } catch {
      setErrore("Non è stato possibile contattare il server. Riprova.");
    } finally {
      setInCorso(false);
    }
  }

  return (
    <form
      onSubmit={passo === "credenziali" ? inviaCredenziali : inviaCodice}
      className="space-y-4"
      data-tour="accesso"
      noValidate
    >
      {passo === "credenziali" ? (
        <>
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-xs font-medium">
              Indirizzo di posta
            </label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nome@studio.it"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="password" className="text-xs font-medium">
              Password
            </label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </>
      ) : (
        <div className="space-y-1.5">
          <label htmlFor="codice" className="text-xs font-medium">
            Codice a sei cifre
          </label>
          <Input
            id="codice"
            name="codice"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            autoFocus
            value={codice}
            onChange={(e) => setCodice(e.target.value)}
            className="font-mono tracking-[0.3em]"
            placeholder="000000"
          />
          <p className="text-xs text-muted-foreground">
            Dall&apos;applicazione di autenticazione associata a {studio}.
          </p>
        </div>
      )}

      {errore ? (
        <p role="alert" className="flex items-start gap-1.5 text-xs text-scaduta">
          <AlertCircle className="mt-px size-3.5 shrink-0" aria-hidden />
          {errore}
        </p>
      ) : null}

      <Button type="submit" disabled={inCorso} className="w-full">
        {inCorso ? "Verifica…" : passo === "credenziali" ? "Accedi" : "Conferma il codice"}
      </Button>

      {passo === "secondo-fattore" ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-full"
          onClick={() => {
            setPasso("credenziali");
            setCodice("");
            setErrore(null);
          }}
        >
          Torna alle credenziali
        </Button>
      ) : null}
    </form>
  );
}
