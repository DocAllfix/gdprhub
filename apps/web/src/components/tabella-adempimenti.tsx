"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import type { AdempimentoRisolto, Dominio } from "@gdpr/engine";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Codice, PastigliaDominio, Priorita, Scadenza, StatoLavoroEtichetta } from "@/components/stato";
import { cn } from "@/lib/utils";

// La tabella degli adempimenti. Filtro, ordinamento e disegno scritti qui, senza libreria.
//
// PERCHÉ SENZA LIBRERIA, visto che prima c'era TanStack Table e il commento diceva che era
// «un problema risolto». Perché costava 55 KB di JavaScript misurati nel bundle, per fare
// tre cose che qui stanno in trenta righe: filtrare su tre campi, ordinare su sette colonne,
// disegnare. TanStack guadagna il suo peso quando servono colonne mobili, raggruppamenti,
// virtualizzazione, stato delle colonne persistito — niente di cui questa tabella abbia
// bisogno. E si portava dietro un secondo costo, meno visibile: il compilatore di React
// rifiuta di memoizzare un componente che la usa, perché `useReactTable()` restituisce
// funzioni che non si possono memoizzare senza rischiare interfacce stantie. Una libreria
// che disattiva l'ottimizzazione del compilatore su una tabella da centosettantuno righe è
// una libreria che lavora contro di noi.
//
// La stessa cosa era già stata fatta sul portafoglio, e con lo stesso esito.
//
// Struttura e vocabolario restano quelli di prima: stato, priorità, responsabile, filtro
// sopra la tabella. Di questo non si cambia niente — cambia solo chi lo esegue.

export type RigaAdempimento = AdempimentoRisolto & {
  readonly titolo: string;
  readonly periodicitaTesto: string;
  /** Valorizzato quando l'adempimento è letto da un altro modulo. */
  readonly origine?: Dominio;
};

type Chiave = "codice" | "titolo" | "ruolo" | "periodicitaTesto" | "priorita" | "stato" | "scadenza";

type Colonna = {
  readonly chiave: Chiave;
  readonly testa: string;
  /** Il valore su cui si ordina. Non sempre è quello che si vede. */
  readonly valore: (r: RigaAdempimento) => string | number;
  readonly cella: (r: RigaAdempimento) => React.ReactNode;
};

const ORDINE_PRIORITA: Record<string, number> = { Critica: 0, Alta: 1, Media: 2, Bassa: 3 };

const COLONNE: readonly Colonna[] = [
  {
    chiave: "codice",
    testa: "Cod.",
    valore: (r) => r.codice,
    cella: (r) => <Codice codice={r.codice} {...(r.origine ? { origine: r.origine } : {})} />,
  },
  {
    chiave: "titolo",
    testa: "Adempimento",
    valore: (r) => r.titolo,
    cella: (r) => <span className="block max-w-md truncate">{r.titolo}</span>,
  },
  {
    chiave: "ruolo",
    testa: "Responsabile",
    valore: (r) => r.ruolo,
    cella: (r) => <span className="text-xs text-muted-foreground">{r.ruolo}</span>,
  },
  {
    chiave: "periodicitaTesto",
    testa: "Periodicità",
    valore: (r) => r.periodicitaTesto,
    cella: (r) => <span className="text-xs text-muted-foreground">{r.periodicitaTesto}</span>,
  },
  {
    chiave: "priorita",
    testa: "Priorità",
    // Si ordina per gravità e non alfabeticamente: «Alta» prima di «Critica» sarebbe un
    // ordinamento che nessuno ha chiesto e che sembra rotto.
    valore: (r) => ORDINE_PRIORITA[r.priorita] ?? 9,
    cella: (r) => <Priorita priorita={r.priorita} />,
  },
  {
    chiave: "stato",
    testa: "Lavoro",
    valore: (r) => r.stato,
    cella: (r) => <StatoLavoroEtichetta stato={r.stato} />,
  },
  {
    chiave: "scadenza",
    testa: "Scadenza",
    // Si ordina per giorni residui e non per data: chi guarda lo scadenzario pensa
    // «quanto manca», non «che giorno è». I mai programmati vanno in fondo.
    valore: (r) => r.giorniAllaScadenza ?? Number.MAX_SAFE_INTEGER,
    cella: (r) => (
      <Scadenza data={r.scadenza} giorni={r.giorniAllaScadenza} statoScadenza={r.statoScadenza} />
    ),
  },
];

