import { createHash } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import {
  CATALOGHI,
  DOMINI,
  ETICHETTE_DOMINIO,
  agenda,
  conformitaEffettiva,
  conformitaLavoro,
  conteggi,
  criticiAperti,
  descriviPeriodicita,
  esposizione,
  incrocio,
  oggiA,
  risolviTutti,
  templatePerCodice,
  type Adempimento,
  type Dominio,
} from "@legisboard/engine";
import { db } from "@/lib/db";
import { assessment, clientCompany, companyModule, evidence, obligationInstance } from "@/lib/db/schema";
import { adempimentoDaRiga } from "@/features/scadenzario/dati";

// LO SNAPSHOT: il calcolo del giorno, congelato.
//
// Tutto ciò che finisce nella relazione passa da qui, e da nessun'altra parte. Il documento
// legge SOLO questo oggetto: non ha accesso al database e non può interrogare il motore.
//
// Non è pignoleria architettonica, è la ragione per cui la relazione vale qualcosa. Se il
// generatore del PDF potesse leggere i dati vivi, il documento riaperto fra sei mesi
// mostrerebbe i numeri di allora nella prosa e quelli di oggi nelle tabelle, e nessuno
// saprebbe quale delle due metà credere. Congelando qui, tutto ciò che si vede sulla carta
// viene dallo stesso istante.
//
// OGNI NUMERO PORTA IL SUO DENOMINATORE. Un «44%» senza «28 su 64» non è difendibile
// davanti a un'autorità: la prima domanda di un ispettore è «su quanti?», e la relazione
// deve rispondere prima che venga fatta.

export type SnapshotModulo = {
  readonly dominio: Dominio;
  readonly etichetta: { readonly breve: string; readonly esteso: string; readonly norma: string };
  readonly attivo: boolean;
  readonly totale: number;
  readonly conformitaEffettiva: {
    readonly percentuale: number | null;
    readonly numeratore: number;
    readonly applicabili: number;
    readonly nonApplicabili: number;
  };
  readonly conformitaLavoro: {
    readonly percentuale: number | null;
    readonly numeratore: number;
    readonly applicabili: number;
  };
  readonly scadute: number;
  readonly inScadenza: number;
  readonly regolari: number;
  readonly daProgrammare: number;
  readonly criticiAperti: number;
  readonly esposizione: { readonly indice: number; readonly giudizio: string } | null;
  readonly conEvidenza: number;
};

export type VoceCritica = {
  readonly dominio: Dominio;
  readonly codice: string;
  readonly titolo: string;
  readonly riferimento: string;
  readonly ruolo: string;
  readonly priorita: string;
  readonly stato: string;
  readonly statoScadenza: string;
  readonly scadenza: string | null;
  readonly giorni: number | null;
  readonly periodicita: string;
  readonly conEvidenza: boolean;
};

export type Snapshot = {
  /** Versione della forma. Se un domani cambia, le relazioni vecchie restano leggibili. */
  readonly versione: 1;
  readonly generatoIl: string;
  readonly dataRiferimento: string;
  readonly azienda: {
    readonly nome: string;
    readonly settore: string | null;
    readonly sede: string | null;
    readonly partitaIva: string | null;
  };
  readonly ambito: "gdpr" | "d231" | "d81" | "suite";
  readonly moduli: readonly SnapshotModulo[];
  readonly complessivo: {
    readonly totale: number;
    readonly conformitaEffettiva: {
      readonly percentuale: number | null;
      readonly numeratore: number;
      readonly applicabili: number;
      readonly nonApplicabili: number;
    };
    readonly esposizione: { readonly indice: number; readonly giudizio: string } | null;
    readonly scadute: number;
    readonly inScadenza: number;
    readonly criticiAperti: number;
    /** La cella che nessun concorrente rappresenta: fatto, e nondimeno scaduto. */
    readonly completatiEScaduti: number;
    readonly conEvidenza: number;
  };
  readonly critiche: readonly VoceCritica[];
  readonly prossimeScadenze: readonly VoceCritica[];
  readonly esclusioni: readonly {
    readonly dominio: Dominio;
    readonly codice: string;
    readonly titolo: string;
    readonly motivazione: string;
  }[];
  /** Distribuzioni per i grafici. Congelate come tutto il resto: il documento non le ricalcola. */
  readonly perCategoria: readonly {
    readonly etichetta: string;
    readonly quanti: number;
    readonly scaduti: number;
  }[];
  readonly perRuolo: readonly {
    readonly etichetta: string;
    readonly quanti: number;
    readonly scaduti: number;
  }[];
  /** Dodici mesi di carico futuro, impilati per decreto. */
  readonly caricoMensile: readonly {
    readonly mese: number;
    readonly anno: number;
    readonly per: Readonly<Record<string, number>>;
    readonly totale: number;
  }[];
  /** Da dove vengono i numeri: si dichiara, non si fa dedurre. */
  readonly metodo: readonly string[];
};

