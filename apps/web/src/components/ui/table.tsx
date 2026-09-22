"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

// ⚠️ IL CONTENITORE DI SHADCN ANNULLAVA `position: sticky` SULL'INTESTAZIONE.
//
// Questo involucro porta `overflow-x-auto` di serie, e un contenitore che scorre diventa
// l'ancora di qualunque `sticky` al suo interno: l'intestazione si fissa rispetto a LUI
// invece che alla finestra, e siccome lui non ha un'altezza massima, non si fissa affatto.
// Nessun errore, nessun avviso — semplicemente scorre via.
//
// È lo stesso difetto già incontrato in F5d e scritto in DESIGN.md, in una seconda copia che
// non si vedeva: l'avevo tolto dal pannello esterno e l'intestazione continuava a scappare,
// perché il contenitore vero era qui dentro, dentro la primitiva.
//
// Da `lg` in su l'overflow sparisce e l'intestazione si àncora alla finestra. Sotto `lg`
// resta, perché a quelle larghezze la tabella non ci sta e lo scorrimento orizzontale serve
// davvero — e di righe se ne vedono comunque troppo poche perché l'intestazione fissata
// cambi qualcosa.
function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <div
      data-slot="table-container"
      className="relative w-full overflow-x-auto lg:overflow-x-visible"
    >
      <table data-slot="table" className={cn("w-full caption-bottom text-sm", className)} {...props} />
    </div>
  );
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return <thead data-slot="table-header" className={cn("[&_tr]:border-b", className)} {...props} />;
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return <tbody data-slot="table-body" className={cn("[&_tr:last-child]:border-0", className)} {...props} />;
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn("border-t bg-muted/50 font-medium [&>tr]:last:border-b-0", className)}
      {...props}
    />
  );
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "border-b transition-colors hover:bg-muted/50 has-aria-expanded:bg-muted/50 data-[state=selected]:bg-muted",
        className,
      )}
      {...props}
    />
  );
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "h-10 px-2 text-left align-middle font-medium whitespace-nowrap text-foreground [&:has([role=checkbox])]:pr-0",
        className,
      )}
      {...props}
    />
  );
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn("p-2 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0", className)}
      {...props}
    />
  );
}

function TableCaption({ className, ...props }: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("mt-4 text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption };
