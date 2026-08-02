"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AlertCircle, Check } from "lucide-react";
import { aggiornaMarchio, type Esito } from "@/features/portafoglio/azioni";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function FormMarchio({ nome, modificabile }: { nome: string; modificabile: boolean }) {
  const router = useRouter();
  const [esito, azione, inCorso] = useActionState<Esito | null, FormData>(aggiornaMarchio, null);

  // La barra laterale mostra il nome dello studio: dopo il salvataggio va aggiornata,
  // altrimenti il campo dice una cosa e l'intestazione un'altra.
  useEffect(() => {
    if (esito?.ok) router.refresh();
  }, [esito, router]);

  return (
    <form action={azione} className="flex flex-wrap items-end gap-2.5" data-tour="marchio">
      <div className="min-w-0 flex-1 space-y-1.5">
        <label htmlFor="brandNome" className="text-xs font-medium">
          Nome dello studio
        </label>
        <Input
          id="brandNome"
          name="brandNome"
          defaultValue={nome}
          required
          disabled={!modificabile}
          className="max-w-sm"
        />
      </div>
      <Button type="submit" disabled={inCorso || !modificabile}>
        {inCorso ? "Salvataggio…" : "Salva"}
      </Button>

      {esito?.ok ? (
        <p role="status" className="flex items-center gap-1.5 text-xs text-regolare">
          <Check className="size-3.5" aria-hidden />
          Salvato.
        </p>
      ) : null}
      {esito && !esito.ok ? (
        <p role="alert" className="flex items-center gap-1.5 text-xs text-scaduta">
          <AlertCircle className="size-3.5" aria-hidden />
          {esito.errore}
        </p>
      ) : null}
      {!modificabile ? (
        <p className="w-full text-xs text-muted-foreground">Solo un amministratore può cambiarlo.</p>
      ) : null}
    </form>
  );
}
