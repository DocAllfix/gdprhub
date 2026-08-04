"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { HelpCircle } from "lucide-react";
import { segnaTourVisto } from "@/features/tour/azioni";
import { TOUR, tourPerChiave, type Tour } from "@/lib/tour/passi";
import { cn } from "@/lib/utils";

// LA GUIDA.
//
// Si apre da sola la prima volta su una schermata, e poi si richiama dal punto interrogativo
// nella barra. Nessuno riguarda un tour che si è saltato: se non c'è un comando visibile per
// riaprirlo, saltarlo equivale a cancellarlo.
//
// `prefers-reduced-motion` È RISPETTATO, e non per spuntare una casella: un riquadro che
// scorre da un elemento all'altro su chi soffre di disturbi vestibolari provoca nausea vera.
// Con la preferenza attiva il riquadro salta di posizione senza animazione.
//
// driver.js si carica SOLO QUANDO SERVE, con un import dinamico. È una libreria che la
// maggior parte delle sessioni non aprirà mai, e metterla nel bundle di ogni pagina
// significherebbe farla scaricare a tutti per servire i primi cinque minuti di alcuni.

/** Quale tour appartiene alla schermata corrente. */
function tourDelPercorso(percorso: string): Tour | undefined {
  if (percorso.startsWith("/scadenzario")) return tourPerChiave("scadenzario");
  if (percorso.startsWith("/portafoglio")) return tourPerChiave("portafoglio");
  if (/^\/azienda\/[^/]+\/relazioni/.test(percorso)) return tourPerChiave("relazioni");
  if (/^\/azienda\/[^/]+\/[^/]+/.test(percorso)) return tourPerChiave("assessment");
  if (/^\/azienda\/[^/]+$/.test(percorso)) return tourPerChiave("azienda");
  return undefined;
}

export function Guida({ visti }: { visti: Record<string, number> }) {
  const percorso = usePathname();
  const [inCorso, setInCorso] = useState(false);
  // Ciò che si è già aperto in QUESTA sessione di pagina: senza, tornando indietro il tour
  // ripartirebbe da capo prima che il server abbia registrato la visita.
  const apertiOra = useRef(new Set<string>());

  const tour = tourDelPercorso(percorso ?? "");

  const avvia = useCallback(
    async (quale: Tour) => {
      if (inCorso) return;
      setInCorso(true);
      apertiOra.current.add(quale.chiave);

      const { driver } = await import("driver.js");
      // Il foglio di stile della libreria arriva con lei: importarlo in cima farebbe
      // scaricare il CSS a chi il tour non lo apre mai.
      await import("driver.js/dist/driver.css");

      const ridotto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      const passi = quale.passi
        .filter((p) => !p.ancora || document.querySelector(`[data-tour="${p.ancora}"]`))
        .map((p) => ({
          ...(p.ancora ? { element: `[data-tour="${p.ancora}"]` } : {}),
          popover: { title: p.titolo, description: p.testo },
        }));

      // Se sulla schermata non c'è nemmeno un ancoraggio — capita se la pagina è vuota,
      // per esempio un portafoglio senza aziende — il tour non si apre: illuminare il nulla
      // e raccontare cosa ci sarebbe è peggio che tacere.
      if (passi.length === 0) {
        setInCorso(false);
        return;
      }

      const g = driver({
        // LA CLASSE CHE PORTA IL POPOVER DENTRO IL NOSTRO REGISTRO.
        //
        // Senza, driver.js usa il proprio tema predefinito: fondo bianco puro, angoli
        // stretti, pulsanti azzurri con l'ombreggiatura del testo. Su un prodotto che ha
        // scelto la propria forma attraverso sette giri di confronto, è un pezzo di
        // un'altra applicazione incollato sopra — e si vede subito, perché la guida è
        // proprio il momento in cui si sta guardando con attenzione.
        //
        // Lo stile sta in `globals.css`, non qui: è l'unico modo di scriverlo in token.
        popoverClass: "guida-popover",
        showProgress: passi.length > 1,
        animate: !ridotto,
        overlayOpacity: 0.55,
        nextBtnText: "Avanti",
        prevBtnText: "Indietro",
        doneBtnText: "Ho capito",
        progressText: "{{current}} di {{total}}",
        steps: passi,
        onDestroyed: () => {
          setInCorso(false);
          // Si registra anche se il tour è stato chiuso a metà: chi l'ha interrotto l'ha
          // visto abbastanza da decidere che non gli serviva, e riproporglielo a ogni
          // visita è il modo migliore per fargli odiare il prodotto.
          void segnaTourVisto(quale.chiave);
        },
      });
      g.drive();
    },
    [inCorso],
  );

  // La prima volta si apre da solo. La versione conta: se il testo cambia perché la
  // schermata è cambiata, chi l'aveva già visto lo rivede una volta sola.
  useEffect(() => {
    if (!tour) return;
    if ((visti[tour.chiave] ?? 0) >= tour.versione) return;
    if (apertiOra.current.has(tour.chiave)) return;
    // Un istante di attesa: la schermata deve aver finito di disegnarsi, altrimenti gli
    // ancoraggi non ci sono ancora e il tour si apre monco.
    const t = setTimeout(() => void avvia(tour), 900);
    return () => clearTimeout(t);
  }, [tour, visti, avvia]);

  const disponibili = TOUR.filter((t) => t.chiave === tour?.chiave);

  return (
    <button
      type="button"
      onClick={() => tour && void avvia(tour)}
      disabled={!tour || inCorso}
      data-tour="guida"
      // IL CANCELLO NON CLICCA QUESTO. Aprirebbe il velo di driver.js, che copre la pagina
      // e intercetta ogni clic successivo: la spazzata si fermerebbe lì e riporterebbe
      // decine di comandi «irraggiungibili» che invece funzionano benissimo.
      //
      // Non è un pulsante che nessuno verifica: il tour ha il suo cancello, che legge i
      // sorgenti e fallisce se un passo punta a un ancoraggio inesistente — difetto che
      // driver.js non segnala, perché salta il passo in silenzio.
      data-cancello="salta"
      aria-label={tour ? `Guida · ${tour.nome}` : "Guida non disponibile su questa schermata"}
      title={tour ? `Guida · ${tour.nome}` : "Nessuna guida per questa schermata"}
      className={cn(
        "rounded-md p-1.5 text-sidebar-muted hover:bg-sidebar-selected hover:text-sidebar-foreground",
        (!tour || inCorso) && "opacity-40",
      )}
    >
      <HelpCircle className="size-4" aria-hidden />
      <span className="sr-only">{disponibili.length > 0 ? disponibili[0]?.nome : "Guida"}</span>
    </button>
  );
}
