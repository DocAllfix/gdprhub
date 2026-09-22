"use client";

// L'ULTIMO CONFINE. Scatta quando a rompersi è il layout di radice, cioè quando nessun altro
// `error.tsx` può intervenire.
//
// Sostituisce l'intero documento, `<html>` compreso: per questo dichiara i propri tag e non
// può usare il layout né i fogli di stile dell'applicazione. Gli stili sono in linea perché
// qui non c'è altro modo — ed è l'unico posto del progetto in cui è giustificato. È anche
// l'unico file esentato dalla guardia dei token (`src/lib/token-puri.test.ts`).
//
// ⚠️ È CHIARO, E PRIMA ERA SCURO. I valori erano un avorio-su-nero (#12140f) che non
// apparteneva a niente: il tema predefinito di questo prodotto è chiaro, e la scena che lo
// ha deciso — scritta in DESIGN.md — è un DPO in studio alle dieci del mattino con la luce
// dalla finestra. Chi rompe la radice a quell'ora riceveva una schermata nera che sembrava
// di un altro programma. Un guasto è già abbastanza spaventoso senza che il prodotto cambi
// faccia.
//
// ⚠️ I VALORI SONO COPIATI A MANO DAI TOKEN CHIARI di `globals.css`, perché qui `var(--…)`
// non arriva. Sono scritti in `oklch` e non in esadecimale apposta: così stanno nella stessa
// notazione dei token e la divergenza si vede a occhio confrontando le due righe. Se i token
// chiari cambiano, QUESTO FILE VA RIALLINEATO A MANO — non lo fa nessuno strumento, e non lo
// vede nessun controllo.
//
//     --background        oklch(0.96 0.005 110)
//     --surface           oklch(0.996 0.002 110)
//     --foreground        oklch(0.243 0.013 110)
//     --muted-foreground  oklch(0.503 0.01 110)
//     --primary           oklch(0.315 0.078 112)
//     --imminente         oklch(0.5 0.135 62)
//
// Il carattere è quello di sistema e non Geist: `next/font` inietta la propria variabile nel
// layout di radice, che qui è proprio la cosa che si è rotta.

const FONDO = "oklch(0.96 0.005 110)";
const FOGLIO = "oklch(0.996 0.002 110)";
const INCHIOSTRO = "oklch(0.243 0.013 110)";
const SPENTO = "oklch(0.503 0.01 110)";
const OLIVA = "oklch(0.315 0.078 112)";
const CARTA = "oklch(0.985 0.012 110)";
const AMBRA = "oklch(0.5 0.135 62)";

export default function ErroreGlobale({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="it">
      <body
        style={{
          fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
          display: "flex",
          minHeight: "100vh",
          alignItems: "center",
          justifyContent: "center",
          margin: 0,
          padding: "1.5rem",
          background: FONDO,
          color: INCHIOSTRO,
        }}
      >
        <main
          style={{
            maxWidth: "32rem",
            width: "100%",
            padding: "1.75rem",
            lineHeight: 1.6,
            background: FOGLIO,
            // L'anello al 7% del colore del testo, come `.pannello`: il pannello si stacca
            // per superficie, non per filetto.
            borderRadius: "1.125rem",
            boxShadow: `0 0 0 1px oklch(0.24 0.014 110 / 0.07), 0 1px 2px oklch(0.24 0.014 110 / 0.06)`,
          }}
        >
          <div aria-hidden style={{ color: AMBRA, fontSize: "1.25rem", lineHeight: 1 }}>
            {/* Nessuna icona da libreria: qui non c'è bundle da cui prenderla. */}
            &#9650;
          </div>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 600, margin: "0.75rem 0 0.5rem" }}>
            L&apos;applicazione si è fermata
          </h1>
          <p style={{ margin: "0 0 0.75rem", color: SPENTO }}>
            Il guasto è stato registrato.{" "}
            <strong style={{ color: INCHIOSTRO }}>I dati non sono stati toccati</strong>: questa
            schermata compare prima che qualunque operazione venga scritta.
          </p>

          {/* IL RIFERIMENTO SÌ, IL MESSAGGIO NO. Il `digest` identifica l'errore nei nostri
              registri; il testo dell'eccezione può contenere valori del database, e questa
              pagina la legge il cliente. */}
          {error.digest ? (
            <p
              style={{
                margin: "1.25rem 0 0",
                paddingTop: "0.875rem",
                borderTop: "1px solid oklch(0.94 0.005 110)",
                fontSize: "0.875rem",
                color: SPENTO,
              }}
            >
              Riferimento per l&apos;assistenza:{" "}
              <code style={{ fontFamily: "ui-monospace, monospace", color: INCHIOSTRO }}>
                {error.digest}
              </code>
            </p>
          ) : null}

          <button
            onClick={reset}
            style={{
              font: "inherit",
              fontWeight: 500,
              marginTop: "1.25rem",
              padding: "0.5rem 1rem",
              borderRadius: "0.625rem",
              border: 0,
              background: OLIVA,
              color: CARTA,
              cursor: "pointer",
            }}
          >
            Riprova
          </button>
        </main>
      </body>
    </html>
  );
}
