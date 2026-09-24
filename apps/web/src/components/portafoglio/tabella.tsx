"use client";

import { useMemo } from "react";
import { useFiltriUrl } from "@/lib/filtri-url";
import { Building2, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Vuoto, VuotoFiltro } from "@/components/ui/vuoto";
import Link from "next/link";
import { ArrowDown, ArrowUp, ChevronsUpDown, Search } from "lucide-react";
import { DOMINI, ETICHETTE_DOMINIO, type Dominio } from "@legisboard/engine";
import type { QuadroModulo, RigaPortafoglio } from "@/features/portafoglio/dati";
import { cn } from "@/lib/utils";

// Il portafoglio, in registro sala di controllo.
//
// LA RIGA È UNO STRUMENTO, NON UNA VOCE DI ELENCO. Ogni azienda porta sei letture su
// un'altezza sola: il nome, tre celle di modulo con la loro composizione a colpo d'occhio,
// il complessivo e l'esposizione. Chi guarda quaranta clienti non deve aprirne nemmeno uno
// per sapere da dove cominciare.
//
// LA CELLA DI MODULO È IL PEZZO CHE CONTA. Un semaforo direbbe «rosso» e basta; qui la cella
// dice la percentuale, il denominatore e — nel nastro sotto — come si divide fra scadute, in
// scadenza, regolari e mai programmate. Quattro informazioni in venti pixel di altezza: è la
// differenza fra un elenco e uno strumento.
//
// L'ordinamento predefinito è per ESPOSIZIONE decrescente, non alfabetico. Un elenco
// alfabetico è comodo per chi cerca un nome; questa schermata serve a chi non sa ancora
// quale nome cercare, e la prima riga deve essere il cliente messo peggio.
//
// Ordinamento e filtro sono scritti a mano invece che con TanStack: su sei colonne senza
// raggruppamenti né visibilità variabile, la libreria aggiunge indirezione senza risolvere
// niente che non siano trenta righe di codice.

type Colonna = "nome" | Dominio | "complessivo" | "esposizione";

const TINTA: Readonly<Record<Dominio, string>> = {
  gdpr: "text-gdpr",
  d231: "text-d231",
  d81: "text-d81",
};

/** Il nastro di composizione: quattro stati in proporzione, alto tre pixel. */
function Nastro({ q }: { q: QuadroModulo }) {
  if (q.totale <= 0) return null;
  const regolari = Math.max(0, q.totale - q.scadute - q.inScadenza - q.daProgrammare);
  const pezzi = [
    { n: q.scadute, c: "bg-scaduta", e: "scadute" },
    { n: q.inScadenza, c: "bg-imminente", e: "in scadenza" },
    { n: regolari, c: "bg-regolare", e: "regolari" },
    { n: q.daProgrammare, c: "bg-programmare/70", e: "da programmare" },
  ];
  return (
    <span
      className="mt-1 flex h-0.75 w-full overflow-hidden rounded-full bg-surface-sunken"
      title={pezzi.map((p) => `${p.n} ${p.e}`).join(" · ")}
    >
      {pezzi
        .filter((p) => p.n > 0)
        .map((p) => (
          <span key={p.e} className={p.c} style={{ width: `${(p.n / q.totale) * 100}%` }} />
        ))}
    </span>
  );
}

function CellaModulo({ q }: { q: QuadroModulo }) {
  if (!q.attivo) {
    return (
      <span className="text-xs text-muted-foreground" title="Modulo non attivo per questa azienda">
        non attivo
      </span>
    );
  }
  if (q.conformita === null || q.conformita.percentuale === null) {
    return <span className="text-xs text-muted-foreground">da avviare</span>;
  }
  return (
    <span className="block w-28">
      <span className="flex items-baseline gap-1.5">
        <span className="text-sm font-semibold tabular-nums">{q.conformita.percentuale}%</span>
        <span className="font-mono text-micro text-muted-foreground">
          {q.conformita.numeratore}/{q.conformita.applicabili}
        </span>
        {q.scadute > 0 ? (
          <span className="ml-auto font-mono text-micro font-semibold text-scaduta">
            {"−"}
            {q.scadute}
          </span>
        ) : null}
      </span>
      <Nastro q={q} />
    </span>
  );
}

/** L'esposizione come indicatore compatto: la cifra e quanto occupa della scala 0-100. */
function Esposizione({ valore }: { valore: number | null }) {
  if (valore === null) return <span className="text-xs text-muted-foreground">{"—"}</span>;
  const tinta = valore >= 70 ? "bg-scaduta" : valore >= 45 ? "bg-imminente" : "bg-regolare";
  return (
    <span className="block w-20">
      <span className="font-mono text-sm font-semibold tabular-nums">{valore}</span>
      <span className="mt-1 flex h-0.75 overflow-hidden rounded-full bg-surface-sunken">
        <span className={tinta} style={{ width: `${valore}%` }} />
      </span>
    </span>
  );
}

/**
 * L'intestazione ordinabile di una colonna.
 *
 * Sta FUORI dal componente che la usa: dichiarata dentro il render, React la tratterebbe
 * come un componente nuovo a ogni giro e ne azzererebbe lo stato — e la smonterebbe e
 * rimonterebbe a ogni battuta nel filtro.
 */
