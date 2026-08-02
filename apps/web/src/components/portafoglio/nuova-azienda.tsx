"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Plus } from "lucide-react";
import { DOMINI, ETICHETTE_DOMINIO } from "@gdpr/engine";
import { creaAzienda, type Esito } from "@/features/portafoglio/azioni";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";

// La nuova azienda entra da un pannello laterale, non da una finestra modale: il consulente
// che sta guardando il portafoglio non deve perderlo di vista mentre aggiunge una riga.
//
// Il modulo chiede POCO. Ragione sociale e moduli bastano ad aprire il lavoro; partita IVA,
// fatturato e dipendenti servono alle stime sanzionatorie e si aggiungono quando servono.
// Un form di quindici campi obbligatori è il modo più efficace per non far entrare mai il
// primo cliente.

const CAMPI = [
  { nome: "settore", etichetta: "Settore", segnaposto: "Metalmeccanico" },
  { nome: "sede", etichetta: "Sede legale", segnaposto: "Via …, Bologna (BO)" },
  { nome: "piva", etichetta: "Partita IVA", segnaposto: "01234567890", inputMode: "numeric" as const },
  { nome: "ateco", etichetta: "Codice ATECO", segnaposto: "25.62.00" },
  {
    nome: "numeroDipendenti",
    etichetta: "Dipendenti",
    segnaposto: "87",
    inputMode: "numeric" as const,
  },
  {
    nome: "fatturatoAnnuo",
    etichetta: "Fatturato annuo (€)",
    segnaposto: "12400000",
    inputMode: "numeric" as const,
  },
] as const;

export function NuovaAzienda() {
  const router = useRouter();
  const [aperto, setAperto] = useState(false);
  const [esito, azione, inCorso] = useActionState<Esito | null, FormData>(creaAzienda, null);

  // React azzera il modulo quando l'azione ritorna, anche se ritorna un errore. I campi
  // ripartono quindi da `defaultValue`, e `defaultValue` è ciò che l'azione ha rimandato
  // indietro: chi sbaglia una cifra della partita IVA ritrova quello che aveva scritto.
  const precedenti = esito && !esito.ok ? esito : null;
  const valore = (campo: string) => precedenti?.valori?.[campo] ?? "";
  const spuntato = (d: string) => (precedenti?.moduli ? precedenti.moduli.includes(d) : true);

  // Riuscita la creazione si va sulla scheda: la navigazione smonta il pannello, quindi
  // non serve chiuderlo a mano. Il consulente che ha appena creato un'azienda vuole vederla,
  // non tornare a un elenco in cui cercarla.
  useEffect(() => {
    if (esito?.ok && esito.id) {
      router.push(`/azienda/${esito.id}`);
      router.refresh();
    }
  }, [esito, router]);

  return (
    <>
      <Button onClick={() => setAperto(true)} data-tour="nuova-azienda" size="sm">
        <Plus className="size-4" aria-hidden />
        Nuova azienda
      </Button>

      <Sheet open={aperto} onOpenChange={setAperto}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Nuova azienda</SheetTitle>
            <SheetDescription>
              I moduli selezionati vengono popolati subito con gli adempimenti del catalogo.
            </SheetDescription>
          </SheetHeader>

          <form action={azione} className="space-y-5 px-4 pb-6">
            <div className="space-y-1.5">
              <label htmlFor="nome" className="text-xs font-medium">
                Ragione sociale <span className="text-scaduta">*</span>
              </label>
              <Input
                id="nome"
                name="nome"
                required
                autoFocus
                defaultValue={valore("nome")}
                placeholder="Rossi Manifatture S.r.l."
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {CAMPI.map((c) => (
                <div key={c.nome} className="space-y-1.5">
                  <label htmlFor={c.nome} className="text-xs font-medium">
                    {c.etichetta}
                  </label>
                  <Input
                    id={c.nome}
                    name={c.nome}
                    defaultValue={valore(c.nome)}
                    placeholder={c.segnaposto}
                    {...("inputMode" in c ? { inputMode: c.inputMode } : {})}
                  />
                </div>
              ))}
            </div>

            <fieldset className="space-y-2">
              <legend className="text-xs font-medium">Moduli da attivare</legend>
              <p className="text-xs text-muted-foreground">
                Si possono cambiare in qualsiasi momento. Un modulo non attivo non compare nell&apos;azienda:
                una PMI senza modello 231 non deve vedere 65 adempimenti che non la riguardano.
              </p>
              <div className="space-y-1.5 pt-1">
                {DOMINI.map((d) => (
                  <label key={d} className="flex items-start gap-2.5 text-sm">
                    <input
                      type="checkbox"
                      name={`modulo-${d}`}
                      defaultChecked={spuntato(d)}
                      className="mt-0.5 size-4 accent-primary"
                    />
                    <span>
                      <span className="font-medium">{ETICHETTE_DOMINIO[d].breve}</span>
                      <span className="ml-1.5 text-xs text-muted-foreground">
                        {ETICHETTE_DOMINIO[d].esteso}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            {esito && !esito.ok ? (
              <p role="alert" className="flex items-start gap-1.5 text-xs text-scaduta">
                <AlertCircle className="mt-px size-3.5 shrink-0" aria-hidden />
                {esito.errore}
              </p>
            ) : null}

            <div className="flex gap-2">
              <Button type="submit" disabled={inCorso}>
                {inCorso ? "Creazione…" : "Crea azienda"}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setAperto(false)}>
                Annulla
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </>
  );
}
