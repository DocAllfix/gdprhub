// Il catalogo dei controlli GDPR, estratto dal prototipo da `scripts/extract-seed.mjs`.
// Non si modifica a mano: si rigenera. `pnpm seed:check` fallisce se i file divergono
// dal prototipo, così il catalogo resta tracciabile alla sua fonte.

import templates from "./control-templates.json" with { type: "json" };
import demo from "./demo-assessment.json" with { type: "json" };
import type { ControlTemplate, Priorita, Ruolo, Stato } from "../types";

/** I 42 controlli del catalogo: 20 Titolare, 10 Responsabile, 12 DPO. */
export const CONTROL_TEMPLATES = templates as readonly ControlTemplate[];

/** Come il prototipo registrava lo stato di un controllo, prima della normalizzazione. */
export type VoceDemo = {
  readonly codice: string;
  readonly stato: string;
  /** Offset in giorni rispetto a oggi, come nel prototipo. Non una data assoluta. */
  readonly scadenzaOffsetGiorni: number;
  readonly priorita: Priorita;
  readonly rischio: number;
};

/**
 * Lo stato del cliente di esempio del prototipo ("Gruppo Industriale Verdi S.p.A.").
 * Serve ai golden test del motore e al seed dimostrativo delle istanze.
 */
export const DEMO_ASSESSMENT = demo as {
  readonly cliente: string;
  readonly fonte: string;
  readonly controlli: readonly VoceDemo[];
};

const perCodice = new Map(CONTROL_TEMPLATES.map((t) => [t.codice, t]));

export function templatePerCodice(codice: string): ControlTemplate | undefined {
  return perCodice.get(codice);
}

export function templatesPerRuolo(ruolo: Ruolo): readonly ControlTemplate[] {
  return CONTROL_TEMPLATES.filter((t) => t.ruolo === ruolo);
}

/**
 * Traduce uno stato del prototipo in uno stato del modello.
 *
 * "In ritardo" non è più uno stato: era la causa del difetto F5 documentato in
 * `docs/01-analisi-prototipo.md`, per cui T14, R04 e D04 risultavano in ritardo pur avendo
 * scadenza futura. Chi era "in ritardo" aveva semplicemente un lavoro non concluso: lo si
 * riporta a "Da fare" e il ritardo lo ricalcola `deadlines.ts` dalla data.
 *
 * Conseguenza voluta e documentata: sul dataset del prototipo i ritardi derivati sono 6,
 * non 9, perché tre dei nove erano incoerenti.
 */
export function normalizzaStatoPrototipo(statoPrototipo: string): Stato {
  switch (statoPrototipo) {
    case "Completata":
      return "Completata";
    case "In corso":
      return "In corso";
    case "In ritardo":
    case "Da fare":
      return "Da fare";
    default:
      throw new Error(`Stato del prototipo non riconosciuto: "${statoPrototipo}"`);
  }
}
