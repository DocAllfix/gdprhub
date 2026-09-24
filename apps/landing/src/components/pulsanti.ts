// Le due forme di pulsante della landing. Classi e basta, niente componente: un collegamento
// resta un <a>, che è ciò che un collegamento deve essere per un lettore di schermo e per un
// crawler.

const BASE =
  "inline-flex h-11 items-center justify-center gap-2 rounded-md px-5 text-sm font-medium whitespace-nowrap " +
  "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring " +
  "focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export const PULSANTE_PIENO = `${BASE} bg-primary text-primary-foreground hover:bg-primary-hover`;
export const PULSANTE_VUOTO = `${BASE} border border-border-strong bg-surface text-foreground hover:bg-surface-sunken`;
