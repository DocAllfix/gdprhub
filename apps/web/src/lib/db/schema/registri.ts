import { index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { organization, user } from "./auth";
import { clientCompany } from "./tenancy";

// I REGISTRI DI DOMINIO.
//
// Fin qui il prodotto ha censito ADEMPIMENTI: cose che si fanno a scadenza. I registri sono
// un'altra natura — raccolgono FATTI che accadono quando accadono: una violazione dei dati,
// una richiesta di un interessato, una segnalazione a un organismo di vigilanza.
//
// La differenza non è formale. Un adempimento ha una periodicità e una scadenza derivata;
// un fatto ha una data di accadimento e un termine che parte da lì. Modellarli come
// adempimenti significherebbe forzare una ricorrenza dove non c'è, e perdere la cosa che
// conta davvero: il tempo trascorso dal momento in cui si è saputo.
//
// UNA TABELLA SOLA PER TUTTI I REGISTRI, con i campi propri in JSON. Non è pigrizia: i
// registri condividono tutto ciò che il prodotto tratta — appartenenza, azienda, data del
// fatto, termine, stato, storico — e differiscono solo nel contenuto. Tre tabelle quasi
// identiche significherebbero tre query, tre viste e tre punti dove dimenticarsi
// l'`organization_id`.

export const registro = pgTable(
  "registro",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    clientCompanyId: text("client_company_id")
      .notNull()
      .references(() => clientCompany.id, { onDelete: "cascade" }),

    /**
     * Quale registro. Non è un enum del database: i tipi vivono nel motore insieme alle
     * loro regole di termine, e duplicarli qui creerebbe due elenchi che un giorno divergono.
     *
     *   violazione   art. 33-34 GDPR · notifica entro 72 ore dalla conoscenza
     *   diritto      art. 12-22 GDPR · riscontro entro 30 giorni, prorogabili a 90
     *   segnalazione D.Lgs 24/2023 · riscontro 7 giorni, istruttoria 3 mesi
     */
    tipo: text("tipo").notNull(),

    /** Progressivo per azienda e per tipo: «Violazione n. 3/2026» è come si cita. */
    numero: text("numero").notNull(),

    /**
     * QUANDO SI È SAPUTO, non quando è accaduto.
     *
     * L'art. 33 fa decorrere le 72 ore dal momento in cui il titolare «ne viene a
     * conoscenza», non dal momento del fatto. Sono due date diverse e spesso distanti, e
     * confonderle è il modo più comune di calcolare male il termine.
     */
    conosciutoIl: timestamp("conosciuto_il", { withTimezone: true }).notNull(),
    /** Quando il fatto è avvenuto, se noto. Serve alla ricostruzione, non al termine. */
    avvenutoIl: timestamp("avvenuto_il", { withTimezone: true }),

    titolo: text("titolo").notNull(),
    descrizione: text("descrizione"),

    /** `aperto | in-istruttoria | chiuso | archiviato`: il vocabolario è del motore. */
    stato: text("stato").notNull().default("aperto"),

    /** Quando l'obbligo è stato assolto: notifica inviata, riscontro dato, esito comunicato. */
    assoltoIl: timestamp("assolto_il", { withTimezone: true }),
    /** Cosa si è fatto. Un termine dichiarato assolto senza dire come non prova nulla. */
    esito: text("esito"),

    /** I campi propri del tipo: categorie di dati, numero di interessati, canale, ecc. */
    dettagli: jsonb("dettagli").$type<Record<string, unknown>>().default({}).notNull(),

    apertoDa: text("aperto_da").references(() => user.id),
    creatoIl: timestamp("creato_il", { withTimezone: true }).defaultNow().notNull(),
    aggiornatoIl: timestamp("aggiornato_il", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("registro_org_idx").on(t.organizationId),
    index("registro_azienda_tipo_idx").on(t.clientCompanyId, t.tipo),
  ],
);
