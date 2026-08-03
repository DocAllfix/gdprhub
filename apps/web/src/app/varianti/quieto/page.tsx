import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { datiVarianti } from "../dati";
import { Accesso, Azienda, Cruscotto, Impostazioni, Portafoglio } from "../schede/schermate";
import { AssessmentEvoluto, ScadenzarioEvoluto } from "../schede/due-schermate";
import { InterruttoreTema } from "../schede/tema";
import { Guscio } from "../piano/guscio";
import { BarreAppaiate, BarrePerRuolo, CaricoMensile, Ciambella, TrendOnesto } from "../piano/grafici";
import { CSS_QUIETO, VARIANTI, type VarianteQuieto } from "./varianti";

export const metadata: Metadata = { title: "Quieto · tre varianti e tre colori" };

const geist = Geist({
  variable: "--f-geist",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600"],
  display: "swap",
});
const geistMono = Geist_Mono({
  variable: "--f-geist-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const SCHERMATE = [
  { n: 1, nome: "Cruscotto" },
  { n: 2, nome: "Cruscotto · i grafici" },
  { n: 3, nome: "Portafoglio" },
  { n: 4, nome: "Scadenzario" },
  { n: 5, nome: "Scheda azienda" },
  { n: 6, nome: "Assessment" },
  { n: 7, nome: "Impostazioni" },
  { n: 8, nome: "Accesso" },
] as const;

/** I sei colori impegnati. Servono accanto a ogni proposta: la domanda non è «è bello»,
 *  è «può convivere con questi senza che nessuno dei due perda significato». */
const RISERVATI = [
  { e: "scaduta", v: "var(--scaduta)" },
  { e: "in scadenza", v: "var(--imminente)" },
  { e: "regolare", v: "var(--regolare)" },
  { e: "GDPR", v: "var(--gdpr)" },
  { e: "231", v: "var(--d231)" },
  { e: "81/08", v: "var(--d81)" },
];

// `exactOptionalPropertyTypes` è acceso: una proprietà facoltativa va dichiarata capace di
// ricevere `undefined`, altrimenti passarglielo esplicitamente è un errore.
function Tessera({ v, scuro, e }: { v: string; scuro?: boolean | undefined; e: string }) {
  return (
    <div className="min-w-0">
      <div className="flex h-12 items-end rounded-lg border border-border p-1.5" style={{ background: v }}>
        <span
          className="truncate font-mono text-[9px]"
          style={{ color: scuro ? "oklch(0.9 0 0)" : "oklch(0.35 0 0)" }}
        >
          {e}
        </span>
      </div>
    </div>
  );
}

function Tavolozza() {
  return (
    <section className="mt-6 rounded-xl border border-border bg-surface p-5">
      <h2 className="text-[11px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
        Il colore contestato, e le tre alternative
      </h2>
      <p className="mt-2 max-w-4xl text-xs leading-relaxed text-muted-foreground">
        Quello che vedi nella colonna è <code className="font-mono">oklch(0.245 0.021 262)</code>: hue 262,
        blu-navy. Sta in due posti, non uno — la barra sul tema chiaro e{" "}
        <b className="text-foreground">ogni pulsante pieno</b> («Salva», «Aprilo», «Nuova azienda», «Accedi»).
        Cambiarlo solo nella barra darebbe una pagina con due inchiostri diversi, quindi qui si cambia in
        tutti e due.
      </p>
      <p className="mt-2 max-w-4xl text-xs leading-relaxed text-muted-foreground">
        <b className="text-foreground">Hai ragione anche sul perché.</b> Il navy scuro è il riflesso numero
        uno del gestionale: ce l&apos;hanno Linear, Vercel, mezzo settore, e soprattutto ce l&apos;ha{" "}
        <code className="font-mono">sistemacommercialisti</code>, che è dello stesso studio e sta a hue 250.
        Due strumenti dello stesso committente non devono sembrare lo stesso strumento.
      </p>

      <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg bg-surface-sunken p-3">
          <p className="mb-2 text-[11px] font-medium">Oggi · hue 262</p>
          <Tessera v="oklch(0.245 0.021 262)" scuro e="barra + pulsanti" />
          <p className="mt-2 text-[10px] leading-relaxed text-faint-foreground">
            Blu-navy. Non confligge con nulla, ed è il suo unico pregio.
          </p>
        </div>
        {VARIANTI.map((v) => (
          <div key={v.id} className="rounded-lg bg-surface-sunken p-3">
            <p className="mb-2 text-[11px] font-medium">
              {v.nome.replace("Quieto · ", "")} · {v.colore}
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {v.campioni.map((c) => (
                <Tessera key={c.e} v={c.v} scuro={c.scuro} e={c.e} />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 border-t border-border pt-3">
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          <b className="text-foreground">Il vincolo che nessuna delle tre può rompere.</b> Sei colori sono già
          impegnati e significano qualcosa. Un settimo che compete con loro rompe il sistema: in una tabella
          dove il rosso deve dire «scaduta» non ci si può permettere un rosso che dice «premi qui».
        </p>
        <div className="mt-2.5 flex flex-wrap gap-x-5 gap-y-2">
          {RISERVATI.map((r) => (
            <span key={r.e} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <span className="size-3 rounded-[3px]" style={{ background: r.v }} aria-hidden />
              {r.e}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function Grafici({ d }: { d: ReturnType<typeof datiVarianti> }) {
  return (
    <div className="grid gap-3 lg:grid-cols-3">
      <CaricoMensile d={d} />
      <Ciambella d={d} />
      <BarreAppaiate d={d} />
      <BarrePerRuolo d={d} />
      <TrendOnesto />
    </div>
  );
}

function Anteprima({ v }: { v: VarianteQuieto }) {
  const d = datiVarianti();
  return (
    <div>
      <div className="-mx-6 mb-5 border-y border-border-strong bg-surface px-6 py-3">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 className="titolo text-2xl">{v.nome}</h2>
          <p className="text-sm text-muted-foreground">{v.frase}</p>
          <span className="ml-auto font-mono text-[10px] text-faint-foreground">{v.colore}</span>
        </div>
        <div className="mt-1.5 grid max-w-4xl gap-x-6 gap-y-1 text-xs leading-relaxed md:grid-cols-2">
          <p className="text-muted-foreground">{v.cosaCambia}</p>
          <p className="text-faint-foreground">
            <b className="text-muted-foreground">Costo.</b> {v.costo}
          </p>
        </div>
      </div>

      <div data-quieto={v.id} className="overflow-clip rounded-xl">
        <Guscio>
          <div className="space-y-8">
            {SCHERMATE.map((x) => (
              <section key={x.n}>
                <div className="mb-3 flex items-baseline gap-2 border-b border-border pb-1.5">
                  <span className="cifra text-sm text-faint-foreground">{x.n}</span>
                  <h3 className="text-[11px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
                    {x.nome}
                  </h3>
                </div>
                {x.n === 1 ? (
                  <Cruscotto d={d} />
                ) : x.n === 2 ? (
                  <Grafici d={d} />
                ) : x.n === 3 ? (
                  <Portafoglio d={d} />
                ) : x.n === 4 ? (
                  <ScadenzarioEvoluto d={d} />
                ) : x.n === 5 ? (
                  <Azienda d={d} />
                ) : x.n === 6 ? (
                  <AssessmentEvoluto d={d} />
                ) : x.n === 7 ? (
                  <Impostazioni d={d} />
                ) : (
                  <Accesso />
                )}
              </section>
            ))}
          </div>
        </Guscio>
      </div>
    </div>
  );
}

export default function PaginaQuieto() {
  return (
    <main className={`${geist.variable} ${geistMono.variable} mx-auto max-w-[1600px] px-6 py-8`}>
      <style dangerouslySetInnerHTML={{ __html: CSS_QUIETO }} />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <nav className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-faint-foreground">Vai a</span>
          {VARIANTI.map((v) => (
            <a
              key={v.id}
              href={`#${v.id}`}
              className="rounded-lg border border-border bg-surface px-2.5 py-1 hover:bg-surface-raised"
            >
              {v.nome.replace("Quieto · ", "")}
            </a>
          ))}
        </nav>
        <InterruttoreTema />
      </div>

      <header className="max-w-3xl">
        <p className="text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">
          Quieto · tre varianti, tre colori
        </p>
        <h1 className="titolo mt-2 text-3xl">Tre risposte a un blu che non convince</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Tre quieto interi, non tre ritocchi. Ognuno risolve il colore in un modo diverso e sposta{" "}
          <b className="text-foreground">tutta la famiglia dei neutri</b> insieme a lui: se si cambia la tinta
          della colonna e si lasciano i grigi dov&apos;erano, la colonna sembra incollata sopra una pagina di
          qualcun altro. La barra si collassa anche qui, in fondo alla colonna.
        </p>
      </header>

      <Tavolozza />

      <div className="mt-10 space-y-16">
        {VARIANTI.map((v) => (
          <div key={v.id} id={v.id} className="scroll-mt-4">
            <Anteprima v={v} />
          </div>
        ))}
      </div>

      <footer className="mt-16 border-t border-border pt-5 text-xs leading-relaxed text-muted-foreground">
        Guardale soprattutto sul chiaro: è lì che l&apos;inchiostro si vede, e sullo scuro le tre si
        somigliano di più. Se nessuna convince del tutto, si possono anche incrociare — la tinta di una e gli
        angoli di un&apos;altra sono due righe.
      </footer>
    </main>
  );
}
