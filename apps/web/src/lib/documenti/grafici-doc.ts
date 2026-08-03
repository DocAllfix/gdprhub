import { esc } from "./impaginazione";

// I GRAFICI DEL DOCUMENTO, disegnati in SVG per la carta.
//
// Non sono quelli della schermata riusati: la carta ha vincoli opposti. Non c'è passaggio
// del mouse, quindi ogni valore che serve deve essere STAMPATO — un grafico che rivela i
// numeri solo al passaggio, su un foglio, non rivela niente. Non c'è scorrimento, quindi la
// dimensione è fissa in millimetri e non in pixel. E si stampa in bianco e nero: ogni serie
// porta l'etichetta accanto, e il colore resta il secondo canale.
//
// Perché SVG a mano e non una libreria: il documento si genera dentro una funzione
// serverless con Chromium senza font di sistema e senza rete. Una libreria che disegna dopo
// il caricamento produce un PDF con i riquadri vuoti — è già successo nello spike della
// Fase 0 con i font, ed è la stessa classe di problema.

/** La tavolozza del documento, la stessa dell'applicazione. */
const TINTA: Record<string, string> = {
  gdpr: "var(--gdpr)",
  d231: "var(--d231)",
  d81: "var(--d81)",
  scaduta: "var(--scaduta)",
  imminente: "var(--imminente)",
  regolare: "var(--regolare)",
  programmare: "var(--programmare)",
  oliva: "var(--oliva)",
};

export type Fetta = { readonly etichetta: string; readonly valore: number; readonly tinta: string };

/**
 * La ciambella della composizione, con il totale al centro e la legenda accanto.
 *
 * I due pixel tolti a ogni arco sono lo stacco fra gli spicchi: senza, quattro archi dello
 * stesso spessore diventano un anello solo e si perde il confine — che in stampa conta più
 * che a schermo, perché non c'è nulla su cui passare il mouse per capire dove finisce uno.
 */
export function ciambella(fette: readonly Fetta[], didascalia: string): string {
  const vive = fette.filter((f) => f.valore > 0);
  const totale = vive.reduce((s, f) => s + f.valore, 0);
  if (totale === 0) return "";

  const D = 44; // mm
  const S = 7;
  const r = (D - S) / 2;
  const giro = 2 * Math.PI * r;

  let scarto = 0;
  const archi = vive
    .map((f) => {
      const quota = f.valore / totale;
      const a = `<circle cx="${D / 2}" cy="${D / 2}" r="${r}" fill="none"
        stroke="${TINTA[f.tinta] ?? f.tinta}" stroke-width="${S}"
        stroke-dasharray="${(giro * quota - 0.7).toFixed(2)} ${giro.toFixed(2)}"
        stroke-dashoffset="${(-giro * scarto + 0.35).toFixed(2)}"
        transform="rotate(-90 ${D / 2} ${D / 2})" />`;
      scarto += quota;
      return a;
    })
    .join("");

  const legenda = vive
    .map(
      (f) => `<li>
      <span class="pallino" style="background:${TINTA[f.tinta] ?? f.tinta}"></span>
      <span class="voce">${esc(f.etichetta)}</span>
      <span class="val">${f.valore}</span>
      <span class="quota">${Math.round((f.valore / totale) * 100)}%</span>
    </li>`,
    )
    .join("");

  return `<figure class="grafico">
    <div class="ciambella">
      <svg viewBox="0 0 ${D} ${D}" width="${D}mm" height="${D}mm">
        ${archi}
        <text x="50%" y="47%" text-anchor="middle" dominant-baseline="central" class="cifra-svg">${totale}</text>
        <text x="50%" y="60%" text-anchor="middle" dominant-baseline="central" class="sotto-svg">adempimenti</text>
      </svg>
      <ul class="legenda">${legenda}</ul>
    </div>
    <figcaption>${esc(didascalia)}</figcaption>
  </figure>`;
}

export type Barra = { readonly etichetta: string; readonly quanti: number; readonly scaduti: number };

/**
 * Barre orizzontali con la quota scaduta dentro.
 *
 * Il prototipo 231 aveva lo stesso grafico e diceva solo quanti adempimenti c'erano per
 * categoria — una proprietà del catalogo, che non cambia mai. Portare dentro la quota
 * scaduta lo trasforma da inventario in diagnosi: dice dove si sta perdendo terreno.
 */