const COLONNA_DOMINIO: Colonna = {
  chiave: "codice",
  testa: "Modulo",
  valore: (r) => r.dominio,
  cella: (r) => <PastigliaDominio dominio={r.dominio} />,
};

export function TabellaAdempimenti({
  righe,
  mostraDominio = false,
  altezzaRiga = "compatta",
}: {
  righe: readonly RigaAdempimento[];
  /** Vero solo dove i tre domini convivono: dentro il modulo sarebbe rumore. */
  mostraDominio?: boolean;
  altezzaRiga?: "compatta" | "comoda";
}) {
  const [filtro, setFiltro] = useState("");
  const [ordine, setOrdine] = useState<{ chiave: Chiave; verso: "asc" | "desc" } | null>(null);

  const colonne = useMemo(
    () => (mostraDominio ? [COLONNA_DOMINIO, ...COLONNE] : COLONNE),
    [mostraDominio],
  );

  const visibili = useMemo(() => {
    const q = filtro.trim().toLowerCase();
    const filtrate =
      q === ""
        ? righe
        : righe.filter(
            (r) =>
              r.codice.toLowerCase().includes(q) ||
              r.titolo.toLowerCase().includes(q) ||
              r.ruolo.toLowerCase().includes(q),
          );

    if (!ordine) return filtrate;
    const col = colonne.find((c) => c.chiave === ordine.chiave);
    if (!col) return filtrate;

    // Copia prima di ordinare: `sort` muta, e `righe` arriva dal server.
    return [...filtrate].sort((a, b) => {
      const x = col.valore(a);
      const y = col.valore(b);
      const d =
        typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y), "it");
      return ordine.verso === "asc" ? d : -d;
    });
  }, [righe, filtro, ordine, colonne]);

  const commuta = (chiave: Chiave) =>
    setOrdine((o) =>
      o?.chiave !== chiave
        ? { chiave, verso: "asc" }
        : o.verso === "asc"
          ? { chiave, verso: "desc" }
          : null,
    );

  return (
    <div className="space-y-3">
      {/* Il filtro sta SOPRA la tabella e resta visibile: chi scansiona non deve aprire
          un pannello per restringere l'elenco. */}
      <div className="flex flex-wrap items-center gap-3">
        <Input
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          placeholder="Cerca per codice, adempimento o responsabile"
          className="h-8 max-w-xs text-sm"
          aria-label="Filtra gli adempimenti"
        />
        <span className="font-mono text-xs text-muted-foreground tabular-nums">
          {visibili.length} di {righe.length}
        </span>
      </div>

      <div className="pannello overflow-clip">
        <Table>
          <TableHeader className="bg-surface-sunken">
            <TableRow className="border-b border-border-strong hover:bg-transparent">
              {colonne.map((c) => {
                const attiva = ordine?.chiave === c.chiave;
                return (
                  <TableHead key={c.testa} className="h-8 px-3">
                    <button
                      type="button"
                      onClick={() => commuta(c.chiave)}
                      className="inline-flex items-center gap-1 hover:text-foreground"
                    >
                      {c.testa}
                      {!attiva ? (
                        <ChevronsUpDown className="size-3 opacity-40" aria-hidden />
                      ) : ordine.verso === "asc" ? (
                        <ArrowUp className="size-3" aria-hidden />
                      ) : (
                        <ArrowDown className="size-3" aria-hidden />
                      )}
                      <span className="sr-only">
                        {!attiva
                          ? "ordina"
                          : ordine.verso === "asc"
                            ? "ordinato crescente"
                            : "ordinato decrescente"}
                      </span>
                    </button>
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibili.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={colonne.length}
                  className="h-24 text-center text-sm text-muted-foreground"
                >
                  {/* Un empty state dice COSA sta escludendo, non «nessun risultato». */}
                  Nessun adempimento corrisponde a «{filtro}».
                </TableCell>
              </TableRow>
            ) : (
              visibili.map((r) => (
                <TableRow
                  key={`${r.dominio}-${r.codice}`}
                  className={cn(
                    "border-b border-border-subtle last:border-0 hover:bg-accent",
                    altezzaRiga === "compatta" ? "h-riga" : "h-riga-comoda",
                  )}
                >
                  {colonne.map((c) => (
                    <TableCell key={c.testa} className="px-3 py-0">
                      {c.cella(r)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