/** L'impronta del contenuto, stabile: le chiavi si ordinano prima di serializzare. */
export function improntaSnapshot(s: Snapshot): string {
  return createHash("sha256").update(serializzaStabile(s)).digest("hex");
}

/**
 * JSON con le chiavi ordinate.
 *
 * `JSON.stringify` conserva l'ordine di inserzione, e due snapshot identici costruiti da
 * percorsi diversi darebbero due impronte diverse. Un'impronta che dipende dall'ordine in
 * cui si è scritto l'oggetto non identifica il contenuto.
 */
function serializzaStabile(valore: unknown): string {
  if (valore === null || typeof valore !== "object") return JSON.stringify(valore) ?? "null";
  if (Array.isArray(valore)) return `[${valore.map(serializzaStabile).join(",")}]`;
  const chiavi = Object.keys(valore as Record<string, unknown>).sort();
  return `{${chiavi
    .map((k) => `${JSON.stringify(k)}:${serializzaStabile((valore as Record<string, unknown>)[k])}`)
    .join(",")}}`;
}

const quota = (q: {
  percentuale: number | null;
  numeratore: number;
  applicabili: number;
  nonApplicabili?: number;
}) => ({
  percentuale: q.percentuale,
  numeratore: q.numeratore,
  applicabili: q.applicabili,
  nonApplicabili: q.nonApplicabili ?? 0,
});

/**
 * Costruisce lo snapshot di un'azienda a oggi.
 *
 * Il contesto arriva già verificato: questa funzione non è un punto d'ingresso e non fa
 * autorizzazione, perché mescolare calcolo e controllo produce un calcolo che non si può
 * provare senza una sessione.
 */
