"use client";

import { useMemo, useState } from "react";
import {
  type ColumnDef,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import type { AdempimentoRisolto, Dominio } from "@gdpr/engine";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Codice, PastigliaDominio, Priorita, Scadenza, StatoLavoroEtichetta } from "@/components/stato";
import { cn } from "@/lib/utils";

// La tabella degli adempimenti, su TanStack Table e sui componenti shadcn.
//
// Struttura presa dalla pagina «Tasks» del template MIT next-shadcn-admin-dashboard: stato,
// priorità, responsabile, filtri a faccette. Di quel template si prende la MECCANICA, non
// l'estetica: colori, densità e vocabolario di stato vengono da DESIGN.md.
//
// Perché TanStack e non una tabella a mano: 171 righe con ordinamento, filtri e visibilità
// delle colonne sono un problema risolto, e riscriverlo sarebbe lavoro senza valore.

export type RigaAdempimento = AdempimentoRisolto & {
  readonly titolo: string;
  readonly periodicitaTesto: string;
  /** Valorizzato quando l'adempimento è letto da un altro modulo. */
  readonly origine?: Dominio;
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
  const [ordinamento, setOrdinamento] = useState<SortingState>([]);

  const colonne = useMemo<ColumnDef<RigaAdempimento>[]>(() => {
    const base: ColumnDef<RigaAdempimento>[] = [
      {
        accessorKey: "codice",
        header: "Cod.",
        cell: ({ row }) => (
          <Codice
            codice={row.original.codice}
            {...(row.original.origine ? { origine: row.original.origine } : {})}
          />
        ),
      },
      {
        accessorKey: "titolo",
        header: "Adempimento",
        cell: ({ row }) => <span className="block max-w-md truncate">{row.original.titolo}</span>,
      },
      {
        accessorKey: "ruolo",
        header: "Responsabile",
        cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.original.ruolo}</span>,
      },
      {
        accessorKey: "periodicitaTesto",
        header: "Periodicità",
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">{row.original.periodicitaTesto}</span>
        ),
      },
      {
        accessorKey: "priorita",
        header: "Priorità",
        cell: ({ row }) => <Priorita priorita={row.original.priorita} />,
      },
      {
        accessorKey: "stato",
        header: "Lavoro",
        cell: ({ row }) => <StatoLavoroEtichetta stato={row.original.stato} />,
      },
      {
        id: "scadenza",
        header: "Scadenza",
        // Si ordina per giorni residui e non per data: chi guarda lo scadenzario pensa
        // «quanto manca», non «che giorno è». I mai programmati vanno in fondo.
        accessorFn: (r) => r.giorniAllaScadenza ?? Number.MAX_SAFE_INTEGER,
        cell: ({ row }) => (
          <Scadenza
            data={row.original.scadenza}
            giorni={row.original.giorniAllaScadenza}
            statoScadenza={row.original.statoScadenza}
          />
        ),
      },
    ];

    if (!mostraDominio) return base;
    return [
      {
        accessorKey: "dominio",
        header: "Modulo",
        cell: ({ row }) => <PastigliaDominio dominio={row.original.dominio} />,
      },
      ...base,
    ];
  }, [mostraDominio]);

  const tabella = useReactTable({
    data: righe as RigaAdempimento[],
    columns: colonne,
    state: { sorting: ordinamento, globalFilter: filtro },
    onSortingChange: setOrdinamento,
    onGlobalFilterChange: setFiltro,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: (riga, _colonna, valore: string) => {
      const q = valore.toLowerCase();
      const r = riga.original;
      return (
        r.codice.toLowerCase().includes(q) ||
        r.titolo.toLowerCase().includes(q) ||
        r.ruolo.toLowerCase().includes(q)
      );
    },
  });

  const visibili = tabella.getRowModel().rows;

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
        <span className="text-xs text-muted-foreground tabular-nums">
          {visibili.length} di {righe.length}
        </span>
      </div>

      <div className="overflow-hidden rounded-md border border-border bg-surface">
        <Table>
          <TableHeader className="bg-surface-sunken">
            {tabella.getHeaderGroups().map((gruppo) => (
              <TableRow key={gruppo.id} className="border-b border-border-strong hover:bg-transparent">
                {gruppo.headers.map((intestazione) => {
                  const ordinabile = intestazione.column.getCanSort();
                  const verso = intestazione.column.getIsSorted();
                  return (
                    <TableHead key={intestazione.id} className="h-8 px-3">
                      {ordinabile ? (
                        <button
                          type="button"
                          onClick={intestazione.column.getToggleSortingHandler()}
                          className="inline-flex items-center gap-1 hover:text-foreground"
                        >
                          {flexRender(intestazione.column.columnDef.header, intestazione.getContext())}
                          {verso === "asc" ? (
                            <ArrowUp className="size-3" aria-hidden />
                          ) : verso === "desc" ? (
                            <ArrowDown className="size-3" aria-hidden />
                          ) : (
                            <ChevronsUpDown className="size-3 opacity-40" aria-hidden />
                          )}
                          <span className="sr-only">
                            {verso === "asc"
                              ? "ordinato crescente"
                              : verso === "desc"
                                ? "ordinato decrescente"
                                : "ordina"}
                          </span>
                        </button>
                      ) : (
                        flexRender(intestazione.column.columnDef.header, intestazione.getContext())
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
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
              visibili.map((riga) => (
                <TableRow
                  key={riga.id}
                  className={cn(
                    "border-b border-border-subtle last:border-0 hover:bg-accent",
                    altezzaRiga === "compatta" ? "h-riga" : "h-riga-comoda",
                  )}
                >
                  {riga.getVisibleCells().map((cella) => (
                    <TableCell key={cella.id} className="px-3 py-0">
                      {flexRender(cella.column.columnDef.cell, cella.getContext())}
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
