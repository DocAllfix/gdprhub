import { formattaIt } from "@gdpr/engine";
import { Codice, PastigliaDominio, Scadenza, StatoLavoroEtichetta } from "@gdpr/ui/stato";
import { ADEMPIMENTI_GDPR, OGGI_ISO, SETTIMANA, TESI } from "@/lib/dati";

// IL MAZZO — l'eroe mostra ciò che il consulente PRODUCE, non l'interfaccia in cui lavora.
//
// È la correzione del committente, ed è giusta: sul riferimento (evalisdeck) l'eroe è la pila
// dei documenti che si consegnano, non uno screenshot. Per Legisboard il momento che definisce
// il prodotto è l'ispezione, quindi le tre carte sono i tre oggetti di quel momento:
//
//   dietro    le prossime scadenze, una per decreto;
//   in mezzo  la copertina del fascicolo ispettivo per il Garante — la struttura di
//             `apps/web/src/lib/documenti/fascicolo.ts`, con il nome dello studio in alto: è il
//             marchio dello studio che il prodotto oggi mette davvero, il nome;
//   davanti   un adempimento «Completata» e «Scaduta», da solo: la tesi, come oggetto.
//
// NESSUNA CARTA COPRE UN DATO. La prima disposizione metteva la copertina davanti alla tesi, e
// copriva proprio la riga «Scadenza»: si leggeva «Completata» e non la data scaduta, cioè metà
// della tesi. Ora la tesi sta davanti, e si appoggia sull'angolo della copertina che è vuoto
// per costruzione — la data di riferimento sta nella barra alta, non in basso a destra.
//
// DIFFERENZE DAL RIFERIMENTO, volute:
// - niente scala in `em`: i componenti dei due assi sono in `rem` e non la seguirebbero. Le
//   carte si sovrappongono solo da `lg`; sotto si impilano, leggibili, senza tagli.
// - niente alone sfocato dietro al mazzo: è decorazione, e DESIGN.md la esclude.
// - la rotazione è ferma: sono fogli su una scrivania, la metafora del tema chiaro. Al
//   passaggio si muove solo `transform`.
//
// `aria-hidden`: ripete in forma di oggetto ciò che il testo accanto dice in parole, e la
// matrice più in basso dice in forma accessibile. Letto due volte sarebbe rumore.

const CARTA = "rounded-lg border bg-surface shadow-md motion-safe:transition-transform motion-safe:duration-500";

export function Mazzo() {
  return (
    <div aria-hidden className="group relative mx-auto w-full max-w-md space-y-4 lg:h-[38rem] lg:max-w-lg lg:space-y-0">
      {/* Dietro — le prossime scadenze */}
      <div className={`${CARTA} p-5 lg:absolute lg:top-0 lg:right-0 lg:w-72 lg:rotate-2 lg:group-hover:translate-x-1`}>
        <p className="text-micro font-semibold tracking-widest text-muted-foreground uppercase">{SETTIMANA.titolo}</p>
        <ul className="mt-3 space-y-2.5">
          {SETTIMANA.righe.map((r) => (
            <li key={`${r.dominio}:${r.codice}`} className="flex items-center gap-2">
              <PastigliaDominio dominio={r.dominio} />
              <Codice codice={r.codice} />
              <span className="ml-auto">
                <Scadenza data={r.scadenza} giorni={r.giorni} statoScadenza={r.statoScadenza} />
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* In mezzo — la copertina del fascicolo ispettivo */}
      <div className={`${CARTA} p-6 lg:absolute lg:top-44 lg:left-0 lg:w-80 lg:-rotate-1`}>
        <div className="flex items-baseline justify-between gap-3 border-b-2 border-foreground pb-2">
          <span className="text-micro font-semibold tracking-widest uppercase">Studio Dimostrativo</span>
          <span className="text-micro text-muted-foreground">Fascicolo ispettivo</span>
        </div>
        <p className="mt-2 font-mono text-micro text-muted-foreground tabular-nums">rilevazione del {formattaIt(OGGI_ISO)}</p>
        <p className="mt-8 text-micro tracking-wide text-muted-foreground">
          Documentazione a corredo · Reg. UE 2016/679
        </p>
        <p className="mt-2 max-w-56 text-lg leading-snug font-semibold tracking-tight">
          Garante per la protezione dei dati personali
        </p>
        <p className="mt-1 max-w-48 text-sm text-muted-foreground">Fondiaria Meccanica Verdi S.p.A.</p>
        <div className="mt-6 border-t pt-3">
          <p className="text-micro text-muted-foreground">Adempimenti GDPR</p>
          <p className="font-mono text-cifra-sm leading-none tabular-nums">{ADEMPIMENTI_GDPR}</p>
        </div>
      </div>

      {/* Davanti — la tesi */}
      {TESI ? (
        <div className={`${CARTA} p-5 lg:absolute lg:right-0 lg:bottom-0 lg:w-72 lg:group-hover:-translate-y-1`}>
          <div className="flex items-center gap-2">
            <PastigliaDominio dominio={TESI.dominio} />
            <Codice codice={TESI.codice} />
          </div>
          <p className="mt-2 text-sm leading-snug font-medium">{TESI.titolo}</p>
          <dl className="mt-4 grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-2 text-xs">
            <dt className="text-muted-foreground">Lavoro</dt>
            <dd>
              <StatoLavoroEtichetta stato={TESI.stato} />
            </dd>
            <dt className="text-muted-foreground">Scadenza</dt>
            <dd>
              <Scadenza data={TESI.scadenza} giorni={TESI.giorni} statoScadenza={TESI.statoScadenza} />
            </dd>
          </dl>
          <p className="mt-4 border-t pt-3 text-xs text-muted-foreground">Il documento c&apos;è. Il ciclo no.</p>
        </div>
      ) : null}
    </div>
  );
}
