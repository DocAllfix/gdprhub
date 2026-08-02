import type { Adempimento, AdempimentoTemplate, Priorita, StatoLavoro } from "./types";
import { type DataISO, piuGiorni, piuMesi } from "./deadlines";

// Il cliente dimostrativo, ricostruito dagli stati di esempio dei tre prototipi.
//
// I prototipi esprimevano lo stato in modi diversi e con date che invecchiano: il GDPR con
// scostamenti in giorni, il 231 con date assolute del 2025-2026, l'81/08 con un'ultima
// esecuzione generata da una regola sull'indice. L'estrattore li ha portati tutti a
// scostamenti; qui si trasformano in adempimenti veri rispetto a una data di riferimento.
//
// Nessuna data assoluta è congelata da nessuna parte: passando `oggi`, il cliente
// dimostrativo resta sensato per sempre.

/** Come l'estrattore descrive lo stato di un adempimento nel cliente di esempio. */
export type VoceDemo = {
  readonly codice: string;
  readonly stato: StatoLavoro;
  readonly priorita: Priorita;
  readonly rischio: number | null;
  /** GDPR e 231: scadenza espressa come scostamento in giorni. */
  readonly scadenzaOffsetGiorni?: number;
  /** 81/08: ultima esecuzione espressa come scostamento all'indietro. `null` se mai eseguito. */
  readonly ultimaEsecuzione?: { readonly mesiFa: number; readonly piuGiorni: number } | null;
};

export type StatoDemo = {
  readonly fonte: string;
  readonly riferimentoDedotto?: string;
  readonly controlli: readonly VoceDemo[];
};

/**
 * Costruisce gli adempimenti del cliente dimostrativo a partire da catalogo e stato.
 *
 * Per i periodici con scadenza nota si ricava a ritroso l'ultima esecuzione, così che il
 * dato rispetti il modello unificato invece di portarsi dietro una scadenza scritta a mano:
 * se un adempimento annuale scade fra 30 giorni, l'ultima esecuzione è di 11 mesi fa.
 */
export function costruisciDemo(
  templates: readonly AdempimentoTemplate[],
  stato: StatoDemo,
  oggi: DataISO,
): readonly Adempimento[] {
  const perCodice = new Map(stato.controlli.map((c) => [c.codice, c]));

  return templates.map((t): Adempimento => {
    const v = perCodice.get(t.codice);
    if (!v) throw new Error(`Il cliente dimostrativo non copre l'adempimento ${t.codice}.`);

    const base = {
      codice: t.codice,
      dominio: t.dominio,
      categoria: t.categoria,
      ruolo: t.ruolo,
      stato: v.stato,
      priorita: v.priorita,
      rischio: v.rischio ?? t.rischioDefault,
      periodicita: t.periodicita,
    };

    // 81/08: l'ultima esecuzione è il dato primario, la scadenza si deriva.
    if (v.ultimaEsecuzione !== undefined) {
      const u = v.ultimaEsecuzione;
      return {
        ...base,
        ultimaEsecuzione: u ? piuGiorni(piuMesi(oggi, -u.mesiFa), u.piuGiorni) : null,
        scadenzaEsplicita: null,
      };
    }

    // GDPR e 231: si conosce la scadenza. Per i periodici la si converte in ultima
    // esecuzione, che è il dato primario del modello; per gli altri resta esplicita.
    const scadenza = v.scadenzaOffsetGiorni !== undefined ? piuGiorni(oggi, v.scadenzaOffsetGiorni) : null;

    if (t.periodicita.tipo === "periodica" && scadenza) {
      return { ...base, ultimaEsecuzione: piuMesi(scadenza, -t.periodicita.mesi), scadenzaEsplicita: null };
    }
    return { ...base, ultimaEsecuzione: null, scadenzaEsplicita: scadenza };
  });
}
