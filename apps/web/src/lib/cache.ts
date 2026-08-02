import { revalidateTag, unstable_cache } from "next/cache";

// Cache dei calcoli pesanti, invalidata dalle scritture.
//
// IL PROBLEMA. Portafoglio, cruscotto e scadenzario leggono TUTTI gli adempimenti di tutte
// le aziende — con dodici clienti sono duemila righe — e li passano al motore. Il calcolo è
// puro e veloce; il costo è il viaggio verso il database, ripetuto a ogni caricamento anche
// quando nessuno ha cambiato niente. Un consulente che passa dal portafoglio allo
// scadenzario e torna indietro paga tre volte la stessa lettura.
//
// LA REGOLA. Si mette in cache il CALCOLO, mai la sessione. La chiave porta sempre
// l'organizzazione: se un giorno un'istanza ne ospitasse due, i dati non possono passare da
// una all'altra per una svista di chiavi. L'autenticazione resta fuori e si rifà a ogni
// richiesta, perché è l'unica cosa che non deve mai essere vecchia.
//
// L'INVALIDAZIONE È ESPLICITA. Ogni azione che scrive chiama `invalidaDati`. Una cache che
// si affida solo alla scadenza mostrerebbe al consulente lo stato di due minuti fa subito
// dopo che l'ha cambiato lui, ed è il modo più veloce per fargli perdere fiducia nei numeri.

/** Etichetta unica dei dati di uno studio. */
const etichetta = (organizationId: string) => `dati:${organizationId}`;

/**
 * Mette in cache una lettura pesante, per studio.
 *
 * `chiave` distingue le diverse letture dello stesso studio (portafoglio, cruscotto,
 * scadenzario). La durata è un tetto di sicurezza, non il meccanismo: la freschezza la
 * garantisce l'invalidazione esplicita.
 */
export function inCache<T>(
  organizationId: string,
  chiave: string,
  leggi: () => Promise<T>,
  durataSecondi = 300,
): Promise<T> {
  return unstable_cache(leggi, [chiave, organizationId], {
    tags: [etichetta(organizationId)],
    revalidate: durataSecondi,
  })();
}

/** Da chiamare in OGNI azione che scrive. Dimenticarla significa mostrare dati vecchi. */
export function invalidaDati(organizationId: string): void {
  // Next 16 chiede un profilo di scadenza esplicito: `max` significa «subito, e per tutti».
  // Su una modifica fatta dal consulente non esiste una latenza accettabile: se cambia uno
  // stato e ricaricando vede ancora il vecchio, smette di fidarsi dei numeri.
  revalidateTag(etichetta(organizationId), "max");
}
