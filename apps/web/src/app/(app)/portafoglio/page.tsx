import type { Metadata } from "next";
import { Building2 } from "lucide-react";
import { Vuoto } from "@/components/ui/vuoto";
import { DOMINI, ETICHETTE_DOMINIO } from "@gdpr/engine";
import { portafoglio } from "@/features/portafoglio/dati";
import { Suspense } from "react";
import { TabellaPortafoglio } from "@/components/portafoglio/tabella";
import { NuovaAzienda } from "@/components/portafoglio/nuova-azienda";

export const metadata: Metadata = { title: "Portafoglio" };
export const dynamic = "force-dynamic";

export default async function PaginaPortafoglio() {
  const { righe } = await portafoglio();

  // I totali si calcolano sulle righe già risolte: nessuna seconda formula, nessun secondo
  // giro di query. Se un numero qui non tornasse con la tabella sotto, sarebbe un difetto
  // che il consulente vedrebbe prima di noi.
  const conAssessment = righe.filter((r) => r.conformita !== null);
  const scadute = righe.reduce((n, r) => n + r.scadute, 0);
  const inScadenza = righe.reduce((n, r) => n + r.inScadenza, 0);
  const moduliAttivi = righe.reduce((n, r) => n + r.moduli.filter((m) => m.attivo).length, 0);

  return (
    <div className="mx-auto max-w-[1600px] px-6 py-7">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">Portafoglio</p>
          <h1 className="titolo mt-1.5 text-titolo">Aziende assistite</h1>
          <p className="mt-1.5 max-w-prose text-sm text-muted-foreground">
            Una riga per azienda, una colonna per decreto. La percentuale è la conformità effettiva: fatto{" "}
            <em>e</em> ancora valido.
          </p>
        </div>
        <NuovaAzienda />
      </header>

      {righe.length > 0 ? (
        <div
          className="mt-5 grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2 lg:grid-cols-4"
          data-tour="indicatori-portafoglio"
        >
          <Indicatore
            valore={String(righe.length)}
            etichetta="aziende in portafoglio"
            nota={`${moduliAttivi} moduli attivi su ${righe.length * DOMINI.length} possibili`}
          />
          <Indicatore
            valore={scadute > 0 ? String(scadute) : "0"}
            etichetta="scadenze mancate"
            nota="sull'intero portafoglio"
            tinta={scadute > 0 ? "text-scaduta" : undefined}
          />
          <Indicatore
            valore={inScadenza > 0 ? String(inScadenza) : "0"}
            etichetta="in scadenza entro 30 giorni"
            nota="sull'intero portafoglio"
            tinta={inScadenza > 0 ? "text-imminente" : undefined}
          />
          <Indicatore
            valore={conAssessment.length > 0 ? `${mediana(conAssessment)}%` : "—"}
            etichetta="conformità mediana"
            nota={
              conAssessment.length > 0
                ? `su ${conAssessment.length} aziende avviate`
                : "nessuna azienda avviata"
            }
          />
        </div>
      ) : null}

      <div className="mt-3">{righe.length === 0 ? (
          <VuotoPortafoglio />
        ) : (
          // Come assessment e scadenzario: la tabella legge i filtri dall indirizzo con
          // `useSearchParams`, che vuole un confine di sospensione attorno.
          <Suspense fallback={<p className="text-sm text-muted-foreground">Caricamento…</p>}>
            <TabellaPortafoglio righe={righe} />
          </Suspense>
        )}</div>
    </div>
  );
}

function Indicatore({
  valore,
  etichetta,
  nota,
  tinta,
}: {
  valore: string;
  etichetta: string;
  nota: string;
  tinta?: string | undefined;
}) {
  return (
    <div className="bg-surface px-4 py-3">
      <p className={`cifra text-cifra-sm leading-none ${tinta ?? ""}`}>{valore}</p>
      <p className="mt-1.5 text-xs text-muted-foreground">{etichetta}</p>
      <p className="mt-0.5 text-micro text-muted-foreground">{nota}</p>
    </div>
  );
}

/**
 * Mediana e non media: con quaranta aziende, tre appena avviate allo 0% trascinerebbero giù
 * una media che descrive male il portafoglio. La mediana dice dove sta il cliente tipico.
 */
function mediana(righe: readonly { conformita: { percentuale: number | null } | null }[]): number {
  const valori = righe
    .map((r) => r.conformita?.percentuale)
    .filter((v): v is number => v !== null && v !== undefined)
    .sort((a, b) => a - b);
  if (valori.length === 0) return 0;
  const meta = Math.floor(valori.length / 2);
  return valori.length % 2 === 1 ? valori[meta]! : Math.round((valori[meta - 1]! + valori[meta]!) / 2);
}

function VuotoPortafoglio() {
  return (
    <Vuoto icona={Building2} titolo="Il portafoglio è vuoto" azione={<NuovaAzienda />}>
      Aggiungi la prima azienda assistita. Scegliendo i moduli, gli adempimenti dei decreti
      selezionati vengono creati subito: {DOMINI.map((d) => ETICHETTE_DOMINIO[d].breve).join(", ")}.
    </Vuoto>
  );
}
