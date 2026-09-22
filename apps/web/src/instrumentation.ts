import type { Instrumentation } from "next";
import { normalizzaPercorso, segnala, spogliaErrore } from "@/lib/telemetria";

// IL GANCIO DEGLI ERRORI DEL SERVER, che prima non esisteva.
//
// `onRequestError` è l'unico punto in cui Next consegna gli errori di **Server Component,
// Route Handler, Server Action e middleware insieme**, indipendentemente da qualunque
// confine di render. In un'applicazione che fa quasi tutto lato server è quasi tutto.
//
// Prima di questo file un 500 su una rotta che nessuno guarda non lasciava traccia da
// nessuna parte: l'istanza risultava «viva» e rispondeva male, e lo si scopriva dal cliente.
//
// STA IN `src/`, E NON NELLA RADICE DELL'APPLICAZIONE.
//
// Next cerca questo file accanto alle cartelle `app/` e `pages/`: in un progetto con la
// cartella `src/` il posto giusto e' `src/instrumentation.ts`. Messo nella radice non da'
// alcun errore — non viene semplicemente caricato, e con lui non esistono ne' il gancio
// degli errori ne' il drenatore della posta.
//
// Si e' visto solo perche' la coda della posta non si svuotava: nei log non compariva una
// riga del drenatore, che avrebbe dovuto scrivere al primo giro. Un file nel posto sbagliato
// e' silenzioso, esattamente come il `.dockerignore` in `deploy/` di una fase precedente.
//
// `register()` gira una volta all'avvio del processo. Serve anche a dichiarare il file a
// Next, che senza questo export non carica nemmeno `onRequestError`.
export async function register(): Promise<void> {
  // SOLO NEL PROCESSO NODE, e solo su un'istanza che sta in piedi.
  //
  // Il runtime edge non ha accesso al database, e su Vercel ogni invocazione e' un processo
  // nuovo: un intervallo li' non sopravvivrebbe alla richiesta che lo ha creato. La vetrina
  // infatti non manda posta, e questa e' la riga che lo rende vero invece che sperato.
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  // Durante `next build` ogni modulo viene caricato per raccogliere i dati delle pagine: un
  // drenatore avviato li' cercherebbe un database che in build non esiste.
  if (process.env.NEXT_PHASE === "phase-production-build") return;

  // L'importazione e' dinamica per la stessa ragione per cui il client del database e'
  // pigro: caricare `@/lib/posta` all'importazione di questo file tirerebbe dentro Drizzle
  // anche dove non serve.
  const { drena } = await import("@/lib/posta");

  const svuota = async () => {
    try {
      const { inviate, fallite } = await drena();
      if (inviate || fallite) {
        console.info(JSON.stringify({ livello: "posta", inviate, fallite }));
      }
    } catch (errore) {
      // Il drenatore non deve MAI far cadere il processo: e' un lavoro di sfondo, e un
      // database momentaneamente irraggiungibile non e' una ragione per spegnere il server.
      const { spogliaErrore } = await import("@/lib/telemetria");
      console.error(JSON.stringify({ livello: "errore", origine: "drenatore", ...spogliaErrore(errore) }));
    }
  };

  // Trenta secondi: abbastanza perche' un recupero password arrivi mentre l'utente guarda
  // ancora la casella, abbastanza poco perche' una coda non cresca senza che nessuno se ne
  // accorga. `unref()` non tiene sveglio il processo: se Node non ha altro da fare, esce.
  setInterval(svuota, 30_000).unref();
  void svuota();
}

export const onRequestError: Instrumentation.onRequestError = (errore, richiesta, contesto) => {
  const { tipo, messaggio, traccia } = spogliaErrore(errore);

  // DELLA RICHIESTA SI TIENE SOLO IL PERCORSO NORMALIZZATO E IL METODO.
  //
  // Non le intestazioni — ci sono i cookie di sessione. Non la stringa di ricerca — in un
  // `POST /clienti?q=rossi` il dato sta lì. Non il corpo, che in una server action è il
  // contenuto che l'utente ha appena scritto.
  segnala({
    tipo,
    messaggio,
    traccia,
    percorso: normalizzaPercorso(richiesta.path),
    metodo: richiesta.method,
    // `routerKind` e `routePath` dicono quale rotta ha fallito senza dire con quali dati.
    rotta: `${contesto.routerKind}:${contesto.routePath}`,
    istante: new Date().toISOString(),
  });
};