export async function costruisciSnapshot(
  organizationId: string,
  aziendaId: string,
  ambito: Snapshot["ambito"],
): Promise<Snapshot | null> {
  const oggi = oggiA();

  const az = await db.query.clientCompany.findFirst({
    where: and(eq(clientCompany.id, aziendaId), eq(clientCompany.organizationId, organizationId)),
  });
  if (!az) return null;

  const [moduli, assessments] = await Promise.all([
    db.query.companyModule.findMany({ where: eq(companyModule.clientCompanyId, aziendaId) }),
    db.query.assessment.findMany({ where: eq(assessment.clientCompanyId, aziendaId) }),
  ]);
  const attivi = new Set(moduli.filter((m) => m.attivo).map((m) => m.dominio));
  const dominiInAmbito = ambito === "suite" ? DOMINI : ([ambito] as readonly Dominio[]);

  const istanze =
    assessments.length === 0
      ? []
      : await db.query.obligationInstance.findMany({
          where: inArray(
            obligationInstance.assessmentId,
            assessments.map((a) => a.id),
          ),
        });

  // Le evidenze contano: un adempimento chiuso senza documento è una dichiarazione, e la
  // relazione deve poter distinguere le due cose invece di sommarle.
  const conEvidenza = new Set(
    istanze.length === 0
      ? []
      : (
          await db
            .select({ id: evidence.obligationInstanceId })
            .from(evidence)
            .where(
              inArray(
                evidence.obligationInstanceId,
                istanze.map((i) => i.id),
              ),
            )
        ).map((e) => e.id),
  );

  const grezzi: (Adempimento & { istanzaId: string })[] = [];
  for (const riga of istanze) {
    if (!attivi.has(riga.dominio) || !dominiInAmbito.includes(riga.dominio)) continue;
    const a = adempimentoDaRiga(riga);
    if (a) grezzi.push({ ...a, istanzaId: riga.id });
  }
  const tutti = risolviTutti(grezzi, oggi);
  if (tutti.length === 0) return null;

  const istanzaDi = new Map(grezzi.map((g, i) => [i, g.istanzaId]));
  const conEvidenzaPerIndice = tutti.map((_, i) => conEvidenza.has(istanzaDi.get(i) ?? ""));

  const snapModuli: SnapshotModulo[] = dominiInAmbito.map((d) => {
    const suoi = tutti.filter((a) => a.dominio === d);
    const c = suoi.length > 0 ? conteggi(suoi).perScadenza : null;
    const indici = tutti.map((a, i) => (a.dominio === d ? i : -1)).filter((i) => i >= 0);
    return {
      dominio: d,
      etichetta: {
        breve: ETICHETTE_DOMINIO[d].breve,
        esteso: ETICHETTE_DOMINIO[d].esteso,
        norma: ETICHETTE_DOMINIO[d].norma,
      },
      attivo: attivi.has(d),
      totale: suoi.length,
      conformitaEffettiva: quota(conformitaEffettiva(suoi)),
      conformitaLavoro: quota(conformitaLavoro(suoi)),
      scadute: c?.Scaduta ?? 0,
      inScadenza: c?.["In scadenza"] ?? 0,
      regolari: c?.Regolare ?? 0,
      daProgrammare: c?.["Da programmare"] ?? 0,
      criticiAperti: suoi.length > 0 ? criticiAperti(suoi).length : 0,
      esposizione:
        suoi.length > 0 ? { indice: esposizione(suoi).indice, giudizio: esposizione(suoi).giudizio } : null,
      conEvidenza: indici.filter((i) => conEvidenzaPerIndice[i]).length,
    };
  });

  const voce = (a: (typeof tutti)[number], i: number): VoceCritica => ({
    dominio: a.dominio,
    codice: a.codice,
    titolo: templatePerCodice(a.dominio, a.codice)?.titolo ?? a.codice,
    riferimento: templatePerCodice(a.dominio, a.codice)?.riferimento ?? "",
    ruolo: a.ruolo,
    priorita: a.priorita,
    stato: a.stato,
    statoScadenza: a.statoScadenza,
    scadenza: a.scadenza,
    giorni: a.giorniAllaScadenza,
    periodicita: descriviPeriodicita(a.periodicita),
    conEvidenza: conEvidenzaPerIndice[i] ?? false,
  });

  const indiceDi = new Map(tutti.map((a, i) => [`${a.dominio}${a.codice}`, i]));
  const critici = criticiAperti(tutti);
  const g = incrocio(tutti);
  const esp = esposizione(tutti);
  const c = conteggi(tutti).perScadenza;

  return {
    versione: 1,
    generatoIl: new Date().toISOString(),
    dataRiferimento: oggi,
    azienda: {
      nome: az.nome,
      settore: az.settore,
      sede: az.sede,
      partitaIva: az.piva ?? null,
    },
    ambito,
    moduli: snapModuli,
    complessivo: {
      totale: tutti.length,
      conformitaEffettiva: quota(conformitaEffettiva(tutti)),
      esposizione: { indice: esp.indice, giudizio: esp.giudizio },
      scadute: c.Scaduta,
      inScadenza: c["In scadenza"],
      criticiAperti: critici.length,
      completatiEScaduti: g.Completata?.Scaduta ?? 0,
      conEvidenza: conEvidenzaPerIndice.filter(Boolean).length,
    },
    critiche: critici.slice(0, 40).map((a) => voce(a, indiceDi.get(`${a.dominio}${a.codice}`) ?? -1)),
    prossimeScadenze: agenda(tutti)
      .slice(0, 30)
      .map((v) => {
        const i = indiceDi.get(`${v.dominio}${v.codice}`) ?? -1;
        const a = tutti[i];
        return a ? voce(a, i) : voce(v as unknown as (typeof tutti)[number], -1);
      }),
    esclusioni: tutti
      .filter((a) => a.stato === "Non applicabile")
      .map((a) => {
        const riga = istanze.find((i) => i.dominio === a.dominio && i.codice === a.codice);
        return {
          dominio: a.dominio,
          codice: a.codice,
          titolo: templatePerCodice(a.dominio, a.codice)?.titolo ?? a.codice,
          motivazione: riga?.motivazioneNonApplicabile ?? "",
        };
      })
      .slice(0, 60),
    perCategoria: distribuzione(tutti, (a) => a.categoria, 8),
    perRuolo: distribuzione(tutti, (a) => a.ruolo, 7),
    caricoMensile: carico(tutti, oggi),
    metodo: [
      "La conformità effettiva conta gli adempimenti chiusi E ancora validi: un documento scaduto non protegge, e uno mai redatto nemmeno.",
      "Gli adempimenti non applicabili escono dal denominatore e sono elencati con la loro motivazione.",
      "La scadenza non è un dato inserito: si deriva dall'ultima esecuzione più la periodicità del catalogo.",
      "L'indice di esposizione è una misura relativa 0-100 di quanto rischio resta scoperto, non una stima in denaro.",
      `Catalogo di riferimento: ${dominiInAmbito.map((d) => `${ETICHETTE_DOMINIO[d].breve} ${CATALOGHI[d].length}`).join(", ")} adempimenti.`,
      "Un adempimento chiuso senza evidenza allegata resta una dichiarazione: la colonna delle evidenze lo distingue.",
    ],
  };
}

