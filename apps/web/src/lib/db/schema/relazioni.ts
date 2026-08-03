import { index, integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { organization, user } from "./auth";
import { clientCompany } from "./tenancy";

// LA RELAZIONE.
//
// È il documento che il consulente consegna: al consiglio, al cliente, a un ispettore. È
// anche l'unica cosa del prodotto che qualcuno leggerà fra due anni, quando i dati saranno
// cambiati e nessuno si ricorderà com'erano.
//
// PER QUESTO LO SNAPSHOT È UNA COPIA, NON UN COLLEGAMENTO. Una relazione che ricalcola dai
// dati vivi non è una relazione: è una vista. Se il DVR viene chiuso domani, il documento
// pubblicato il 3 agosto deve continuare a dire che il 3 agosto era aperto — altrimenti non
// certifica niente e non si può portare da nessuna parte.
//
// Lo snapshot è JSON e non un insieme di colonne, perché ciò che si congela è la forma del
// calcolo di quel giorno. Se fra sei mesi il motore aggiunge una misura, le relazioni
// vecchie devono restare leggibili così com'erano: normalizzarle significherebbe doverle
// migrare, e migrare un documento firmato è esattamente ciò che non si fa.
//
// L'IMMUTABILITÀ È DEL DATABASE, non del codice. Una volta pubblicata, la riga non si tocca
// nemmeno da psql: il trigger sta nella migrazione accanto a quelli dei registri
// append-only. Un documento che il programma può riscrivere non è un documento firmato.

export const report = pgTable(
  "report",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    clientCompanyId: text("client_company_id")
      .notNull()
      .references(() => clientCompany.id, { onDelete: "cascade" }),

    /**
     * `gdpr | d231 | d81` per la relazione di un decreto solo, `suite` per quella integrata.
     * Non è un enum del database: i domini vivono nel motore, e duplicarli qui creerebbe
     * due elenchi che un giorno divergono.
     */
    ambito: text("ambito").notNull(),

    /** `bozza` finché si può rifare, `pubblicata` quando diventa un atto. */
    stato: text("stato", { enum: ["bozza", "pubblicata"] })
      .default("bozza")
      .notNull(),

    /** Progressivo per azienda: «Relazione n. 3 del 2026» è come la si cita. */
    numero: integer("numero").notNull(),

    /** La data a cui i dati si riferiscono, che non è quella in cui si stampa il PDF. */
    dataRiferimento: text("data_riferimento").notNull(),

    /** Il calcolo congelato. Vedi `features/relazioni/snapshot.ts` per la forma. */
    snapshot: jsonb("snapshot").notNull(),

    /**
     * Impronta dello snapshot serializzato.
     *
     * Serve a dire «questo è il documento che ti ho consegnato» senza rileggere il PDF: due
     * relazioni con lo stesso hash contengono gli stessi numeri, e una relazione il cui
     * hash non torna è stata toccata da qualcuno che ha aggirato il trigger.
     */
    hashSnapshot: text("hash_snapshot").notNull(),

    generataDa: text("generata_da").references(() => user.id),
    generataIl: timestamp("generata_il", { withTimezone: true }).defaultNow().notNull(),
    pubblicataIl: timestamp("pubblicata_il", { withTimezone: true }),
  },
  (t) => [
    index("report_org_idx").on(t.organizationId),
    index("report_azienda_idx").on(t.clientCompanyId),
  ],
);
