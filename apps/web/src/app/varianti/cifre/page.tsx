import type { Metadata } from "next";
import { datiVarianti } from "../dati";
import { InterruttoreTema } from "../schede/tema";

export const metadata: Metadata = { title: "Quante misure per una cifra" };

// QUATTRO MISURE DI CIFRA PER SETTE USI: gerarchia o deriva?
//
// La domanda è nata bonificando la scala tipografica (Fase 1, 2026-09-19). Le 125
// occorrenze di `text-[…]` scritte a mano erano, quasi tutte, una scala coerente che nessuno
// aveva nominato — `text-[1.7rem]` era «il titolo di pagina» su dieci pagine su dieci. Ma le
// cifre grandi no: quattro misure, sette usi, e nessun modo di capire dal codice se sia una
// gerarchia voluta o deriva accumulata.
//
// LE MISURE, ORDINATE PER CONTENITORE:
//
//   2.6rem  ×1   cruscotto, dentro la lastra dei tre moduli
//   2.1rem  ×2   testata di PAGINA, a destra dell'h1     (scheda azienda, reati)
//   1.9rem  ×3   testata di PANNELLO, a destra           (registri, simulatore)
//   1.6rem  ×1   banda compatta del portafoglio
//
// IL SOSPETTO, e il motivo per cui questa pagina esiste. 1.9 e 2.1 sono la stessa identica
// struttura — `<div className="text-right"><p className="cifra …">`, una cifra in cima a un
// contenitore con l'etichetta sotto — a 3,2 pixel di distanza. E non compaiono MAI sulla
// stessa schermata: `cifra-lg` vive su scheda azienda e reati, `cifra` su registri e
// simulatore. Non sono mai state viste una accanto all'altra, che è esattamente la
// condizione in cui una deriva nasce e sopravvive per mesi.
//
// 1.6 e 2.6 invece difendono la propria misura: una banda a quattro celle strette contro il
// numero più grande del prodotto. Quelli sono gesti diversi davvero.
//
// PERCHÉ UNA PAGINA E NON UN PARERE. Tre virgola due pixel sono o un segnale o niente, e
// dal codice non si distingue. È lo stesso metodo di `docs/04-stato-fasi.md` §F5d applicato
// a una domanda piccola: costruire le alternative e guardarle, invece di descriverle.
// Qui la domanda è abbastanza piccola che descriverla sarebbe quasi onesto — ma «quasi» su
// tre pixel è precisamente il margine in cui ci si sbaglia.
//
// ─────────────────────────────────────────────────────────────────────────────────────────
// DECISO IL 2026-09-19: B — tre gradini, 1.6 · 1.9 · 2.6. `--text-cifra-lg` non esiste più.
//
// Il ragionamento, perché è la parte che serve fra sei mesi. Guardando le tre risoluzioni
// affiancate si vede che B e C **appiattiscono la distinzione allo stesso modo**: «tenere la
// gerarchia pagina sopra pannello» non era un argomento per C, perché anche C la appiattiva,
// solo al valore più grande. Restava quindi una domanda sola — quale misura sopravvive — e
// la decide il rapporto con il titolo che la cifra accompagna:
//
//     titolo di pagina   1.7rem = 27,2px
//     cifra a 2.1rem     33,6px  →  1,24×    grida più forte del titolo
//     cifra a 1.9rem     30,4px  →  1,12×    sta alla pari
//
// Una cifra un quarto più grande del titolo della pagina su cui sta è la forma che i Divieti
// chiamano «grande numero eroico». A 1.9 è un dato, a 2.1 è un annuncio.
//
// LA PAGINA RESTA, e mostra ancora le tre risoluzioni: è l'archivio di come ci si è arrivati,
// che è il motivo per cui `/varianti` esiste. Le misure qui sono scritte a mano di proposito
// — servono a confrontare alternative, comprese quelle scartate, e per questo `/varianti` è
// fuori dal perimetro della guardia dei token.
// ─────────────────────────────────────────────────────────────────────────────────────────

const MISURE = {
  sm: "text-[1.6rem]",
  base: "text-[1.9rem]",
  lg: "text-[2.1rem]",
  xl: "text-[2.6rem]",
} as const;

type Misura = keyof typeof MISURE;

// --- I quattro contenitori veri, riprodotti ------------------------------------------------

/** Come in `app/(app)/azienda/[id]/page.tsx:68` — la cifra a destra del titolo di pagina. */
function TestataPagina({ misura, dati }: { misura: Misura; dati: ReturnType<typeof datiVarianti> }) {
  const c = dati.complessivo.conformita;
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-[10px] tracking-[0.09em] text-faint-foreground uppercase">Scheda azienda</p>
        <h1 className="titolo mt-1.5 text-[1.7rem]">Rossi Manifattura S.p.A.</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Metalmeccanico · Brescia · P.IVA 03912840178
        </p>
      </div>
      <div className="text-right">
        <p className={`cifra ${MISURE[misura]}`}>{c.percentuale}%</p>
        <p className="text-xs text-muted-foreground">
          conformità effettiva · {c.numeratore}/{c.applicabili}
        </p>
      </div>
    </div>
  );
}

/** Come in `components/registri/elenco.tsx:88` — la cifra a destra della testata di pannello. */
function TestataPannello({ misura }: { misura: Misura }) {
  return (
    <div className="pannello flex flex-wrap items-start justify-between gap-4 p-5">
      <div>
        <p className="text-[10px] tracking-[0.09em] text-faint-foreground uppercase">
          Registro · art. 33 GDPR
        </p>
        <h2 className="titolo mt-1.5 text-lg">Violazioni dei dati personali</h2>
        <p className="mt-1 max-w-prose text-sm text-muted-foreground">
          Ogni violazione va notificata al Garante entro settantadue ore da quando se n&apos;è saputo.
        </p>
      </div>
      <div className="text-right">
        <p className={`cifra ${MISURE[misura]} leading-none`}>7</p>
        <p className="text-xs text-muted-foreground">
          voci · <span className="text-scaduta">2 da presidiare</span>
        </p>
      </div>
    </div>
  );
}

/** Come in `components/portafoglio/tabella.tsx:88` — la banda compatta a quattro celle. */
function BandaCompatta({ misura, dati }: { misura: Misura; dati: ReturnType<typeof datiVarianti> }) {
  const celle = [
    ...dati.perModulo.map((m) => ({
      valore: `${m.conformita.percentuale}%`,
      etichetta: m.etichetta.breve,
      nota: `${m.conformita.numeratore}/${m.conformita.applicabili} · ${m.scadute} scadute`,
    })),
    {
      valore: String(dati.complessivo.esposizione.indice),
      etichetta: "Esposizione",
      nota: "indice derivato, non una cifra in euro",
    },
  ];
  return (
    <div className="pannello grid gap-px overflow-clip bg-border sm:grid-cols-4">
      {celle.map((c) => (
        <div key={c.etichetta} className="bg-surface px-4 py-3">
          <p className={`cifra ${MISURE[misura]} leading-none`}>{c.valore}</p>
          <p className="mt-1.5 text-xs text-muted-foreground">{c.etichetta}</p>
          <p className="mt-0.5 text-[10px] text-faint-foreground">{c.nota}</p>
        </div>
      ))}
    </div>
  );
}