/** Distribuzione per una chiave, ordinata per quanti sono in ritardo: si guarda il peggio. */
function distribuzione(
  tutti: readonly { categoria: string; ruolo: string; statoScadenza: string }[],
  chiave: (a: { categoria: string; ruolo: string }) => string,
  quante: number,
) {
  const m = new Map<string, { quanti: number; scaduti: number }>();
  for (const a of tutti) {
    const k = chiave(a);
    const v = m.get(k) ?? { quanti: 0, scaduti: 0 };
    v.quanti += 1;
    if (a.statoScadenza === "Scaduta") v.scaduti += 1;
    m.set(k, v);
  }
  return [...m.entries()]
    .map(([etichetta, v]) => ({ etichetta, ...v }))
    .sort((x, y) => y.scaduti - x.scaduti || y.quanti - x.quanti)
    .slice(0, quante);
}

/**
 * Il carico dei prossimi dodici mesi.
 *
 * Nei prototipi di partenza il grafico dell'andamento era generato con `Math.random()`.
 * Questo guarda avanti e non ha bisogno di storico: le scadenze future si derivano dalle
 * periodicità. Ed è la domanda più utile — non «come sono andato» ma «quando arriva».
 */
function carico(tutti: readonly { dominio: string; scadenza: string | null }[], oggi: string) {
  const anno = Number(oggi.slice(0, 4));
  const mese = Number(oggi.slice(5, 7)) - 1;
  const mesi = Array.from({ length: 12 }, (_, i) => {
    const assoluto = mese + i;
    return {
      chiave: `${anno + Math.floor(assoluto / 12)}-${assoluto % 12}`,
      mese: assoluto % 12,
      anno: anno + Math.floor(assoluto / 12),
      per: Object.fromEntries(DOMINI.map((d) => [d, 0])) as Record<string, number>,
      totale: 0,
    };
  });
  const indice = new Map(mesi.map((m) => [m.chiave, m]));
  for (const a of tutti) {
    if (!a.scadenza) continue;
    const m = indice.get(`${Number(a.scadenza.slice(0, 4))}-${Number(a.scadenza.slice(5, 7)) - 1}`);
    if (!m) continue;
    m.per[a.dominio] = (m.per[a.dominio] ?? 0) + 1;
    m.totale += 1;
  }
  return mesi.map(({ mese, anno, per, totale }) => ({ mese, anno, per, totale }));
}

/** Il totale degli adempimenti mai perde traccia della fonte: serve al frontespizio. */
export function riepilogoBreve(s: Snapshot): string {
  const p = s.complessivo.conformitaEffettiva;
  return p.percentuale === null
    ? "nessun adempimento applicabile"
    : `${p.percentuale}% · ${p.numeratore} su ${p.applicabili}`;
}
