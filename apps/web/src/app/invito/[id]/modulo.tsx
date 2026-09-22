"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { accettaInvito, type EsitoInvito } from "./azione";

export function ModuloInvito({ id }: { id: string }) {
  const router = useRouter();
  const [esito, azione, inCorso] = useActionState<EsitoInvito | null, FormData>(accettaInvito, null);

  useEffect(() => {
    // Accettato: si va all'accesso. NON si crea una sessione qui — chi ha appena scelto una
    // password deve usarla subito, ed è anche il modo di accorgersi di averla digitata male.
    if (esito?.ok) router.push("/accedi?invito=accettato");
  }, [esito, router]);

  // I valori tornano dall'azione e si rileggono come `defaultValue`: senza, React rimonta il
  // modulo a ogni errore e chi sbaglia la password riscrive anche il nome.
  const nome = esito && !esito.ok ? esito.nome : undefined;

  return (
    <form action={azione} className="mt-6 space-y-5">
      <input type="hidden" name="id" value={id} />

      <div className="space-y-1.5">
        <label htmlFor="nome" className="text-xs font-medium">
          Il tuo nome
        </label>
        <Input
          id="nome"
          name="nome"
          required
          minLength={2}
          defaultValue={nome}
          placeholder="Mario Rossi"
          autoComplete="name"
          // Chi apre un invito ha un compito solo, e il primo campo è questo.
          autoFocus
        />
        <p className="text-xs text-muted-foreground">
          Comparirà nel registro delle operazioni accanto a ogni tua modifica.
        </p>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="password" className="text-xs font-medium">
          Scegli una password
        </label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          minLength={12}
          autoComplete="new-password"
        />
        <p className="text-xs text-muted-foreground">
          Almeno dodici caratteri. La scegli tu e non l&apos;ha mai vista nessuno: non c&apos;è
          niente da cambiare al primo accesso.
        </p>
      </div>

      {esito && !esito.ok ? (
        <p
          // `role="alert"` perché il messaggio compare dopo un'azione: chi usa un lettore di
          // schermo deve sentirlo senza doverlo andare a cercare.
          role="alert"
          className="flex items-start gap-2 rounded-md border border-scaduta-border bg-scaduta-surface px-3 py-2 text-sm text-scaduta"
        >
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          {esito.errore}
        </p>
      ) : null}

      <Button type="submit" disabled={inCorso} className="w-full">
        {inCorso ? "Attendere…" : "Accetta e crea l'utenza"}
      </Button>
    </form>
  );
}