/** Come in `app/(app)/cruscotto/page.tsx:119` — una superficie sola divisa da un capello. */
function LastraModuli({ misura, dati }: { misura: Misura; dati: ReturnType<typeof datiVarianti> }) {
  return (
    <div className="pannello overflow-clip">
      <div className="grid md:grid-cols-3">
        {dati.perModulo.map((m, i) => (
          <div
            key={m.dominio}
            className={`p-5 ${i > 0 ? "md:border-l md:border-border-subtle" : ""}`}
          >
            <p className="text-[10px] tracking-[0.09em] text-faint-foreground uppercase">
              {m.etichetta.esteso}
            </p>
            <p className="mt-4 flex items-baseline gap-1">
              <span className={`cifra ${MISURE[misura]} leading-none`}>
                {m.conformita.percentuale}
              </span>
              <span className="text-base text-muted-foreground">%</span>
            </p>
            <p className="mt-1 font-mono text-[10px] text-faint-foreground">
              {m.conformita.numeratore}/{m.conformita.applicabili} fatti e ancora validi
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Le tre risoluzioni --------------------------------------------------------------------

type Risoluzione = {
  lettera: "A" | "B" | "C";
  nome: string;
  gradini: string;
  idea: string;
  costo: string;
  banda: Misura;
  pannello: Misura;
  pagina: Misura;
  lastra: Misura;
};

const RISOLUZIONI: readonly Risoluzione[] = [
  {
    lettera: "A",
    nome: "Quattro gradini",
    gradini: "1.6 · 1.9 · 2.1 · 2.6",
    idea: "Com'è oggi. Ogni contenitore ha la sua misura: banda, pannello, pagina, lastra.",
    costo:
      "Due gradini a 3,2 pixel di distanza che non si vedono mai insieme. Chi scriverà la prossima schermata dovrà indovinare quale dei due è «la cifra di una testata», e indovinerà a caso.",
    banda: "sm",
    pannello: "base",
    pagina: "lg",
    lastra: "xl",
  },
  {
    lettera: "B",
    nome: "Tre gradini, fusi in basso",
    gradini: "1.6 · 1.9 · 2.6",
    idea: "Pagina e pannello portano la stessa cifra, a 1.9. Una testata è una testata, che stia in cima alla pagina o in cima a un pannello.",
    costo:
      "La testata di pagina perde 3,2 pixel e smette di distinguersi dal pannello che ha sotto. Se quella distinzione contava, qui sparisce.",
    banda: "sm",
    pannello: "base",
    pagina: "base",
    lastra: "xl",
  },
  {
    lettera: "C",
    nome: "Tre gradini, fusi in alto",
    gradini: "1.6 · 2.1 · 2.6",
    idea: "Come B, ma la misura che sopravvive è 2.1: le cifre di testata pesano un po' di più, ovunque stiano.",
    costo:
      "Tre pannelli su quattro crescono. Su una pagina che ne impila diversi — registri, simulatore — le cifre si fanno più presenti di quanto il registro «quieto» chieda.",
    banda: "sm",
    pannello: "lg",
    pagina: "lg",
    lastra: "xl",
  },
];

// --- La pagina ------------------------------------------------------------------------------

export default function PaginaCifre() {
  const dati = datiVarianti();

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[10px] tracking-[0.09em] text-faint-foreground uppercase">
            Domanda aperta · scala tipografica
          </p>
          <h1 className="titolo mt-1.5 text-[1.7rem]">Quante misure per una cifra</h1>
          <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted-foreground">
            Il prodotto usava quattro misure di cifra grande per sette occorrenze. Questa pagina è
            servita a decidere se fossero una gerarchia o una deriva, guardandole invece che
            descrivendole.
          </p>
          <p className="mt-3 max-w-prose rounded-lg border border-accento-border bg-accento-surface px-4 py-3 text-sm leading-relaxed">
            <strong>Deciso il 19 settembre 2026: B — tre gradini, 1.6 · 1.9 · 2.6.</strong> B e C
            appiattivano la distinzione allo stesso modo, quindi restava solo da scegliere quale
            misura sopravvive. Decide il rapporto con il titolo che la cifra accompagna: a 2.1rem la
            cifra è <span className="font-mono">1,24×</span> il titolo di pagina e gli grida sopra; a
            1.9rem è <span className="font-mono">1,12×</span> e gli sta alla pari. La pagina resta come
            archivio.
          </p>
        </div>
        <InterruttoreTema />
      </div>

      {/* --- 1. Il confronto che nel prodotto non capita mai --------------------------------- */}
      <section className="mt-12">
        <h2 className="titolo text-lg">1 · Il confronto che oggi non esiste</h2>
        <p className="mt-1.5 max-w-prose text-sm leading-relaxed text-muted-foreground">
          Sono la stessa struttura: una cifra allineata a destra in cima a un contenitore, con
          l&apos;etichetta sotto. Separate da 3,2 pixel. Nel prodotto vivono su schermate diverse e
          non si toccano mai — qui sì. <strong>Se la differenza non si vede, non è una gerarchia.</strong>
        </p>

        <div className="mt-5 grid gap-px overflow-clip rounded-xl bg-border sm:grid-cols-2">
          {(
            [
              { m: "lg" as Misura, dove: "Testata di pagina", usi: "2 usi · scheda azienda, reati" },
              { m: "base" as Misura, dove: "Testata di pannello", usi: "3 usi · registri, simulatore" },
            ] satisfies { m: Misura; dove: string; usi: string }[]
          ).map((v) => (
            <div key={v.dove} className="bg-surface p-5">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-[10px] tracking-[0.09em] text-faint-foreground uppercase">
                  {v.dove}
                </p>
                <p className="font-mono text-[10px] text-faint-foreground">{MISURE[v.m].slice(6, -1)}</p>
              </div>
              <div className="mt-4 text-right">
                <p className={`cifra ${MISURE[v.m]} leading-none`}>44%</p>
                <p className="mt-1.5 text-xs text-muted-foreground">conformità effettiva · 28/64</p>
              </div>
              <p className="mt-4 text-[11px] text-faint-foreground">{v.usi}</p>
            </div>
          ))}
        </div>

        {/* Le stesse due, incollate senza cornice: è la prova più dura, perché toglie ogni
            indizio di contesto e lascia solo la misura. */}
        <div className="pannello mt-4 flex flex-wrap items-baseline gap-10 p-5">
          <p className="text-[10px] tracking-[0.09em] text-faint-foreground uppercase">
            Solo le due cifre, senza contesto
          </p>
          <p className={`cifra ${MISURE.lg} leading-none`}>44%</p>
          <p className={`cifra ${MISURE.base} leading-none`}>44%</p>
        </div>
      </section>

      {/* --- 2. Tutte e quattro nel contenitore vero ----------------------------------------- */}
      <section className="mt-14">
        <h2 className="titolo text-lg">2 · Tutte e quattro, nel loro contenitore vero</h2>
        <p className="mt-1.5 max-w-prose text-sm leading-relaxed text-muted-foreground">
          Come appaiono oggi, con i numeri del motore. Dall&apos;alto: la lastra del cruscotto, la
          testata di pagina, la testata di pannello, la banda compatta.
        </p>

        <div className="mt-5 space-y-4">
          <LastraModuli misura="xl" dati={dati} />
          <div className="pannello p-5">
            <TestataPagina misura="lg" dati={dati} />
          </div>
          <TestataPannello misura="base" />
          <BandaCompatta misura="sm" dati={dati} />
        </div>
      </section>

      {/* --- 3. Le tre risoluzioni ----------------------------------------------------------- */}
      <section className="mt-14">
        <h2 className="titolo text-lg">3 · Le tre risoluzioni, rese per intero</h2>
        <p className="mt-1.5 max-w-prose text-sm leading-relaxed text-muted-foreground">
          Ognuna mostra le quattro schermate con le proprie misure. La scelta è una lettera.
        </p>

        {RISOLUZIONI.map((r) => (
          <div key={r.lettera} className="mt-8">
            <div className="flex flex-wrap items-baseline gap-3">
              <span className="cifra text-[1.9rem] leading-none text-accento">{r.lettera}</span>
              <h3 className="titolo text-lg">{r.nome}</h3>
              <span className="font-mono text-xs text-faint-foreground">{r.gradini}</span>
            </div>
            <p className="mt-2 max-w-prose text-sm leading-relaxed">{r.idea}</p>
            <p className="mt-1.5 max-w-prose text-sm leading-relaxed text-muted-foreground">
              <span className="text-faint-foreground">Costa:</span> {r.costo}
            </p>

            <div className="mt-4 space-y-3">
              <LastraModuli misura={r.lastra} dati={dati} />
              <div className="pannello p-5">
                <TestataPagina misura={r.pagina} dati={dati} />
              </div>
              <TestataPannello misura={r.pannello} />
              <BandaCompatta misura={r.banda} dati={dati} />
            </div>
          </div>
        ))}
      </section>

      <p className="mt-14 max-w-prose text-xs leading-relaxed text-faint-foreground">
        Se la scelta cade su B o su C, la fusione costa cinque righe: un token sparisce da
        <span className="font-mono"> globals.css</span> e le occorrenze si rinominano. I quattro token
        dichiarati nel frattempo non fanno danno — reggono la situazione attuale senza cambiare nulla.
      </p>
    </main>
  );
}
