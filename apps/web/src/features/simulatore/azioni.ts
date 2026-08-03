"use server";

import { proietta, type Proiezione } from "./dati";

// La proiezione, chiamabile dal pannello.
//
// È una `"use server"` di sola lettura, e vale la pena dirlo perché è insolito: un'azione
// che non muta nulla di solito è una query. Qui serve perché il calcolo deve avvenire sul
// server — gli adempimenti sono centosettantuno e il motore vive lì — ma il risultato
// cambia a ogni casella che l'utente spunta, quindi non può essere una proprietà della
// pagina.
//
// Il guard sta dentro `proietta`, che riverifica l'appartenenza allo studio: l'identificativo
// dell'azienda arriva dal client, e un id indovinato non è un'autorizzazione.

export async function simula(aziendaId: string, codici: readonly string[]): Promise<Proiezione | null> {
  return proietta(aziendaId, codici);
}
