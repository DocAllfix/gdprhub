import type { Metadata } from "next";
import { Cifra, Lastra, Vivo, type Modulo } from "./moduli";

export const metadata: Metadata = { title: "Cruscotto — tre trattamenti" };

// Tre trattamenti della fascia dei moduli, sugli STESSI numeri veri.
//
// Serve a decidere guardando invece che descrivendo — è il metodo che ha funzionato sette
// volte per la forma, mentre descrivere non convergeva mai. Si apre, si scorre, si dice un
// numero, e quel trattamento si propaga a tutte le schermate.
//
// I NUMERI SONO QUELLI VERI della vetrina, non tondi e non gentili: 15%, 0%, 40%. Su dati
// inventati qualunque trattamento sembra buono, perché i casi che rompono un layout sono
// proprio quelli — lo zero, il numero a quattro cifre, l'etichetta che va a capo.

const MODULI: readonly Modulo[] = [
  {
    chiave: "gdpr",
    breve: "GDPR",
    esteso: "Protezione dei dati personali",
    norma: "Reg. UE 2016/679",
    percentuale: 15,
    numeratore: 77,
    applicabili: 504,
    scadute: 55,
    inScadenza: 165,
    regolari: 77,
    daProgrammare: 207,
    critici: 156,
    prontezza: 24,
    scoperti: 96,
  },
  {
    chiave: "d231",
    breve: "231",
    esteso: "Responsabilità amministrativa degli enti",
    norma: "D.Lgs 231/2001",
    percentuale: 0,
    numeratore: 0,
    applicabili: 780,
    scadute: 253,
    inScadenza: 176,
    regolari: 0,
    daProgrammare: 65,
    critici: 276,
    prontezza: 14,
    scoperti: 72,
  },
  {
    chiave: "d81",
    breve: "81/08",
    esteso: "Salute e sicurezza sul lavoro",
    norma: "D.Lgs 81/2008",
    percentuale: 40,
    numeratore: 309,
    applicabili: 768,
    scadute: 132,
    inScadenza: 154,
    regolari: 309,
    daProgrammare: 173,
    critici: 0,
    prontezza: 47,
    scoperti: 23,
  },
];

const TRATTAMENTI = [
  {
    lettera: "A",
    nome: "Vivo",
    cosaCambia: "Solo l'interazione e il movimento. La struttura resta quella di oggi.",
    perche:
      "La scheda intera diventa un bersaglio: cursore, sollevamento al passaggio, stato premuto, anello di fuoco da tastiera. Le schede entrano sfalsate e le barre crescono da zero. È il cambio più piccolo che sposta la percezione, e non richiede di ridiscutere niente.",
    costo: "Nessuno. Si applica anche al portafoglio e allo scadenzario in mezz'ora.",
    Componente: Vivo,
  },
  {
    lettera: "B",
    nome: "Lastra",
    cosaCambia: "Le tre schede smettono di essere tre scatole: diventano una superficie sola.",
    perche:
      "È l'intervento che pesa di più, perché quattro riquadri identici affiancati sono il pattern più riconoscibile del software vecchio. Tre colonne divise da un capello dicono «un fatto in tre parti» e invitano a confrontare — ed è esattamente ciò che si fa qui: 15, 0, 40. Sparisce anche l'anello, che ripeteva il numero che aveva al centro.",
    costo: "Va rifatta anche la scheda «Complessivo», che non può più stare in griglia con le altre.",
    Componente: Lastra,
  },
  {
    lettera: "C",
    nome: "Cifra",
    cosaCambia: "La gerarchia. Una cosa sola per scheda, tutto il resto due gradini sotto.",
    perche:
      "In un cruscotto si guarda una cosa per scheda, e qui è la percentuale. I quattro conteggi passano da elenco verticale a sequenza in linea: una tabella dentro una scheda è ciò che fa «vecchio» più di qualunque colore. La prosa sulla prontezza esce dalla scheda — in un cruscotto la prosa diventa texture.",
    costo:
      "Regge se il numero grande È la risposta. Se servono tutti e quattro i conteggi insieme, la B è più onesta.",
    Componente: Cifra,
  },
];

export default function PaginaTrattamenti() {
  return (
    <div className="mx-auto max-w-[1500px] px-6 py-10">
      <header className="max-w-3xl">
        <p className="text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">Cruscotto</p>
        <h1 className="titolo mt-1.5 text-[1.9rem]">Tre trattamenti, gli stessi numeri</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Cosa fa «software dei primi anni Duemila» in quella schermata non è il colore. Sono sei cose, e i
          tre trattamenti le attaccano in misura crescente.
        </p>
        <ol className="mt-3 grid gap-x-8 gap-y-1 text-[13px] leading-relaxed text-muted-foreground sm:grid-cols-2">
          <li>1. le schede sono scatole inerti: niente cursore, niente passaggio</li>
          <li>2. quattro schede identiche in fila</li>
          <li>3. gli anelli ripetono il numero che hanno al centro</li>
          <li>4. il nastro a blocchi pieni legge come una barra di caricamento</li>
          <li>5. tutto ha lo stesso peso: quattro righe uguali, poi prosa grigia</li>
          <li>6. nessun movimento</li>
        </ol>
        <p className="mt-3 text-[13px] leading-relaxed text-faint-foreground">
          I numeri sono quelli veri della vetrina — 15%, 0%, 40% — e non sono tondi apposta: su dati inventati
          qualunque trattamento sembra buono, perché i casi che rompono un impaginato sono proprio lo zero e
          il numero a quattro cifre.
        </p>
      </header>

      <div className="mt-10 space-y-14">
        {TRATTAMENTI.map(({ lettera, nome, cosaCambia, perche, costo, Componente }) => (
          <section key={lettera}>
            <div className="mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="cifra text-2xl text-primary">{lettera}</span>
              <h2 className="titolo text-lg">{nome}</h2>
              <p className="text-sm text-muted-foreground">{cosaCambia}</p>
            </div>
            <p className="mb-4 max-w-3xl text-[13px] leading-relaxed text-muted-foreground">{perche}</p>

            <Componente moduli={MODULI} />

            <p className="mt-3 text-[11px] text-faint-foreground">
              <b className="text-muted-foreground">Costo:</b> {costo}
            </p>
          </section>
        ))}
      </div>

      <p className="mt-14 max-w-3xl text-sm leading-relaxed text-muted-foreground">
        Passa il mouse sulle schede: è metà di ciò che si sta scegliendo. Le tre non si escludono —{" "}
        <b>A si applica comunque</b>, e la scelta vera è fra <b>B</b> e <b>C</b>
        per la struttura.
      </p>
    </div>
  );
}
