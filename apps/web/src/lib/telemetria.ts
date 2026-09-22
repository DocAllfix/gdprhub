import { env } from "@/lib/env";

// LA TELEMETRIA DEGLI ERRORI, e cosa non deve uscire dall'istanza.
//
// Il prodotto gira su macchine che non controlliamo e che contengono le evidenze di
// conformità di aziende terze. Un'eccezione che si porta dietro il corpo della richiesta è
// un trasferimento di dati personali verso di noi, non un dettaglio tecnico: va dichiarato
// nel DPA ex art. 28 e nel registro ex art. 30.2, e deve poter essere spento per cliente.
//
// Perciò questo modulo fa due cose, in quest'ordine di importanza:
//
//   1. SPOGLIA l'evento di tutto ciò che può contenere dati di persone;
//   2. lo consegna a un driver.
//
// LA SPOLIAZIONE È UNA LISTA DI PERMESSI, NON DI DIVIETI. Un elenco di campi da togliere
// dimentica quello nuovo che qualcuno aggiungerà; un elenco di campi da tenere no. È la
// differenza fra una difesa che invecchia e una che regge.
//
// DUE DRIVER, come per archivio, PDF e database:
//
//   registro  scrive una riga strutturata su stderr. È il predefinito, non chiama nessuno,
//             e i log del contenitore restano sulla macchina del cliente.
//   collettore  invia al GlitchTip centrale. Si accende impostando `SENTRY_DSN`, e senza
//               quella variabile questo ramo non esiste: è la scelta già dichiarata in
//               `env.ts`, «un'istanza che manda tracce a un servizio esterno fa uscire dati
//               dal server del cliente».
//
// Il driver `collettore` arriva con la macchina di controllo. Finché non c'è, puntare a un
// DSN inesistente significherebbe aggiungere una dipendenza per un servizio che non
// risponde: la spoliazione invece serve da subito, ed è la parte che va scritta bene.

/** Un evento pronto a uscire: nessun campo qui dentro può contenere dati di persone. */
export type EventoTelemetria = {
  readonly tipo: string;
  readonly messaggio: string;
  readonly percorso?: string | undefined;
  readonly metodo?: string | undefined;
  readonly rotta?: string | undefined;
  readonly traccia?: string | undefined;
  readonly istante: string;
};

/**
 * Normalizza un percorso sostituendo gli identificativi con un segnaposto.
 *
 * `/azienda/7f3a…/registro/violazione` diventa `/azienda/:id/registro/violazione`.
 *
 * Non è cosmesi: un UUID è un identificativo, e un collettore che raccoglie da più istanze
 * di titolari diversi aggregherebbe percorsi che raccontano chi ha guardato cosa. Con il
 * segnaposto si raggruppano anche gli errori della stessa rotta, che è l'unico motivo per
 * cui si guarda un collettore.
 */
export function normalizzaPercorso(percorso: string): string {
  return percorso
    .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "/:id")
    .replace(/\/\d+/g, "/:n");
}

/**
 * Riduce un errore ai soli campi che possono uscire.
 *
 * Tiene: nome, messaggio, traccia. Scarta tutto il resto — comprese le proprietà che
 * qualcuno appende agli errori per comodità, che sono il posto in cui i dati finiscono
 * senza che nessuno se ne accorga.
 *
 * Il MESSAGGIO è l'unico campo di cui non possiamo garantire la pulizia: un errore del
 * database può contenere il valore che ha violato un vincolo. Si tronca, e soprattutto si
 * toglie tutto ciò che somiglia a un indirizzo di posta o a un codice fiscale.
 */
export function spogliaErrore(errore: unknown): {
  tipo: string;
  messaggio: string;
  traccia?: string | undefined;
} {
  if (!(errore instanceof Error)) {
    return { tipo: "NonErrore", messaggio: spogliaTesto(String(errore)) };
  }
  return {
    tipo: errore.name,
    messaggio: spogliaTesto(errore.message),
    // Le prime righe bastano a capire dove: il resto è rumore di libreria.
    traccia: errore.stack?.split("\n").slice(0, 12).join("\n"),
  };
}

const POSTA = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const FISCALE = /\b[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]\b/gi;
const PARTITA_IVA = /\b\d{11}\b/g;

/** Toglie da un testo libero le forme che identificano una persona o un'azienda. */
export function spogliaTesto(testo: string): string {
  return testo
    .replace(POSTA, "[posta]")
    .replace(FISCALE, "[cf]")
    .replace(PARTITA_IVA, "[piva]")
    .slice(0, 500);
}

/**
 * Consegna un evento. Non lancia mai: un guasto della telemetria non deve diventare un
 * guasto dell'applicazione — sarebbe il colmo, uno strumento di diagnosi che rompe ciò che
 * dovrebbe sorvegliare.
 */
export function segnala(evento: EventoTelemetria): void {
  try {
    if (!env.SENTRY_DSN) {
      // Riga singola e strutturata: si legge con `docker compose logs` e si spedisce a un
      // aggregatore senza doverla analizzare.
      console.error(JSON.stringify({ livello: "errore", ...evento }));
      return;
    }
    // Il driver verso il collettore centrale entra con la Fase E, insieme alla macchina che
    // lo ospita. Fino ad allora si registra comunque, così un'istanza con il DSN impostato
    // non perde gli eventi in silenzio.
    console.error(JSON.stringify({ livello: "errore", destinazione: "collettore", ...evento }));
  } catch {
    // Anche il fallimento della registrazione resta silenzioso.
  }
}
