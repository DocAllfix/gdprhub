import { and, eq, inArray } from "drizzle-orm";
import {
  DOMINI,
  conformitaEffettiva,
  conteggi,
  criticiAperti,
  esposizione,
  oggiA,
  risolviTutti,
  templatePerCodice,
  type Adempimento,
  type AdempimentoRisolto,
  type Dominio,
  type Quota,
} from "@gdpr/engine";
import { db } from "@/lib/db";
import { assessment, clientCompany, companyModule, obligationInstance } from "@/lib/db/schema";
import { requireStudio } from "@/features/auth/guards";

// Lettura del portafoglio. Ogni query parte da `requireStudio()`: l'organizzazione si
// risolve dalla sessione, mai dall'URL.
//
// IL CALCOLO NON VIVE QUI. Questo modulo traduce righe di database in `Adempimento` e passa
// la palla al motore. Se una percentuale comparisse in un `SELECT`, esisterebbero due
// implementazioni della stessa formula e prima o poi divergerebbero: è il difetto che i tre
// prototipi avevano ciascuno per conto proprio.

/** Riga del database tradotta nel modello del motore. */
function adempimentoDaRiga(riga: typeof obligationInstance.$inferSelect): Adempimento | null {
  const template = templatePerCodice(riga.dominio, riga.codice);
  // Un'istanza che punta a un codice non più in catalogo è un dato rotto, non un'omissione:
  // si scarta qui e si conta, invece di far esplodere una pagina intera.
  if (!template) return null;

  const periodicita =
    riga.periodicitaTipoOverride === "periodica" && riga.periodicitaMesiOverride !== null
      ? ({ tipo: "periodica", mesi: riga.periodicitaMesiOverride } as const)
      : riga.periodicitaTipoOverride === "continua"
        ? ({ tipo: "continua" } as const)
        : riga.periodicitaTipoOverride === "evento"
          ? ({ tipo: "evento" } as const)
          : riga.periodicitaTipoOverride === "una_tantum"
            ? ({ tipo: "una_tantum" } as const)
            : template.periodicita;

  return {
    codice: riga.codice,
    dominio: riga.dominio,
    categoria: template.categoria,
    ruolo: template.ruolo,
    stato: riga.stato,
    priorita: riga.priorita,
    rischio: riga.rischio ?? template.rischioDefault,
    periodicita,
    ultimaEsecuzione: riga.ultimaEsecuzione,
    scadenzaEsplicita: riga.scadenzaEsplicita,
  };
}

export type QuadroModulo = {
  readonly dominio: Dominio;
  readonly attivo: boolean;
  /** `null` quando il modulo è attivo ma non ha ancora un assessment. */
  readonly conformita: Quota | null;
  readonly scadute: number;
  readonly inScadenza: number;
  /**
   * Adempimenti periodici senza una data di ultima esecuzione.
   *
   * Non sono «in regola»: sono presidi mai avviati. Tenerli distinti dalle scadenze mancate
   * è ciò che impedisce a un'azienda appena creata, con 42 adempimenti intatti, di
   * presentarsi in verde.
   */
  readonly daProgrammare: number;
  readonly criticiAperti: number;
  readonly totale: number;
};

export type RigaPortafoglio = {
  readonly id: string;
  readonly nome: string;
  readonly settore: string | null;
  readonly sede: string | null;
  readonly isDemo: boolean;
  readonly stato: "active" | "archived";
  readonly moduli: readonly QuadroModulo[];
  /** Sui moduli attivi, calcolata sull'insieme unito e non come media. */
  readonly conformita: Quota | null;
  readonly esposizione: number | null;
  readonly scadute: number;
  readonly inScadenza: number;
};

const VUOTO = (dominio: Dominio, attivo: boolean): QuadroModulo => ({
  dominio,
  attivo,
  conformita: null,
  scadute: 0,
  inScadenza: 0,
  daProgrammare: 0,
  criticiAperti: 0,
  totale: 0,
});

/**
 * Il portafoglio dello studio: una riga per azienda, una colonna per modulo.
 *
 * Tutti gli adempimenti di tutte le aziende in una query sola. Con quaranta aziende per tre
 * moduli sono circa settemila righe: una query indicizzata le restituisce in un colpo,
 * mentre una query per azienda ne farebbe quaranta.
 */
