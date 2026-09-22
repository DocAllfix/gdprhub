import {
  bigserial,
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { organization, user } from "./auth";
import { catalogVersion, domini, obligationTemplate, priorita, tipiPeriodicita } from "./catalog";

// Dati di dominio. Ogni tabella porta `organization_id`.
//
// Nel modello di distribuzione per istanza l'isolamento più forte è FISICO: un container e
// un volume per cliente. Lo scoping applicativo passa sempre da `requireStudio()`, che
// risolve l'organizzazione DALLA SESSIONE e mai da input del client. La colonna resta perché
// rende possibile, un domani, un'istanza condivisa senza migrazione dei dati.

/** L'azienda cliente del portafoglio dello studio. */
export const clientCompany = pgTable(
  "client_company",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    nome: text("nome").notNull(),
    piva: text("piva"),
    codiceFiscale: text("codice_fiscale"),
    ateco: text("ateco"),
    settore: text("settore"),
    sede: text("sede"),
    /** Serve alle tre metodologie sanzionatorie: senza, non calcolano e lo dicono. */
    fatturatoAnnuo: integer("fatturato_annuo"),
    numeroDipendenti: integer("numero_dipendenti"),
    /** `archived` = sola lettura, non conta nei limiti, mai cancellata. */
    stato: text("stato", { enum: ["active", "archived"] })
      .default("active")
      .notNull(),
    /** Azienda di esempio: esclusa da conteggi e statistiche. */
    isDemo: boolean("is_demo").default(false).notNull(),
    logoStorageKey: text("logo_storage_key"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
  },
  (t) => [index("client_company_org_idx").on(t.organizationId)],
);

/**
 * Quali moduli sono attivi per un'azienda.
 *
 * Commercialmente i tre moduli sono inclusi nel pacchetto base: questa tabella non è un
 * listino. Serve alla PERTINENZA: una PMI senza modello 231 non deve vedere 65 adempimenti
 * che non la riguardano e un cruscotto perennemente rosso, perché il primo effetto è che
 * smette di fidarsi dei numeri.
 */
export const companyModule = pgTable(
  "company_module",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    clientCompanyId: text("client_company_id")
      .notNull()
      .references(() => clientCompany.id, { onDelete: "cascade" }),
    dominio: text("dominio", { enum: domini }).notNull(),
    attivo: boolean("attivo").default(true).notNull(),
    attivatoIl: timestamp("attivato_il", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("company_module_uq").on(t.clientCompanyId, t.dominio),
    index("company_module_org_idx").on(t.organizationId),
  ],
);

/** Una fotografia datata dello stato di conformità di un'azienda su un dominio. */
export const assessment = pgTable(
  "assessment",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    clientCompanyId: text("client_company_id")
      .notNull()
      .references(() => clientCompany.id, { onDelete: "cascade" }),
    dominio: text("dominio", { enum: domini }).notNull(),
    /** Congelato alla creazione: un assessment non cambia catalogo sotto i piedi. */
    catalogVersionId: text("catalog_version_id")
      .notNull()
      .references(() => catalogVersion.id),
    titolo: text("titolo").notNull(),
    dataRiferimento: text("data_riferimento").notNull(), // YYYY-MM-DD
    stato: text("stato", { enum: ["bozza", "in_corso", "chiuso"] })
      .default("in_corso")
      .notNull(),
    createdBy: text("created_by").references(() => user.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("assessment_company_idx").on(t.clientCompanyId, t.dominio),
    index("assessment_org_idx").on(t.organizationId),
  ],
);

export const statiLavoro = ["Da fare", "In corso", "Completata", "Non applicabile"] as const;

/**
 * L'adempimento calato su un'azienda: una sola tabella per tutti e tre i domini.
 *
 * Due scelte di modello che discendono dall'analisi dei prototipi:
 *
 * 1. `stato` contiene SOLO lo stato del lavoro. Il ritardo non è uno stato: si deriva da
 *    `ultima_esecuzione` più la periodicità. Nei prototipi era persistito, e per questo
 *    poteva contraddire la data.
 *
 * 2. La scadenza NON si persiste quando è derivabile. `scadenza_esplicita` vale solo per
 *    gli adempimenti a evento e una tantum, dove non c'è nulla da derivare.
 */
export const obligationInstance = pgTable(
  "obligation_instance",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    assessmentId: text("assessment_id")
      .notNull()
      .references(() => assessment.id, { onDelete: "cascade" }),
    templateId: text("template_id")
      .notNull()
      .references(() => obligationTemplate.id),
    /** Ridondante rispetto al template, ma indicizzabile senza join sullo scadenzario. */
    dominio: text("dominio", { enum: domini }).notNull(),
    codice: text("codice").notNull(),

    stato: text("stato", { enum: statiLavoro }).default("Da fare").notNull(),
    /** Obbligatoria quando `stato` è «Non applicabile»: imposta dall'applicazione. */
    motivazioneNonApplicabile: text("motivazione_non_applicabile"),

    /** Data di calendario `YYYY-MM-DD`. Da qui si deriva la scadenza dei periodici. */
    ultimaEsecuzione: text("ultima_esecuzione"),
    /** Sovrascrive la periodicità del catalogo per questa azienda. */
    periodicitaTipoOverride: text("periodicita_tipo_override", { enum: tipiPeriodicita }),
    periodicitaMesiOverride: integer("periodicita_mesi_override"),
    /** Solo per evento e una tantum. Sui periodici comanda l'ultima esecuzione. */
    scadenzaEsplicita: text("scadenza_esplicita"),

    priorita: text("priorita", { enum: priorita }).notNull(),
    rischio: integer("rischio"),
    ownerUserId: text("owner_user_id").references(() => user.id),
    /** Referente non registrato in piattaforma, es. l'RSPP esterno. */
    ownerEsterno: text("owner_esterno"),
    note: text("note"),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [
    uniqueIndex("obligation_instance_uq").on(t.assessmentId, t.templateId),
    index("obligation_instance_org_idx").on(t.organizationId),
    // Lo scadenzario unificato interroga per organizzazione e dominio: indice dedicato.
    index("obligation_instance_agenda_idx").on(t.organizationId, t.dominio, t.stato),
  ],
);

/**
 * Evidenza documentale. Senza prove, «Completata» è un'opinione: la conformità è
 * dimostrabile (art. 5.2 GDPR, art. 30 D.Lgs 81/08, art. 6 D.Lgs 231/01) solo con documenti
 * datati e riconducibili.
 */
export const evidence = pgTable(
  "evidence",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    obligationInstanceId: text("obligation_instance_id")
      .notNull()
      .references(() => obligationInstance.id, { onDelete: "cascade" }),
    storageKey: text("storage_key").notNull(),
    nomeFile: text("nome_file").notNull(),
    mime: text("mime").notNull(),
    dimensione: integer("dimensione").notNull(),
    /** Rende il documento riconoscibile e non sostituibile in silenzio. */
    hashSha256: text("hash_sha256").notNull(),
    versione: integer("versione").default(1).notNull(),
    validoDal: text("valido_dal"),
    validoAl: text("valido_al"),
    caricatoDa: text("caricato_da").references(() => user.id),
    caricatoIl: timestamp("caricato_il", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("evidence_instance_idx").on(t.obligationInstanceId),
    index("evidence_org_idx").on(t.organizationId),
  ],
);

/**
 * Storico append-only di ogni modifica a un adempimento.
 *
 * È ciò che rende il trend VERO invece che simulato: tutti e tre i prototipi generavano
 * l'andamento a sei mesi con aritmetica sul dato di oggi, e il 231 con `Math.random()`.
 */
export const instanceHistory = pgTable(
  "instance_history",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    organizationId: text("organization_id").notNull(),
    obligationInstanceId: text("obligation_instance_id")
      .notNull()
      .references(() => obligationInstance.id, { onDelete: "cascade" }),
    campo: text("campo").notNull(),
    da: text("da"),
    a: text("a"),
    userId: text("user_id").references(() => user.id),
    at: timestamp("at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("instance_history_instance_idx").on(t.obligationInstanceId, t.at),
    index("instance_history_org_idx").on(t.organizationId, t.at),
  ],
);

/**
 * Registro append-only delle azioni. UPDATE e DELETE sono revocati a livello di grant
 * nella migrazione: non si tocca «di striscio».
 */
export const auditLog = pgTable(
  "audit_log",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    organizationId: text("organization_id"),
    userId: text("user_id"),
    azione: text("azione").notNull(),
    entita: text("entita"),
    entitaId: text("entita_id"),
    dettagli: jsonb("dettagli"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("audit_log_org_idx").on(t.organizationId, t.createdAt)],
);

/**
 * Configurazione dell'istanza: una riga sola.
 *
 * `mode` è la predisposizione per i blocchi della vetrina, e resta `full` finché il
 * committente non conferma: con `full` l'helper `assertNotDemo` è un no-op, quindi le
 * istanze vendute non pagano nulla per una funzione che non usano.
 */
export const instanceConfig = pgTable("instance_config", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" })
    .unique(),
  /** `consulente` = portafoglio di aziende · `azienda` = una sola organizzazione. */
  profilo: text("profilo", { enum: ["consulente", "azienda"] })
    .default("consulente")
    .notNull(),
  mode: text("mode", { enum: ["full", "demo"] })
    .default("full")
    .notNull(),
  /** Marchio dello studio: intestazione della shell e delle relazioni. */
  brandNome: text("brand_nome"),
  brandLogoStorageKey: text("brand_logo_storage_key"),
  brandColore: text("brand_colore"),
  catalogVersionId: text("catalog_version_id").references(() => catalogVersion.id),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

/**
 * LA POSTA IN USCITA, e perché non parte in linea.
 *
 * Una mail si accoda qui dentro la STESSA transazione dell'operazione che la provoca, e un
 * drenatore la consegna dopo. Non è una raffinatezza: è ciò che impedisce il guasto peggiore
 * che questo prodotto possa avere.
 *
 * Il caso: la registrazione pubblica è chiusa (`disableSignUp: true`), quindi nessuno può
 * rifarsi un'utenza da solo. Se un timeout SMTP facesse fallire l'invio durante un recupero
 * password, l'utente resterebbe **chiuso fuori in modo definitivo**, e l'unico rimedio
 * sarebbe un nostro accesso a mano al database del cliente — cioè un nostro accesso ai suoi
 * dati per un guasto nostro.
 *
 * Con l'outbox l'operazione riesce o fallisce per intero, e la consegna si ritenta.
 *
 * È anche ciò che rende la posta SORVEGLIABILE: la sentinella guarda le righe con troppi
 * tentativi o ferme da troppo tempo. Con l'invio in linea non ci sarebbe niente da guardare.
 */
export const outbox = pgTable(
  "outbox",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: text("organization_id").references(() => organization.id, {
      onDelete: "cascade",
    }),
    destinatario: text("destinatario").notNull(),
    oggetto: text("oggetto").notNull(),
    corpoTesto: text("corpo_testo").notNull(),
    corpoHtml: text("corpo_html"),
    /** `attesa` → `inviata` | `fallita`. Una fallita non si ritenta più: va guardata. */
    stato: text("stato", { enum: ["attesa", "inviata", "fallita"] })
      .default("attesa")
      .notNull(),
    tentativi: integer("tentativi").default(0).notNull(),
    /** L'ultimo errore, spogliato: serve a capire perché, non a rileggere il messaggio. */
    ultimoErrore: text("ultimo_errore"),
    creataIl: timestamp("creata_il", { withTimezone: true }).defaultNow().notNull(),
    inviataIl: timestamp("inviata_il", { withTimezone: true }),
  },
  (t) => [index("outbox_stato_idx").on(t.stato, t.creataIl)],
);