export function barreOrizzontali(voci: readonly Barra[], didascalia: string, unita: string): string {
  if (voci.length === 0) return "";
  const massimo = Math.max(...voci.map((v) => v.quanti), 1);
  const righe = voci
    .map(
      (v) => `<li>
      <span class="et">${esc(v.etichetta)}</span>
      <span class="barra">
        <span class="pezzo scaduto" style="width:${((v.scaduti / massimo) * 100).toFixed(1)}%"></span>
        <span class="pezzo resto" style="width:${(((v.quanti - v.scaduti) / massimo) * 100).toFixed(1)}%"></span>
      </span>
      <span class="val">${v.scaduti > 0 ? `<b>${v.scaduti}</b>/` : ""}${v.quanti}</span>
    </li>`,
    )
    .join("");
  return `<figure class="grafico">
    <ul class="barre">${righe}</ul>
    <figcaption>${esc(didascalia)} <span class="unita">${esc(unita)}</span></figcaption>
  </figure>`;
}

export type Colonna = {
  readonly etichetta: string;
  readonly per: Readonly<Record<string, number>>;
  readonly totale: number;
};

/**
 * Colonne impilate per decreto: quando cade il lavoro nei prossimi dodici mesi.
 *
 * È l'unico grafico in cui il colore del decreto è al suo posto: la regola dice che le tre
 * tinte si usano solo dove i tre domini convivono, e in una colonna impilata convivono per
 * costruzione. La linea tratteggiata della media non è ornamento — senza, una colonna alta
 * dice solo che è più alta delle vicine, non se il mese è pesante.
 */
export function colonneImpilate(
  colonne: readonly Colonna[],
  serie: readonly { readonly chiave: string; readonly etichetta: string }[],
  didascalia: string,
): string {
  const massimo = Math.max(...colonne.map((c) => c.totale), 1);
  const totale = colonne.reduce((s, c) => s + c.totale, 0);
  if (totale === 0) return "";
  const media = Math.round(totale / colonne.length);
  const H = 34; // mm

  const barre = colonne
    .map((c) => {
      const pezzi = serie
        .map((s) =>
          (c.per[s.chiave] ?? 0) > 0
            ? `<span class="pezzo" style="height:${(((c.per[s.chiave] ?? 0) / massimo) * 100).toFixed(1)}%;background:${TINTA[s.chiave]}"></span>`
            : "",
        )
        .join("");
      return `<span class="colonna"><span class="pila">${pezzi}</span><span class="et">${esc(c.etichetta)}</span></span>`;
    })
    .join("");

  const legenda = serie
    .map(
      (s) =>
        `<span class="v"><span class="pallino" style="background:${TINTA[s.chiave]}"></span>${esc(s.etichetta)}</span>`,
    )
    .join("");

  return `<figure class="grafico">
    <div class="colonne" style="--h:${H}mm">
      <span class="scala"><span>${massimo}</span><span>0</span></span>
      <span class="campo">
        <span class="media" style="bottom:${((media / massimo) * 100).toFixed(1)}%"></span>
        ${barre}
      </span>
    </div>
    <figcaption>${esc(didascalia)}
      <span class="legenda-riga">${legenda}<span class="v media-nota">— media ${media} al mese</span></span>
    </figcaption>
  </figure>`;
}

/**
 * La riga della conformità: una barra per modulo, con la percentuale in cifra.
 *
 * Serve dove la tabella c'è già: la tabella dà i numeri esatti, la barra dà la proporzione
 * in un colpo d'occhio. Due letture della stessa cosa, e sono complementari perché una si
 * legge e l'altra si guarda.
 */
export function barreConformita(
  voci: readonly { etichetta: string; percentuale: number | null; denominatore: string; tinta: string }[],
  didascalia: string,
): string {
  if (voci.length === 0) return "";
  const righe = voci
    .map(
      (v) => `<li>
      <span class="et"><b>${esc(v.etichetta)}</b></span>
      <span class="barra alta">
        <span class="pezzo" style="width:${v.percentuale ?? 0}%;background:${TINTA[v.tinta] ?? v.tinta}"></span>
      </span>
      <span class="val">${v.percentuale === null ? "—" : `${v.percentuale}%`}<span class="den">${esc(v.denominatore)}</span></span>
    </li>`,
    )
    .join("");
  return `<figure class="grafico">
    <ul class="barre conformita">${righe}</ul>
    <figcaption>${esc(didascalia)}</figcaption>
  </figure>`;
}
