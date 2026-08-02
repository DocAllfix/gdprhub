import { and, eq, inArray } from "drizzle-orm";
import {
  DOMINI,
  ETICHETTE_DOMINIO,
  FASCE_RISCHIO,
  PESI,
  PRESIDI_CHIAVE,
  PRIORITA,
  conformitaEffettiva,
  conformitaLavoro,
  conteggi,
  criticiAperti,
  descriviPeriodicita,
  esposizione,
  finestre,
  matriceRischio,
  oggiA,
  prontezza,
  risolviTutti,
  templatePerCodice,
  type Adempimento,
  type AdempimentoRisolto,
  type Dominio,
} from "@gdpr/engine";
import { db } from "@/lib/db";
import { assessment, clientCompany, companyModule, obligationInstance } from "@/lib/db/schema";
import { requireStudio } from "@/features/auth/guards";
import { inCache } from "@/lib/cache";

// IL CRUSCOTTO UNIFICATO.
//
// I tre prototipi avevano ciascuno il proprio pannello di grafici, e nessuno parlava con
// gli altri: torta per stato, barre per categoria, radar, Gantt a dodici settimane, mappa
// di calore del rischio. Qui quelle stesse domande si fanno una volta sola sui tre decreti.
//
// COSA HO PRESO DAI PROTOTIPI E COSA HO LASCIATO
//   preso   la matrice di rischio (dal GDPR), la distribuzione per categoria e per
//           responsabile (dal 231), l'orizzonte a novanta giorni (dall'81/08)
//   lasciato la linea di tendenza. Nel 231 era `62 + i*5 + random*3`: un andamento
//           inventato in un pannello diretto al CdA. Finché non c'è storico si mostra
//           un empty state onesto, e lo storico ora si sta accumulando davvero.
//
// Nessuna libreria di grafici: tutto è SVG e CSS su dati del motore. Recharts pesa 641 KB
// nel prototipo 231, ed è la ragione per cui quel file impiega secondi ad aprirsi.

function adempimentoDaRiga(riga: typeof obligationInstance.$inferSelect): Adempimento | null {
  const template = templatePerCodice(riga.dominio, riga.codice);
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

export type Barra = { readonly etichetta: string; readonly quanti: number; readonly scaduti: number };

/**
 * Il cruscotto di UN'AZIENDA, oppure dell'intero portafoglio quando `aziendaId` è assente.
 *
 * Un solo modulo per due domande diverse: il consulente guarda il portafoglio la mattina e
 * la singola azienda quando la sta lavorando. Il calcolo è lo stesso, cambia l'insieme.
 */
export async function cruscotto(aziendaId?: string) {
  const ctx = await requireStudio();
  const dati = await inCache(ctx.organizationId, `cruscotto:${aziendaId ?? "portafoglio"}`, () =>
    calcolaCruscotto(ctx.organizationId, aziendaId),
  );
  return dati === null ? null : { ...dati, ctx };
}

async function calcolaCruscotto(organizationId: string, aziendaId?: string) {
  const oggi = oggiA();

  const aziende = await db.query.clientCompany.findMany({
    where: aziendaId
      ? and(eq(clientCompany.id, aziendaId), eq(clientCompany.organizationId, organizationId))
      : and(eq(clientCompany.organizationId, organizationId), eq(clientCompany.stato, "active")),
  });
  if (aziende.length === 0) return null;

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

  const aziendaDi = new Map(assessments.map((a) => [a.id, a.clientCompanyId]));
  const attiviPer = new Map<string, Set<Dominio>>();
  for (const m of moduli) {
    if (!m.attivo) continue;
    const s = attiviPer.get(m.clientCompanyId) ?? new Set<Dominio>();
    s.add(m.dominio);
    attiviPer.set(m.clientCompanyId, s);
  }

  const grezzi: Adempimento[] = [];
  for (const riga of istanze) {
    const az = aziendaDi.get(riga.assessmentId);
    if (!az || !attiviPer.get(az)?.has(riga.dominio)) continue;
    const a = adempimentoDaRiga(riga);
    if (a) grezzi.push(a);
  }
  const tutti = risolviTutti(grezzi, oggi);
  if (tutti.length === 0) return null;

  const perDominio = DOMINI.map((d) => {
    const suoi = tutti.filter((a) => a.dominio === d);
    const c = suoi.length > 0 ? conteggi(suoi).perScadenza : null;
    return {
      dominio: d,
      etichetta: ETICHETTE_DOMINIO[d],
      attivo: suoi.length > 0,
      totale: suoi.length,
      conformita: suoi.length > 0 ? conformitaEffettiva(suoi) : null,
      lavoro: suoi.length > 0 ? conformitaLavoro(suoi) : null,
      scadute: c?.Scaduta ?? 0,
      inScadenza: c?.["In scadenza"] ?? 0,
      daProgrammare: c?.["Da programmare"] ?? 0,
      regolari: c?.Regolare ?? 0,
      critici: suoi.length > 0 ? criticiAperti(suoi).length : 0,
      esposizione: suoi.length > 0 ? esposizione(suoi) : null,
      prontezza: suoi.length > 0 ? prontezza(suoi, PRESIDI_CHIAVE[d]) : null,
    };
  });

  /** Distribuzione per una chiave, ordinata per quanti sono in ritardo: si guarda il peggio. */
  const distribuzione = (chiave: (a: AdempimentoRisolto) => string, quante: number): Barra[] => {
    const mappa = new Map<string, { quanti: number; scaduti: number }>();
    for (const a of tutti) {
      const k = chiave(a);
      const v = mappa.get(k) ?? { quanti: 0, scaduti: 0 };
      v.quanti += 1;
      if (a.statoScadenza === "Scaduta") v.scaduti += 1;
      mappa.set(k, v);
    }
    return [...mappa.entries()]
      .map(([etichetta, v]) => ({ etichetta, ...v }))
      .sort((x, y) => y.scaduti - x.scaduti || y.quanti - x.quanti)
      .slice(0, quante);
  };

  return {
    aziende: aziende.map((a) => ({ id: a.id, nome: a.nome })),
    singola: aziendaId ? (aziende[0] ?? null) : null,
    totale: tutti.length,
    perDominio,
    complessivo: {
      conformita: conformitaEffettiva(tutti),
      lavoro: conformitaLavoro(tutti),
      esposizione: esposizione(tutti),
      conteggi: conteggi(tutti).perScadenza,
      critici: criticiAperti(tutti).length,
    },
    agenda: finestre(tutti),
    matrice: matriceRischio(tutti),
    fasce: FASCE_RISCHIO,
    priorita: PRIORITA,
    pesi: PESI,
    perCategoria: distribuzione((a) => a.categoria, 10),
    perRuolo: distribuzione((a) => a.ruolo, 8),
    perPeriodicita: distribuzione((a) => descriviPeriodicita(a.periodicita), 8),
    /**
     * Lo storico non è ancora abbastanza per un andamento. Non si inventa: si dichiara.
     * I tre prototipi generavano la curva con aritmetica sul dato di oggi, e il 231 con
     * `Math.random()`. È il difetto che questo prodotto esiste per non ripetere.
     */
    tendenza: null as null,
  };
}

export type DatiCruscotto = NonNullable<Awaited<ReturnType<typeof cruscotto>>>;
