"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
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
import { DOMINI, ETICHETTE_DOMINIO } from "@gdpr/engine";
import type { RigaPortafoglio } from "@/features/portafoglio/dati";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// Il portafoglio: una riga per azienda, una colonna per modulo.
//
// Struttura presa dalla pagina «CRM» del template MIT next-shadcn-admin-dashboard, che
// risolve lo stesso problema — un elenco di controparti con stato e azioni — ma il
// contenuto delle celle è nostro.
//
// LA CELLA DI MODULO È LA DECISIONE PORTANTE. Un semaforo direbbe «rosso» e basta; qui la
// cella dice la percentuale e, sotto, quante scadenze sono già mancate. Il consulente che
// guarda quaranta aziende non deve aprirne una per sapere se ha un problema, e un colore
// senza numero non è mai bastato a nessuno per decidere da dove cominciare.

const TINTA_DOMINIO = { gdpr: "text-gdpr", d231: "text-d231", d81: "text-d81" } as const;

function CellaModulo({ q }: { q: RigaPortafoglio["moduli"][number] }) {
  if (!q.attivo) {
    return (
      <span className="text-xs text-faint-foreground" title="Modulo non attivo per questa azienda">
        —
      </span>
    );
  }
  if (q.conformita === null || q.conformita.percentuale === null) {
    return <span className="text-xs text-muted-foreground">da avviare</span>;
  }
  return (
    <span className="block leading-tight">
      <span className="text-sm font-semibold tabular-nums">{q.conformita.percentuale}%</span>
      <span className="ml-1 font-mono text-[10px] text-faint-foreground">
        {q.conformita.numeratore}/{q.conformita.applicabili}
      </span>
      {q.scadute > 0 || q.inScadenza > 0 ? (
        <span className="block text-[10px]">
          {q.scadute > 0 ? <span className="text-scaduta">{q.scadute} scadute</span> : null}
          {q.scadute > 0 && q.inScadenza > 0 ? <span className="text-faint-foreground"> · </span> : null}
          {q.inScadenza > 0 ? <span className="text-imminente">{q.inScadenza} in scadenza</span> : null}
        </span>
      ) : q.daProgrammare > 0 ? (
        /* Mai avviati non è «in regola»: un'azienda appena creata deve leggersi per quello
           che è. Il verde qui sarebbe la prima bugia che il consulente vede. */
        <span className="block text-[10px] text-programmare">{q.daProgrammare} da programmare</span>
      ) : (
        <span className="block text-[10px] text-regolare">in regola</span>
      )}
    </span>
  );
}

export function TabellaPortafoglio({ righe }: { righe: readonly RigaPortafoglio[] }) {
  const [filtro, setFiltro] = useState("");
  const [ordinamento, setOrdinamento] = useState<SortingState>([]);

  const colonne = useMemo<ColumnDef<RigaPortafoglio>[]>(
    () => [
      {
        accessorKey: "nome",
        header: "Azienda",
        cell: ({ row }) => (
          <span className="block">
            <Link
              href={`/azienda/${row.original.id}`}
              prefetch={false}
              className="font-medium hover:underline"
              data-tour={row.index === 0 ? "prima-azienda" : undefined}
            >
              {row.original.nome}
            </Link>
            {row.original.isDemo ? (
              <span className="ml-2 rounded-sm border border-border px-1 text-[9px] tracking-wide text-faint-foreground uppercase">
                esempio
              </span>
            ) : null}
            {row.original.stato === "archived" ? (
              <span className="ml-2 rounded-sm border border-border px-1 text-[9px] tracking-wide text-faint-foreground uppercase">
                archiviata
              </span>
            ) : null}
            {row.original.settore ? (
              <span className="block truncate text-xs text-muted-foreground">{row.original.settore}</span>
            ) : null}
          </span>
        ),
      },
      ...DOMINI.map((d, i): ColumnDef<RigaPortafoglio> => ({
        id: d,
        header: ETICHETTE_DOMINIO[d].breve,
        // Si ordina per conformità: le aziende messe peggio salgono in cima quando serve.
        // Chi non ha il modulo attivo resta in fondo, non finto-perfetto in testa.
        accessorFn: (r) => r.moduli[i]?.conformita?.percentuale ?? -1,
        cell: ({ row }) => <CellaModulo q={row.original.moduli[i]!} />,
      })),
      {
        id: "complessivo",
        header: "Complessivo",
        accessorFn: (r) => r.conformita?.percentuale ?? -1,
        cell: ({ row }) => {
          const c = row.original.conformita;
          if (!c || c.percentuale === null) {
            return <span className="text-xs text-faint-foreground">—</span>;
          }
          return (
            <span className="block leading-tight">
              <span className="text-sm font-semibold tabular-nums">{c.percentuale}%</span>
              <span className="block font-mono text-[10px] text-faint-foreground">
                {c.numeratore}/{c.applicabili}
              </span>
            </span>
          );
        },
      },
      {
        id: "esposizione",
        header: "Esposizione",
        accessorFn: (r) => r.esposizione ?? -1,
        cell: ({ row }) => {
          const e = row.original.esposizione;
          if (e === null) return <span className="text-xs text-faint-foreground">—</span>;
          return (
            <span className="font-mono text-sm tabular-nums">
              {e}
              <span className="text-[10px] text-faint-foreground">/100</span>
            </span>
          );
        },
      },
    ],
    [],
  );

  const tabella = useReactTable({
    data: righe as RigaPortafoglio[],
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
        r.nome.toLowerCase().includes(q) ||
        (r.settore ?? "").toLowerCase().includes(q) ||
        (r.sede ?? "").toLowerCase().includes(q)
      );
    },
  });

  const visibili = tabella.getRowModel().rows;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <Input
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          placeholder="Cerca per ragione sociale, settore o sede"
          className="h-8 max-w-xs text-sm"
          aria-label="Filtra le aziende"
          data-tour="filtro-portafoglio"
        />
        <span className="text-xs tabular-nums text-muted-foreground">
          {visibili.length} di {righe.length}
        </span>
      </div>

      <div
        className="overflow-x-auto rounded-md border border-border bg-surface"
        data-tour="tabella-portafoglio"
      >
        <Table>
          <TableHeader className="bg-surface-sunken">
            {tabella.getHeaderGroups().map((gruppo) => (
              <TableRow key={gruppo.id} className="border-b border-border-strong hover:bg-transparent">
                {gruppo.headers.map((intestazione) => {
                  const verso = intestazione.column.getIsSorted();
                  const dominio = DOMINI.find((d) => d === intestazione.column.id);
                  return (
                    <TableHead key={intestazione.id} className="h-8 px-3">
                      <button
                        type="button"
                        onClick={intestazione.column.getToggleSortingHandler()}
                        className={cn(
                          "inline-flex items-center gap-1 hover:text-foreground",
                          dominio ? TINTA_DOMINIO[dominio] : undefined,
                        )}
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
                  {filtro ? `Nessuna azienda corrisponde a «${filtro}».` : "Nessuna azienda nel portafoglio."}
                </TableCell>
              </TableRow>
            ) : (
              visibili.map((riga) => (
                <TableRow
                  key={riga.id}
                  className="h-riga-comoda border-b border-border-subtle last:border-0 hover:bg-accent"
                >
                  {riga.getVisibleCells().map((cella) => (
                    <TableCell key={cella.id} className="px-3 py-1.5 align-middle">
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
