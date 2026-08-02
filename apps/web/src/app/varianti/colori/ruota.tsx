// LA RUOTA DELLE TINTE.
//
// Serve a rispondere a «non abbiamo altre alternative?» con una mappa invece che con
// un'opinione. Sei tinte sono occupate e significano qualcosa: quelle tagliano il cerchio in
// sei spicchi, e si può stare solo al centro di uno spicchio, perché ai bordi la colonna
// comincia a somigliare a un segnale. Guardarla è più veloce che leggere l'elenco.

const OCCUPATE = [
  { h: 26, e: "scaduta", v: "var(--scaduta)" },
  { h: 67, e: "in scadenza", v: "var(--imminente)" },
  { h: 153, e: "regolare", v: "var(--regolare)" },
  { h: 228, e: "81/08", v: "var(--d81)" },
  { h: 273, e: "GDPR", v: "var(--gdpr)" },
  { h: 342, e: "231", v: "var(--d231)" },
];

const CANDIDATE = [
  { h: 46, e: "arancio bruciato", stato: "scartato" },
  { h: 110, e: "oliva", stato: "proposto" },
  { h: 190, e: "ottanio", stato: "bruciato" },
  { h: 250, e: "navy", stato: "scartato" },
  { h: 307, e: "melanzana", stato: "proposto" },
  { h: 4, e: "bordeaux", stato: "scartato" },
];

const C = 150;
const R_INT = 76;
const R_EST = 100;

const punto = (h: number, r: number) => ({
  x: C + r * Math.sin((h * Math.PI) / 180),
  y: C - r * Math.cos((h * Math.PI) / 180),
});

export function Ruota() {
  return (
    <svg
      width={370}
      height={300}
      // Il riquadro è più largo del cerchio: «in scadenza» è l'etichetta più lunga e sta a
      // destra, e con un riquadro quadrato veniva tagliata a metà.
      viewBox="-25 0 370 300"
      role="img"
      aria-label="Cerchio delle tinte: sei occupate dai colori riservati, tre spicchi liberi"
      className="shrink-0"
    >
      {/* La corona delle tinte. */}
      {Array.from({ length: 120 }, (_, i) => {
        const h = i * 3;
        const a = punto(h, R_INT);
        const b = punto(h, R_EST);
        return (
          <line
            key={h}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            stroke={`oklch(0.62 0.14 ${h})`}
            strokeWidth={5}
            opacity={0.5}
          />
        );
      })}

      {/* Le sei occupate: tacca piena verso l'esterno. */}
      {OCCUPATE.map((o) => {
        const a = punto(o.h, R_INT - 6);
        const b = punto(o.h, R_EST + 10);
        const t = punto(o.h, R_EST + 22);
        const destra = Math.sin((o.h * Math.PI) / 180) >= 0;
        return (
          <g key={o.e}>
            <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={o.v} strokeWidth={3} />
            <circle cx={b.x} cy={b.y} r={4} fill={o.v} />
            <text
              x={t.x}
              y={t.y}
              className="fill-foreground text-[9px] font-medium"
              textAnchor={destra ? "start" : "end"}
              dominantBaseline="central"
            >
              {o.e}
            </text>
          </g>
        );
      })}

      {/* I centri degli spicchi: dove si potrebbe stare, e cosa se n'è fatto. */}
      {CANDIDATE.map((c) => {
        const p = punto(c.h, (R_INT + R_EST) / 2);
        const proposto = c.stato === "proposto";
        return (
          <g key={c.e}>
            <circle
              cx={p.x}
              cy={p.y}
              r={proposto ? 9 : 6}
              fill={`oklch(${proposto ? 0.3 : 0.55} ${proposto ? 0.05 : 0.02} ${c.h})`}
              stroke="var(--surface)"
              strokeWidth={2}
            />
            {proposto ? (
              <circle cx={p.x} cy={p.y} r={13} fill="none" stroke="var(--foreground)" strokeWidth={1} />
            ) : null}
          </g>
        );
      })}

      <text
        x={C}
        y={C - 8}
        textAnchor="middle"
        dominantBaseline="central"
        className="cifra fill-foreground text-[15px]"
      >
        grafite
      </text>
      <text
        x={C}
        y={C + 8}
        textAnchor="middle"
        dominantBaseline="central"
        className="fill-muted-foreground text-[9px]"
      >
        nessuna tinta
      </text>
    </svg>
  );
}
