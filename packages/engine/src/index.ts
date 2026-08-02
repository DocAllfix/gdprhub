// @gdpr/engine — motore di calcolo della suite di compliance.
//
// Unica fonte di verità di formule, soglie e giudizi per i tre domini (GDPR, D.Lgs 231/01,
// D.Lgs 81/08). Cruscotti, scadenzario, relazioni, simulatore e import leggono da qui:
// nessun calcolo duplicato altrove nel sistema.
//
// Vincoli di questo pacchetto, verificati in CI:
//   - zero dipendenze a runtime
//   - zero I/O: niente rete, niente filesystem, niente database
//   - funzioni pure: stesso input, stesso output, sempre
//   - non legge mai l'orologio: `oggi` è sempre un parametro

// --- Nucleo comune ---------------------------------------------------------------------
export * from "./core/types";
export * from "./core/deadlines";
export * from "./core/recurrence";
export * from "./core/compliance";
export { costruisciDemo } from "./core/demo";
export type { StatoDemo, VoceDemo } from "./core/demo";

// --- Cataloghi per dominio -------------------------------------------------------------
import { TEMPLATES as GDPR_TEMPLATES, DEMO as GDPR_DEMO } from "./gdpr";
import { TEMPLATES as D231_TEMPLATES, DEMO as D231_DEMO } from "./d231";
import { TEMPLATES as D81_TEMPLATES, DEMO as D81_DEMO } from "./d81";
import type { AdempimentoTemplate, Dominio } from "./core/types";
import type { StatoDemo } from "./core/demo";

export { GDPR_TEMPLATES, D231_TEMPLATES, D81_TEMPLATES, GDPR_DEMO, D231_DEMO, D81_DEMO };

/** I cataloghi dei tre domini, indicizzati. 42 + 65 + 64 = 171 adempimenti. */
export const CATALOGHI: Readonly<Record<Dominio, readonly AdempimentoTemplate[]>> = {
  gdpr: GDPR_TEMPLATES,
  d231: D231_TEMPLATES,
  d81: D81_TEMPLATES,
};

export const CLIENTI_DIMOSTRATIVI: Readonly<Record<Dominio, StatoDemo>> = {
  gdpr: GDPR_DEMO,
  d231: D231_DEMO,
  d81: D81_DEMO,
};

/** Tutti gli adempimenti dei tre domini in un elenco solo. */
export const TUTTI_I_TEMPLATES: readonly AdempimentoTemplate[] = [
  ...GDPR_TEMPLATES,
  ...D231_TEMPLATES,
  ...D81_TEMPLATES,
];

const indice = new Map(TUTTI_I_TEMPLATES.map((t) => [`${t.dominio}:${t.codice}`, t]));

export function templatePerCodice(dominio: Dominio, codice: string): AdempimentoTemplate | undefined {
  return indice.get(`${dominio}:${codice}`);
}

export function templatesPerCategoria(dominio: Dominio, categoria: string): readonly AdempimentoTemplate[] {
  return CATALOGHI[dominio].filter((t) => t.categoria === categoria);
}

export function categorieDi(dominio: Dominio): readonly string[] {
  return [...new Set(CATALOGHI[dominio].map((t) => t.categoria))];
}

export function ruoliDi(dominio: Dominio): readonly string[] {
  return [...new Set(CATALOGHI[dominio].map((t) => t.ruolo))];
}
