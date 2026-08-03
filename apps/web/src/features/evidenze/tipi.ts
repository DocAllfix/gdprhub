// Il tipo e le funzioni pure delle evidenze, separati dalla lettura.
//
// `dati.ts` importa il guard, che importa `next/headers`: un componente client che avesse
// bisogno del solo tipo si trascinerebbe dietro tutto il server e la build fallirebbe. Qui
// non c'è niente che tocchi la richiesta, quindi questo modulo lo può leggere chiunque.

export type Evidenza = {
  readonly id: string;
  readonly nomeFile: string;
  readonly mime: string;
  readonly dimensione: number;
  readonly hashSha256: string;
  readonly versione: number;
  readonly validoDal: string | null;
  readonly validoAl: string | null;
  readonly caricatoIl: Date;
  readonly caricatoDa: string | null;
};

/** Formato leggibile della dimensione. In italiano, con la virgola. */
export function pesoLeggibile(byte: number): string {
  if (byte < 1024) return `${byte} B`;
  if (byte < 1024 * 1024) return `${Math.round(byte / 1024)} kB`;
  return `${(byte / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
}
