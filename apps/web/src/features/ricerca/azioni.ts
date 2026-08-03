"use server";

import { cerca, type Risultato } from "./dati";

/**
 * La ricerca, chiamabile dalla palette.
 *
 * Gira sul server perché l'indice è grande: con quaranta aziende per tre moduli sono
 * settemila voci, e mandarle al browser a ogni apertura sarebbe mezzo megabyte per una
 * ricerca che spesso finisce dopo tre caratteri.
 */
export async function cercaGlobale(query: string): Promise<readonly Risultato[]> {
  return cerca(query);
}