function Intestazione({
  colonna,
  ordine,
  onOrdina,
  children,
  classe,
}: {
  colonna: Colonna;
  ordine: { colonna: Colonna; verso: "asc" | "desc" };
  onOrdina: (c: Colonna) => void;
  children: React.ReactNode;
  classe?: string;
}) {
  const attiva = ordine.colonna === colonna;
  return (
    <th className="px-3 py-0 text-left">
      <button
        type="button"
        onClick={() => onOrdina(colonna)}
        className={cn(
          "inline-flex items-center gap-1 py-2 text-micro font-semibold tracking-[0.09em] uppercase hover:text-foreground",
          attiva ? "text-foreground" : "text-muted-foreground",
          classe,
        )}
      >
        {children}
        {!attiva ? (
          <ChevronsUpDown className="size-3 opacity-40" aria-hidden />
        ) : ordine.verso === "asc" ? (
          <ArrowUp className="size-3" aria-hidden />
        ) : (
          <ArrowDown className="size-3" aria-hidden />
        )}
        <span className="sr-only">
          {attiva ? `ordinato ${ordine.verso === "asc" ? "crescente" : "decrescente"}` : "ordina"}
        </span>
      </button>
    </th>
  );
}

// FILTRO E ORDINAMENTO VIVONO NELL'INDIRIZZO, come in assessment e scadenzario.
//
// Il portafoglio era l'unica tabella il cui stato non si poteva condividere: il filtro stava in
// uno `useState` e spariva al ricaricamento. Ed è proprio la schermata da cui si manda un
// collegamento a un collega — «guarda queste tre aziende» — quindi era il posto dove serviva di
// più. Stesso meccanismo delle altre due, così le tre tabelle si comportano allo stesso modo.
const INIZIALI = { q: "", ordina: "esposizione", verso: "desc" };

const COLONNE_VALIDE: readonly Colonna[] = ["nome", "complessivo", "esposizione", ...DOMINI];

