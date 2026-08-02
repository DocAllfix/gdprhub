// @gdpr/engine — motore di calcolo GDPR.
//
// Unica fonte di verità di formule, soglie e giudizi. Cruscotto, relazione, simulatore,
// PDF e import leggono da qui: nessun calcolo duplicato altrove nel sistema.
//
// Vincoli di questo pacchetto, verificati in CI:
//   - zero dipendenze a runtime
//   - zero I/O: niente rete, niente filesystem, niente database
//   - funzioni pure: stesso input, stesso output, sempre

export * from "./types";
export {
  CONTROL_TEMPLATES,
  DEMO_ASSESSMENT,
  normalizzaStatoPrototipo,
  templatePerCodice,
  templatesPerRuolo,
} from "./catalog";
export type { VoceDemo } from "./catalog";
