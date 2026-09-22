import { PRODOTTO } from "@/lib/brand";

// I MESSAGGI CHE L'ISTANZA MANDA, in un posto solo.
//
// Sono pochi e devono restare pochi: ogni mail in più è un dato che esce dall'istanza e un
// motivo per cui un filtro antispam può imparare a scartarci.
//
// DUE REGOLE CHE VALGONO PER TUTTI:
//
//   1. TESTO SEMPLICE, HTML facoltativo. Chi legge la posta da un client severo deve
//      capire lo stesso, e un messaggio di recupero password che arriva vuoto è un utente
//      chiuso fuori.
//   2. NESSUN DATO OLTRE IL NECESSARIO. Nel corpo non finiscono nomi di aziende clienti né
//      contenuti di registri: una mail attraversa server che non sono nostri.

type Modello = { oggetto: string; testo: string };

const firma = (studio: string) =>
  `\n\n—\n${studio}\nInviato da ${PRODOTTO.nome}. Non rispondere a questo messaggio.`;

/**
 * Recupero password.
 *
 * Il collegamento è l'unico contenuto. Non si scrive «ciao Mario»: il nome è un dato, e
 * l'utente sa chi è.
 */
export function reimpostaPassword(url: string, studio: string, minuti: number): Modello {
  return {
    oggetto: `Reimposta la password — ${studio}`,
    testo:
      `È stata richiesta la reimpostazione della password per questo indirizzo.\n\n` +
      `Apri questo collegamento entro ${minuti} minuti:\n${url}\n\n` +
      `Se non l'hai chiesta tu, ignora il messaggio: la password non cambia finché il ` +
      `collegamento non viene aperto.` +
      firma(studio),
  };
}

/**
 * Invito di un collega.
 *
 * Chiude la lacuna per cui ogni utenza andava creata da riga di comando sulla VPS: uno
 * studio con quattro persone non può chiamarci a ogni assunzione.
 */
export function invito(url: string, studio: string, ruolo: string, giorni: number): Modello {
  return {
    oggetto: `Invito ad accedere — ${studio}`,
    testo:
      `Sei stato invitato ad accedere allo spazio di ${studio} con il ruolo «${ruolo}».\n\n` +
      `Accetta entro ${giorni} giorni:\n${url}\n\n` +
      `Dopo questo termine l'invito scade e va richiesto di nuovo.` +
      firma(studio),
  };
}

/**
 * Promemoria di scadenza.
 *
 * NON elenca gli adempimenti né le aziende: dice quanti sono e dove guardare. L'elenco sta
 * nell'istanza, dietro l'autenticazione, che è il posto in cui deve restare.
 */
export function promemoriaScadenze(url: string, studio: string, quanti: number): Modello {
  return {
    oggetto: `${quanti} ${quanti === 1 ? "adempimento in scadenza" : "adempimenti in scadenza"} — ${studio}`,
    testo:
      `Ci sono ${quanti} ${quanti === 1 ? "adempimento" : "adempimenti"} in scadenza nei ` +
      `prossimi giorni.\n\nApri lo scadenzario:\n${url}` +
      firma(studio),
  };
}
