// Catalogo d81. Estratto dal prototipo da `scripts/extract-seed.mjs`: non si modifica a
// mano, si rigenera. `pnpm seed:check` fallisce in CI se i file divergono dalla fonte.

import templates from "./d81-templates.json" with { type: "json" };
import demo from "./d81-demo.json" with { type: "json" };
import type { AdempimentoTemplate } from "../core/types";
import type { StatoDemo } from "../core/demo";

export const TEMPLATES = templates as unknown as readonly AdempimentoTemplate[];
export const DEMO = demo as unknown as StatoDemo;
