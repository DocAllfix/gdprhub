import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// LO STATO VUOTO, UNO SOLO.
//
// Prima di questo file c'erano circa ventidue punti in cui un elenco può svuotarsi e cinque
// forme diverse per dirlo, con tre copie letterali della stessa funzione `Vuoto()` in tre
// pagine — che nel frattempo avevano già preso a divergere (una `rounded-lg`, l'altra
// `rounded-md`). DESIGN.md ha una regola apposta: «il segnaposto è parte del design, non un
// ripiego».
//
// LA FORMA È QUELLA CHE C'ERA GIÀ nei casi curati, non un'invenzione: icona, titolo,
// spiegazione, e un'azione quando ce n'è una da offrire. Il filetto tratteggiato resta,
// perché è l'unico posto del prodotto dove il bordo dice qualcosa — «qui non c'è niente, ma
// potrebbe esserci» — invece di contenere.
//
// DUE REGOLE, che i casi deboli violavano:
//
//   1. UN VUOTO SPIEGA PERCHÉ È VUOTO. «Nessun dato» non è uno stato vuoto, è l'assenza di
//      uno stato vuoto. Chi apre un registro senza voci deve sapere se è normale.
//   2. UN VUOTO DA FILTRO NOMINA I FILTRI E OFFRE DI TOGLIERLI. È lo stato vuoto più frequente
//      in una sessione di lavoro, ed era sempre senza azione — con il pulsante «Azzera» a cento
//      pixel di distanza, fuori dal campo visivo di chi sta guardando la tabella vuota.
//
// Server-safe di proposito: l'azione arriva già costruita dal chiamante, così questo
// componente non diventa un componente client solo per ospitare un `onClick`.

type Props = {
  icona: LucideIcon;
  titolo: string;
  /** Perché è vuoto. Obbligatorio: è la regola 1. */
  children: React.ReactNode;
  /** Cosa si può fare. Facoltativa, ma se esiste un passo successivo va offerto qui. */
  azione?: React.ReactNode;
  /** Il livello del titolo dipende da dove sta: una pagina vuota ha un h1, una sezione un h2. */
  livello?: "h1" | "h2" | "h3";
  /**
   * `pannello`: riquadro autonomo, con il filetto tratteggiato.
   * `riga`: dentro una tabella o un pannello che ha già il suo contorno — niente filetto,
   * meno aria, perché un contorno dentro un contorno è il reticolo che «quieto» ha tolto.
   */
  variante?: "pannello" | "riga";
  className?: string;
};

export function Vuoto({
  icona: Icona,
  titolo,
  children,
  azione,
  livello = "h2",
  variante = "pannello",
  className,
}: Props) {
  const Titolo = livello;
  return (
    <div
      className={cn(
        "text-center",
        variante === "pannello"
          ? "rounded-lg border border-dashed border-border-strong bg-surface px-6 py-14"
          : "px-6 py-10",
        className,
      )}
    >
      {/* L'icona è un elemento non testuale: WCAG le chiede 3:1, non 4,5. Per questo può
          stare nel tono più tenue, che sul testo invece non passa. */}
      <Icona className="mx-auto size-6 text-faint-foreground" aria-hidden />
      <Titolo className="mt-3 text-sm font-semibold">{titolo}</Titolo>
      <div className="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-muted-foreground">
        {children}
      </div>
      {azione ? <div className="mt-5 flex flex-wrap justify-center gap-2">{azione}</div> : null}
    </div>
  );
}

/**
 * Il vuoto prodotto dai filtri, non dai dati. Nomina ciò che sta escludendo — «nessun
 * adempimento corrisponde» non basta, perché chi guarda la tabella vuota ha spesso
 * dimenticato di aver filtrato — e porta con sé l'azione per togliere i filtri.
 */
export function VuotoFiltro({
  icona,
  filtri,
  azzera,
  variante = "riga",
}: {
  icona: LucideIcon;
  /** Descrizioni leggibili dei filtri attivi: «scadenza: Scaduta», «testo: "DPIA"». */
  filtri: readonly string[];
  /** Il pulsante che azzera, già costruito dal chiamante. */
  azzera: React.ReactNode;
  variante?: "pannello" | "riga";
}) {
  return (
    <Vuoto icona={icona} titolo="Nessun risultato con questi filtri" azione={azzera} variante={variante}>
      {filtri.length > 0 ? (
        <>
          Stai guardando solo{" "}
          {filtri.map((f, i) => (
            <span key={f}>
              {i > 0 ? (i === filtri.length - 1 ? " e " : ", ") : null}
              <strong className="font-medium text-foreground">{f}</strong>
            </span>
          ))}
          .
        </>
      ) : (
        "I filtri attivi escludono tutte le righe."
      )}
    </Vuoto>
  );
}
