import { index, integer, jsonb, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

// Catalogo di piattaforma: NON è dato di un cliente, è contenuto del prodotto.
//
// Queste tabelle non portano `organization_id`: i 171 adempimenti sono gli stessi per tutti,
// e vengono seminati dal motore (`packages/engine`) a ogni rilascio.
//
// Perché versionato: quando il catalogo cambia — nuove linee guida EDPB, la riforma dei
// reati informatici, l'aggiornamento delle ammende con decreto direttoriale — gli assessment
// già chiusi devono restare congelati sulla versione con cui sono stati fatti. Una relazione
// consegnata al CdA non può cambiare sotto i piedi perché abbiamo rilasciato una release.

export const domini = ["gdpr", "d231", "d81"] as const;
export const priorita = ["Critica", "Alta", "Media", "Bassa"] as const;
export const tipiPeriodicita = ["periodica", "continua", "evento", "una_tantum"] as const;

/** Una versione del catalogo. Gli assessment ci si agganciano e non la lasciano più. */
export const catalogVersion = pgTable("catalog_version", {
  id: text("id").primaryKey(),
  /** Etichetta leggibile, es. «Legisboard 2026.1». */
  etichetta: text("etichetta").notNull().unique(),
  /** Versione dell'applicazione che l'ha seminata: serve a ricostruire cosa c'era. */
  versioneApp: text("versione_app").notNull(),
  attiva: text("attiva", { enum: ["si", "no"] })
    .default("no")
    .notNull(),
  seminataIl: timestamp("seminata_il", { withTimezone: true }).defaultNow().notNull(),
});

/** I 171 adempimenti: cosa va presidiato, indipendentemente dal cliente. */
export const obligationTemplate = pgTable(
  "obligation_template",
  {
    id: text("id").primaryKey(),
    catalogVersionId: text("catalog_version_id")
      .notNull()
      .references(() => catalogVersion.id, { onDelete: "cascade" }),
    dominio: text("dominio", { enum: domini }).notNull(),
    /** T01, M14, S23: univoco dentro il dominio e dentro la versione. */
    codice: text("codice").notNull(),
    titolo: text("titolo").notNull(),
    descrizione: text("descrizione").notNull(),
    /** Annotazione operativa del prototipo: nel 231 sono le tracce dei collegamenti. */
    nota: text("nota"),
    riferimento: text("riferimento").notNull(),
    categoria: text("categoria").notNull(),
    ruolo: text("ruolo").notNull(),
    /** Discriminante della periodicità; `mesi` valorizzato solo per `periodica`. */
    periodicitaTipo: text("periodicita_tipo", { enum: tipiPeriodicita }).notNull(),
    periodicitaMesi: integer("periodicita_mesi"),
    prioritaDefault: text("priorita_default", { enum: priorita }).notNull(),
    /** 1-10. Solo il catalogo GDPR lo esprime; altrove si deduce dalla priorità. */
    rischioDefault: integer("rischio_default"),
  },
  (t) => [
    uniqueIndex("obligation_template_uq").on(t.catalogVersionId, t.dominio, t.codice),
    index("obligation_template_dominio_idx").on(t.catalogVersionId, t.dominio),
  ],
);

export const tipiCollegamento = [
  "presidio_condiviso",
  "flusso_informativo",
  "reato_presupposto",
  "evidenza_condivisa",
] as const;

/**
 * Il grafo cross-dominio: chi POSSIEDE un adempimento e chi lo LEGGE.
 *
 * È ciò che rende la suite più della somma dei tre moduli. Un collegamento rotto è peggio
 * di uno assente, perché fa sparire un obbligo: le chiavi esterne lo impediscono a livello
 * di database, oltre che nel test del motore.
 */
export const obligationLink = pgTable(
  "obligation_link",
  {
    id: text("id").primaryKey(),
    catalogVersionId: text("catalog_version_id")
      .notNull()
      .references(() => catalogVersion.id, { onDelete: "cascade" }),
    daTemplateId: text("da_template_id")
      .notNull()
      .references(() => obligationTemplate.id, { onDelete: "cascade" }),
    aTemplateId: text("a_template_id")
      .notNull()
      .references(() => obligationTemplate.id, { onDelete: "cascade" }),
    tipo: text("tipo", { enum: tipiCollegamento }).notNull(),
    /** La norma che giustifica il collegamento: va mostrata all'utente, non nascosta. */
    riferimento: text("riferimento").notNull(),
    motivo: text("motivo").notNull(),
  },
  (t) => [
    uniqueIndex("obligation_link_uq").on(t.daTemplateId, t.aTemplateId, t.tipo),
    index("obligation_link_a_idx").on(t.aTemplateId),
  ],
);

/**
 * Famiglie di reati presupposto del D.Lgs 231/01.
 * Un OdV ragiona per reati, non per attività: senza questa entità la relazione al CdA non
 * può rispondere alla domanda «il rischio 25-septies è presidiato?».
 */
export const reatoPresupposto = pgTable(
  "reato_presupposto",
  {
    id: text("id").primaryKey(),
    catalogVersionId: text("catalog_version_id")
      .notNull()
      .references(() => catalogVersion.id, { onDelete: "cascade" }),
    articolo: text("articolo").notNull(),
    titolo: text("titolo").notNull(),
    /** Se la famiglia prevede sanzioni interdittive ex art. 9 c.2: non sono monetizzabili. */
    interdittive: text("interdittive", { enum: ["si", "no"] }).notNull(),
    nota: text("nota"),
  },
  (t) => [uniqueIndex("reato_presupposto_uq").on(t.catalogVersionId, t.articolo)],
);

/** Quali adempimenti presidiano una famiglia di reati, anche di domini diversi dal 231. */
export const reatoPresidio = pgTable(
  "reato_presidio",
  {
    id: text("id").primaryKey(),
    reatoId: text("reato_id")
      .notNull()
      .references(() => reatoPresupposto.id, { onDelete: "cascade" }),
    templateId: text("template_id")
      .notNull()
      .references(() => obligationTemplate.id, { onDelete: "cascade" }),
  },
  (t) => [uniqueIndex("reato_presidio_uq").on(t.reatoId, t.templateId)],
);

/**
 * Parametri delle tre metodologie sanzionatorie, versionati e con la fonte.
 *
 * Stanno nel database e non nel codice perché cambiano per ragioni esterne al software:
 * le ammende dell'81/08 si rivalutano con decreto direttoriale, il valore della quota 231
 * dipende dalle condizioni economiche, le soglie GDPR dagli orientamenti EDPB.
 */
export const sanctionParameter = pgTable(
  "sanction_parameter",
  {
    id: text("id").primaryKey(),
    catalogVersionId: text("catalog_version_id")
      .notNull()
      .references(() => catalogVersion.id, { onDelete: "cascade" }),
    dominio: text("dominio", { enum: domini }).notNull(),
    chiave: text("chiave").notNull(),
    valore: jsonb("valore").notNull(),
    /** Da stampare nella relazione accanto alla cifra. Obbligatoria. */
    fonte: text("fonte").notNull(),
  },
  (t) => [uniqueIndex("sanction_parameter_uq").on(t.catalogVersionId, t.dominio, t.chiave)],
);