export function TabellaPortafoglio({ righe }: { righe: readonly RigaPortafoglio[] }) {
  const { filtri, imposta } = useFiltriUrl(INIZIALI);
  const filtro = filtri.q;
  // Un valore scritto a mano nell'indirizzo non deve rompere la pagina: si torna al predefinito.
  const ordine: { colonna: Colonna; verso: "asc" | "desc" } = {
    colonna: (COLONNE_VALIDE as readonly string[]).includes(filtri.ordina)
      ? (filtri.ordina as Colonna)
      : "esposizione",
    verso: filtri.verso === "asc" ? "asc" : "desc",
  };
  const setFiltro = (v: string) => imposta("q", v);

  const visibili = useMemo(() => {
    const q = filtro.trim().toLowerCase();
    const filtrate = righe.filter(
      (r) =>
        q === "" ||
        r.nome.toLowerCase().includes(q) ||
        (r.settore ?? "").toLowerCase().includes(q) ||
        (r.sede ?? "").toLowerCase().includes(q),
    );

    // Chi non ha il modulo attivo vale −1 e finisce in fondo, non finto-perfetto in testa.
    const valore = (r: RigaPortafoglio): number | string => {
      if (ordine.colonna === "nome") return r.nome.toLowerCase();
      if (ordine.colonna === "complessivo") return r.conformita?.percentuale ?? -1;
      if (ordine.colonna === "esposizione") return r.esposizione ?? -1;
      const i = DOMINI.indexOf(ordine.colonna);
      return r.moduli[i]?.conformita?.percentuale ?? -1;
    };

    return [...filtrate].sort((a, b) => {
      const x = valore(a);
      const y = valore(b);
      const c = typeof x === "string" ? x.localeCompare(y as string) : (x as number) - (y as number);
      return ordine.verso === "asc" ? c : -c;
    });
  }, [righe, filtro, ordine.colonna, ordine.verso]);

  const ordina = (colonna: Colonna) => {
    const verso =
      ordine.colonna === colonna
        ? ordine.verso === "asc"
          ? "desc"
          : "asc"
        : colonna === "nome"
          ? "asc"
          : "desc";
    imposta("ordina", colonna);
    imposta("verso", verso);
  };

  return (
    <div className="pannello entra overflow-clip lg:overflow-visible">
      {/* La barra di controllo sta DENTRO il pannello: il filtro appartiene alla tabella, e
          staccarlo crea due oggetti dove ce n'è uno. */}
      <div className="flex flex-wrap items-center gap-3 border-b border-border bg-surface-sunken px-3 py-2">
        <label className="relative flex-1 sm:max-w-xs">
          <Search
            className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-faint-foreground"
            aria-hidden
          />
          <input
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            placeholder="Cerca azienda, settore, sede"
            aria-label="Filtra le aziende"
            data-tour="filtro-portafoglio"
            className="h-7 w-full rounded-md border border-border bg-surface pr-2 pl-8 text-xs outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
        <span className="font-mono text-micro tabular-nums text-muted-foreground">
          {visibili.length}/{righe.length}
        </span>
        <span className="ml-auto hidden items-center gap-3 text-micro text-muted-foreground sm:flex">
          <Legenda colore="bg-scaduta" testo="scadute" />
          <Legenda colore="bg-imminente" testo="in scadenza" />
          <Legenda colore="bg-regolare" testo="regolari" />
          <Legenda colore="bg-programmare/70" testo="da programmare" />
        </span>
      </div>

      {/* L'INTESTAZIONE SI FISSA ALLA FINESTRA, e perché qui non ci sia più un contenitore
          con overflow da 'lg' in su è la parte che si dimentica: 'position: sticky' si àncora
          al più vicino antenato che scorre, e un 'overflow-x-auto' ne crea uno anche quando
          non si vede scorrere. È il difetto già incontrato in F5d e scritto in DESIGN.md.

          Sotto 'lg' l'overflow resta, perché lì la tabella non ci sta in larghezza e lo
          scorrimento orizzontale serve davvero: a quelle larghezze l'intestazione fissata
          vale poco, perché di righe se ne vedono comunque poche.

          MISURATO, non supposto: con la scatola di scorrimento si vedevano 14 righe
          sull'assessment e 10 sullo scadenzario; così se ne vedono 24. DESIGN.md ne chiede 22. */}
      <div
        className="overflow-x-auto lg:overflow-x-visible"
        data-tour="tabella-portafoglio"
      >
        <table className="w-full">
          <thead className="border-b border-border-strong bg-surface-sunken lg:sticky lg:top-0 lg:z-10 lg:[&_th]:bg-surface-sunken">
            <tr>
              <Intestazione colonna="nome" ordine={ordine} onOrdina={ordina}>
                Azienda
              </Intestazione>
              {DOMINI.map((d) => (
                <Intestazione key={d} colonna={d} ordine={ordine} onOrdina={ordina} classe={TINTA[d]}>
                  {ETICHETTE_DOMINIO[d].breve}
                </Intestazione>
              ))}
              <Intestazione colonna="complessivo" ordine={ordine} onOrdina={ordina}>
                Complessivo
              </Intestazione>
              <Intestazione colonna="esposizione" ordine={ordine} onOrdina={ordina}>
                Esposizione
              </Intestazione>
            </tr>
          </thead>
          <tbody>
            {visibili.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-0">
                  {filtro ? (
                    <VuotoFiltro
                      icona={SearchX}
                      filtri={[`il testo «${filtro}»`]}
                      azzera={
                        <Button variant="outline" size="sm" onClick={() => setFiltro("")}>
                          Azzera la ricerca
                        </Button>
                      }
                    />
                  ) : (
                    <Vuoto icona={Building2} titolo="Nessuna azienda nel portafoglio" variante="riga">
                      Questa tabella elenca le aziende assistite: si popola appena ne aggiungi una.
                    </Vuoto>
                  )}
                </td>
              </tr>
            ) : (
              visibili.map((r) => (
                <tr
                  key={r.id}
                  className="group border-b border-border-subtle transition-colors duration-150 last:border-0 hover:bg-surface-raised"
                >
                  <td className="px-3 py-2">
                    <Link
                      href={`/azienda/${r.id}`}
                      prefetch={false}
                      className="block"
                      data-tour="prima-azienda"
                    >
                      <span className="flex items-center gap-2">
                        <span className="text-sm font-medium group-hover:underline">{r.nome}</span>
                        {r.isDemo ? (
                          <span className="rounded-sm border border-border px-1 text-micro tracking-wide text-muted-foreground uppercase">
                            esempio
                          </span>
                        ) : null}
                      </span>
                      <span className="mt-0.5 flex items-center gap-2 text-micro text-muted-foreground">
                        {r.settore ? <span className="truncate">{r.settore}</span> : null}
                        {r.sede ? <span className="truncate text-muted-foreground">{r.sede}</span> : null}
                      </span>
                    </Link>
                  </td>
                  {r.moduli.map((q) => (
                    <td key={q.dominio} className="px-3 py-2 align-top">
                      <CellaModulo q={q} />
                    </td>
                  ))}
                  <td className="px-3 py-2 align-top">
                    {!r.conformita || r.conformita.percentuale === null ? (
                      <span className="text-xs text-muted-foreground">{"—"}</span>
                    ) : (
                      <span className="block w-24">
                        <span className="flex items-baseline gap-1.5">
                          <span className="cifra text-base">{r.conformita.percentuale}%</span>
                          <span className="font-mono text-micro text-muted-foreground">
                            {r.conformita.numeratore}/{r.conformita.applicabili}
                          </span>
                        </span>
                        <span className="mt-1 flex h-0.75 overflow-hidden rounded-full bg-surface-sunken">
                          <span
                            className="bg-foreground/70"
                            style={{ width: `${r.conformita.percentuale}%` }}
                          />
                        </span>
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 align-top">
                    <Esposizione valore={r.esposizione} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Legenda({ colore, testo }: { colore: string; testo: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={cn("size-1.5 rounded-full", colore)} aria-hidden />
      {testo}
    </span>
  );
}
