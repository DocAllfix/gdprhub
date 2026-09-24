import { readFileSync } from "node:fs";
import { join } from "node:path";

// I COLORI CHE DEVONO USCIRE DAL CSS, presi dai token e non scritti a mano.
//
// Due posti ne hanno bisogno: il `themeColor` del browser e l'immagine Open Graph, che non
// capiscono `oklch`. La guardia `token-puri.test.ts` ha bocciato il primo tentativo, che
// scriveva `#333500` nel layout: giusto, perché il giorno che l'oliva cambia quell'esadecimale
// resta indietro in silenzio. Qui si leggono i token del tema CHIARO alla build e si
// convertono in sRGB — formula verificata: oklch(0.315 0.078 112) → #333500.
//
// Solo lato server e in fase di build: legge un file del monorepo.

export function oklchInHex(l: number, c: number, h: number): string {
  const a = c * Math.cos((h * Math.PI) / 180);
  const b = c * Math.sin((h * Math.PI) / 180);
  const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = l - 0.0894841775 * a - 1.291485548 * b;
  const [L, M, S] = [l_ ** 3, m_ ** 3, s_ ** 3];
  const lin = [
    4.0767416621 * L - 3.3077115913 * M + 0.2309699292 * S,
    -1.2684380046 * L + 2.6097574011 * M - 0.3413193965 * S,
    -0.0041960863 * L - 0.7034186147 * M + 1.707614701 * S,
  ];
  return (
    "#" +
    lin
      .map((x) => {
        const v = Math.max(0, Math.min(1, x));
        const g = v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055;
        return Math.round(g * 255)
          .toString(16)
          .padStart(2, "0");
      })
      .join("")
  );
}

/** I token del tema CHIARO (il blocco `:root`, prima di quello scuro), convertiti. */
export function token(nome: string): string {
  const css = readFileSync(join(process.cwd(), "..", "..", "packages", "ui", "tokens.css"), "utf8");
  const chiaro = css.slice(css.indexOf(":root {"), css.indexOf(':root[data-theme="dark"] {'));
  const m = chiaro.match(new RegExp(`\\s${nome}:\\s*oklch\\(([\\d.]+)\\s+([\\d.]+)\\s+([\\d.]+)\\)`));
  if (!m) throw new Error(`token ${nome} non trovato in tokens.css`);
  return oklchInHex(Number(m[1]), Number(m[2]), Number(m[3]));
}