export async function portafoglio(opzioni: { includiArchiviate?: boolean } = {}) {
  const ctx = await requireStudio();
  const oggi = oggiA();

  const aziende = await db.query.clientCompany.findMany({
    where: opzioni.includiArchiviate
      ? eq(clientCompany.organizationId, ctx.organizationId)
      : and(eq(clientCompany.organizationId, ctx.organizationId), eq(clientCompany.stato, "active")),
    orderBy: (t, { asc }) => [asc(t.nome)],
  });

  if (aziende.length === 0) return { ctx, righe: [] as RigaPortafoglio[] };

  const ids = aziende.map((a) => a.id);

  const [moduli, assessments] = await Promise.all([
    db.query.companyModule.findMany({ where: inArray(companyModule.clientCompanyId, ids) }),
    db.query.assessment.findMany({ where: inArray(assessment.clientCompanyId, ids) }),
  ]);

  const istanze =
    assessments.length === 0
      ? []
      : await db.query.obligationInstance.findMany({
          where: inArray(
            obligationInstance.assessmentId,
            assessments.map((a) => a.id),
          ),
        });

  // assessmentId → clientCompanyId, per non ripetere il join in memoria.
  const aziendaDiAssessment = new Map(assessments.map((a) => [a.id, a.clientCompanyId]));

  const perAzienda = new Map<string, Map<Dominio, AdempimentoRisolto[]>>();
  for (const riga of istanze) {
    const aziendaId = aziendaDiAssessment.get(riga.assessmentId);
    if (!aziendaId) continue;
    const adempimento = adempimentoDaRiga(riga);
    if (!adempimento) continue;
    const perDominio = perAzienda.get(aziendaId) ?? new Map<Dominio, AdempimentoRisolto[]>();
    const elenco = perDominio.get(riga.dominio) ?? [];
    elenco.push(...risolviTutti([adempimento], oggi));
    perDominio.set(riga.dominio, elenco);
    perAzienda.set(aziendaId, perDominio);
  }

  const attiviPerAzienda = new Map<string, Set<Dominio>>();
  for (const m of moduli) {
    if (!m.attivo) continue;
    const insieme = attiviPerAzienda.get(m.clientCompanyId) ?? new Set<Dominio>();
    insieme.add(m.dominio);
    attiviPerAzienda.set(m.clientCompanyId, insieme);
  }

  const righe: RigaPortafoglio[] = aziende.map((a) => {
    const attivi = attiviPerAzienda.get(a.id) ?? new Set<Dominio>();
    const perDominio = perAzienda.get(a.id) ?? new Map<Dominio, AdempimentoRisolto[]>();

    const quadri = DOMINI.map((d): QuadroModulo => {
      if (!attivi.has(d)) return VUOTO(d, false);
      const suoi = perDominio.get(d) ?? [];
      if (suoi.length === 0) return VUOTO(d, true);
      const c = conteggi(suoi).perScadenza;
      return {
        dominio: d,
        attivo: true,
        conformita: conformitaEffettiva(suoi),
        scadute: c.Scaduta,
        inScadenza: c["In scadenza"],
        daProgrammare: c["Da programmare"],
        criticiAperti: criticiAperti(suoi).length,
        totale: suoi.length,
      };
    });

    // Il complessivo si calcola sull'insieme unito dei moduli attivi: una media delle tre
    // percentuali peserebbe allo stesso modo 42 adempimenti e 65, e basterebbe disattivare
    // un modulo per far salire il numero.
    const tutti = DOMINI.filter((d) => attivi.has(d)).flatMap((d) => perDominio.get(d) ?? []);

    return {
      id: a.id,
      nome: a.nome,
      settore: a.settore,
      sede: a.sede,
      isDemo: a.isDemo,
      stato: a.stato,
      moduli: quadri,
      conformita: tutti.length > 0 ? conformitaEffettiva(tutti) : null,
      esposizione: tutti.length > 0 ? esposizione(tutti).indice : null,
      scadute: quadri.reduce((n, q) => n + q.scadute, 0),
      inScadenza: quadri.reduce((n, q) => n + q.inScadenza, 0),
    };
  });

  return { ctx, righe };
}

export type DettaglioAzienda = Awaited<ReturnType<typeof azienda>>;

/** Una singola azienda del portafoglio, con i suoi moduli e i suoi adempimenti risolti. */
export async function azienda(id: string) {
  const ctx = await requireStudio();
  const oggi = oggiA();

  // L'identificativo arriva dall'URL, quindi la clausola porta SEMPRE anche
  // l'organizzazione: senza, basterebbe indovinare un id per leggere i dati di un altro
  // studio il giorno in cui l'istanza ne ospitasse due.
  const trovata = await db.query.clientCompany.findFirst({
    where: and(eq(clientCompany.id, id), eq(clientCompany.organizationId, ctx.organizationId)),
  });
  if (!trovata) return null;

  const [moduli, assessments] = await Promise.all([
    db.query.companyModule.findMany({ where: eq(companyModule.clientCompanyId, id) }),
    db.query.assessment.findMany({ where: eq(assessment.clientCompanyId, id) }),
  ]);

  const istanze =
    assessments.length === 0
      ? []
      : await db.query.obligationInstance.findMany({
          where: inArray(
            obligationInstance.assessmentId,
            assessments.map((a) => a.id),
          ),
        });

  const tutti = risolviTutti(
    istanze.map(adempimentoDaRiga).filter((a): a is Adempimento => a !== null),
    oggi,
  );

  const attivi = new Set(moduli.filter((m) => m.attivo).map((m) => m.dominio));

  // Disattivare un modulo NON cancella i suoi adempimenti: restano, e riattivandolo il
  // lavoro ricompare. Ma non devono più contare nelle misure, altrimenti un'azienda con il
  // solo 81/08 acceso si legge «0/106» invece di «0/64», e la percentuale in testa alla
  // scheda descrive un perimetro che il consulente ha deliberatamente escluso.
  const adempimenti = tutti.filter((a) => attivi.has(a.dominio));

  /** Quanti adempimenti esistono per dominio, ATTIVO O NO: serve a dire cosa si conserva. */
  const censiti = Object.fromEntries(
    DOMINI.map((d) => [d, tutti.filter((a) => a.dominio === d).length]),
  ) as Record<Dominio, number>;

  return {
    ctx,
    azienda: trovata,
    moduliAttivi: attivi,
    adempimenti,
    censiti,
    /** Vero quando i moduli sono attivi ma nessuno ha ancora un assessment aperto. */
    senzaAssessment: attivi.size > 0 && adempimenti.length === 0,
  };
}
