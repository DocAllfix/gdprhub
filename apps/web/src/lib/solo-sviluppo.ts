import { notFound } from "next/navigation";

// CIÒ CHE NON DEVE ESISTERE SU UN'ISTANZA CLIENTE.
//
// Alcune parti del progetto servono a noi e non al cliente: le anteprime di forma sotto
// `/varianti`, la pagina `/design`, lo spike PDF della Fase 0, i prototipi di documento, la
// rotta di pulizia del collaudo. Nessuna di queste è protetta da un guard — e alcune non
// possono esserlo, perché servono proprio a guardare il prodotto senza autenticarsi.
//
// Finché l'applicazione girava solo sulla vetrina la cosa era discutibile. Su una macchina
// venduta a uno studio legale non lo è:
//
//   · `/api/spike-pdf` avvia un CHROMIUM a ogni richiesta anonima e rende un documento di
//     centosettantuno adempimenti. Duecento richieste in parallelo saturano CPU e memoria di
//     una VPS, e non c'è limitatore davanti. In più, fallendo, restituisce il messaggio
//     d'errore per intero: percorsi del filesystem compresi.
//   · `/prototipi/[documento]` fa lo stesso, con quattro documenti al posto di uno.
//   · `/design` e `/varianti` non espongono dati di clienti — usano il dataset dimostrativo
//     del motore — ma regalano a chiunque il catalogo completo del prodotto e il sistema di
//     design, che sono l'asset commerciale.
//
// LA CHIUSURA È `notFound()` E NON UN 403. Un 403 conferma che la rotta esiste; un 404 dice
// che non c'è niente, ed è la verità: su un'istanza cliente quella rotta non esiste.
//
// Si decide dall'ambiente e non da una variabile dedicata: una variabile in più è una
// variabile che qualcuno può impostare male su una macchina che non controlliamo, e il
// difetto D4 di questa fase era esattamente una configurazione che non arrivava a
// destinazione. `NODE_ENV` in produzione vale `production` e basta.
//
// In sviluppo e sulla vetrina non cambia niente: tutto resta raggiungibile come prima.

/**
 * Fa sparire la rotta chiamante quando l'istanza gira in produzione.
 *
 * Va invocata come **prima** istruzione del gestore, prima di qualunque lavoro: il punto è
 * non avviare Chromium, non leggere il database e non costruire niente.
 */
export function soloFuoriProduzione(): void {
  if (process.env.NODE_ENV === "production") notFound();
}
