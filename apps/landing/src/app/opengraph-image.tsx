import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { formattaIt } from "@legisboard/engine";
import { token } from "@/lib/colori";
import { TESI } from "@/lib/dati";

// L'anteprima che si vede quando qualcuno incolla il collegamento in una chat o su LinkedIn.
//
// Generata e non disegnata, per la ragione che il riferimento (evalisdeck) scrive bene:
// un'immagine statica va rifatta a mano a ogni cambio di nome o di promessa, e la prima volta
// che diverge dal sito nessuno se ne accorge, perché chi la vede non è chi la controlla.
//
// I colori arrivano dai token (`lib/colori.ts`), i caratteri dai file del pacchetto `geist`:
// nessun valore scritto a mano, nessuna rete.

export const alt = "Legisboard · fatto e in regola non sono la stessa cosa";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const carattere = (file: string) =>
  readFileSync(join(process.cwd(), "node_modules", "geist", "dist", "fonts", file));

export default function Anteprima() {
  const fondo = token("--background");
  const inchiostro = token("--foreground");
  const tenue = token("--muted-foreground");
  const oliva = token("--primary");
  const scaduta = token("--scaduta");

  const residuo = TESI?.giorni != null ? `−${Math.abs(TESI.giorni)}gg` : "";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: fondo,
          color: inchiostro,
          fontFamily: "Geist",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <svg width="48" height="48" viewBox="0 0 64 64">
            <path fill={oliva} fillRule="evenodd" d="M8 8H22V42H56V56H8ZM42 8H56V22H42Z" />
          </svg>
          <span style={{ fontSize: 34, fontWeight: 600, letterSpacing: -0.5 }}>Legisboard</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <span style={{ fontSize: 68, fontWeight: 600, lineHeight: 1.08, letterSpacing: -1.5, maxWidth: 960 }}>
            Fatto e in regola non sono la stessa cosa.
          </span>
          {TESI?.scadenza ? (
            <div style={{ display: "flex", gap: 20, fontFamily: "Geist Mono", fontSize: 30 }}>
              <span style={{ color: tenue }}>{TESI.codice}</span>
              <span>{TESI.stato}</span>
              <span style={{ color: tenue }}>·</span>
              <span style={{ color: scaduta }}>
                {formattaIt(TESI.scadenza)} {residuo}
              </span>
            </div>
          ) : null}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 24, color: tenue }}>
          <span>GDPR · D.Lgs 231/2001 · D.Lgs 81/2008</span>
          <span style={{ color: oliva, fontWeight: 600 }}>legisboard.eu</span>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Geist", data: carattere("geist-sans/Geist-Regular.ttf"), weight: 400, style: "normal" },
        { name: "Geist", data: carattere("geist-sans/Geist-SemiBold.ttf"), weight: 600, style: "normal" },
        { name: "Geist Mono", data: carattere("geist-mono/GeistMono-Medium.ttf"), weight: 500, style: "normal" },
      ],
    },
  );
}
