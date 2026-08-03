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
export * from "./core/risk";
export * from "./core/exposure";
// `prontezza` e `esposizione` vivono entrambe in core/exposure.
export * from "./core/simulate";
export * from "./suite/agenda";
export * from "./suite/links";
export { costruisciDemo } from "./core/demo";
export * from "./core/voci-demo";
export type { StatoDemo, VoceDemo } from "./core/demo";

// --- Cataloghi per dominio -------------------------------------------------------------
import { TEMPLATES as GDPR_TEMPLATES, DEMO as GDPR_DEMO } from "./gdpr";
import { TEMPLATES as D231_TEMPLATES, DEMO as D231_DEMO } from "./d231";
import { TEMPLATES as D81_TEMPLATES, DEMO as D81_DEMO } from "./d81";
import type { AdempimentoTemplate, Dominio } from "./core/types";
import type { StatoDemo } from "./core/demo";

export { GDPR_TEMPLATES, D231_TEMPLATES, D81_TEMPLATES, GDPR_DEMO, D231_DEMO, D81_DEMO };

// --- Sanzioni: tre metodologie distinte, mai sommabili fra loro -------------------------
export { stimaSanzioneGdpr } from "./gdpr/sanction";
export type {
  ParametriSanzioneGdpr,
  StimaSanzione,
  CategoriaViolazione,
  Gravita,
  Circostanze,
} from "./gdpr/sanction";
export {
  stimaSanzione231,
  QUOTE_MIN,
  QUOTE_MAX,
  VALORE_QUOTA_MIN,
  VALORE_QUOTA_MAX,
  TETTO_RIDUZIONE,
} from "./d231/sanction";
export type { ParametriSanzione231, StimaSanzione231, GravitaFatto, Riduzione } from "./d231/sanction";
export { esposizioneD81 } from "./d81/sanction";
export { FAMIGLIE_REATO, coperturaReati, famigliePresidiateDa, presidiRotti } from "./d231/reati";
export type { FamigliaReato, CoperturaReato } from "./d231/reati";
export type { EsposizioneD81, FattispecieSanzionatoria, SoggettoResponsabile } from "./d81/sanction";

/**
 * Presidi che un ispettore chiede per primi, per dominio.
 * Alimentano il calcolo della prontezza: sono il «fascicolo» da avere pronto.
 */
export const PRESIDI_CHIAVE: Readonly<Record<Dominio, readonly string[]>> = {
  // Registro art.30 (Titolare e Responsabile), informative, DPIA, breach, nomina DPO,
  // misure di sicurezza, trasferimenti extra UE.
  gdpr: ["T01", "R01", "T05", "T03", "T04", "T12", "T08", "T11"],
  // Nomina OdV, piano di vigilanza, relazione al CdA, mappatura rischi-reato,
  // codice etico, canale whistleblowing.
  d231: ["M01", "M05", "M08", "M11", "M18", "M36"],
  // DVR, DUVRI, piano di emergenza, nomina RSPP e medico competente, riunione periodica.
  d81: ["S01", "S02", "S06"],
};

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
export * from "./registri/tipi";
export * from "./registri/termini";
