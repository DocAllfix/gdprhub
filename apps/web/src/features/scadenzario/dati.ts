import { and, eq, inArray } from "drizzle-orm";
import {
  DOMINI,
  agenda,
  descriviPeriodicita,
  finestre,
  oggiA,
  risolviTutti,
  senzaScadenza,
  templatePerCodice,
  type Adempimento,
  type AdempimentoRisolto,
  type Dominio,
} from "@legisboard/engine";
import { db } from "@/lib/db";
import { assessment, clientCompany, companyModule, obligationInstance } from "@/lib/db/schema";
import { requireStudio } from "@/features/auth/guards";
import { inCache } from "@/lib/cache";

// LO SCADENZARIO UNIFICATO — il pezzo che rende la suite più della somma dei tre strumenti.
//
// Un consulente non pensa «oggi faccio GDPR»: pensa «cosa scade questa settimana». Oggi apre
// tre strumenti e incrocia a mano. Qui è una lista sola, su tutto il portafoglio, ordinata
// per urgenza, con la pastiglia del decreto e il nome dell'azienda.
//
// Attraversa DUE dimensioni insieme, e questo nessun concorrente lo fa: i tre decreti e le
// quaranta aziende. È l'unica schermata da cui si può rispondere a «cosa devo fare lunedì».

export type VoceScadenzario = AdempimentoRisolto & {
  readonly istanzaId: string;
  readonly aziendaId: string;
  readonly azienda: string;
  readonly titolo: string;
  readonly periodicitaTesto: string;
  readonly giorni: number;
};

export function adempimentoDaRiga(riga: typeof obligationInstance.$inferSelect): Adempimento | null {
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

/**
 * Tutte le scadenze dello studio, su tutte le aziende e tutti i moduli attivi.
 *
 * Una query per tabella e nessuna per riga: con quaranta aziende per tre moduli sono circa
 * settemila adempimenti, e farne una query per azienda significherebbe quaranta viaggi verso
 * il database prima di disegnare la prima riga.
 */
export async function scadenzario() {
  const ctx = await requireStudio();
  const dati = await inCache(ctx.organizationId, "scadenzario", () => calcolaScadenzario(ctx.organizationId));
  return { ...dati, ctx };
}

async function calcolaScadenzario(organizationId: string) {
  const oggi = oggiA();

  const aziende = await db.query.clientCompany.findMany({
    where: and(eq(clientCompany.organizationId, organizationId), eq(clientCompany.stato, "active")),
  });
  if (aziende.length === 0) {
    return {
      voci: [] as VoceScadenzario[],
      senzaData: [] as VoceScadenzario[],
      aziende: [] as { id: string; nome: string }[],
      finestre: { scadute: [], entro7: [], entro30: [], entro90: [] } as ReturnType<typeof finestre>,
      domini: DOMINI,
    };
  }

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

  const nomePerAzienda = new Map(aziende.map((a) => [a.id, a.nome]));
  const aziendaDiAssessment = new Map(assessments.map((a) => [a.id, a.clientCompanyId]));
  const attiviPer = new Map<string, Set<Dominio>>();
  for (const m of moduli) {
    if (!m.attivo) continue;
    const s = attiviPer.get(m.clientCompanyId) ?? new Set<Dominio>();
    s.add(m.dominio);
    attiviPer.set(m.clientCompanyId, s);
  }

  // Si accumula per azienda perché l'agenda va calcolata sull'insieme di una sola azienda:
  // l'ordinamento a parità di giorni guarda la priorità, e mischiare le aziende prima di
  // quel passaggio produrrebbe un ordine arbitrario fra clienti diversi.
  const voci: VoceScadenzario[] = [];
  const senzaData: VoceScadenzario[] = [];

  const perAzienda = new Map<string, AdempimentoRisolto[]>();
  const istanzaPerChiave = new Map<string, string>();

  for (const riga of istanze) {
    const aziendaId = aziendaDiAssessment.get(riga.assessmentId);
    if (!aziendaId) continue;
    // I moduli spenti restano nel database ma non nell'agenda: il consulente li ha esclusi.
    if (!attiviPer.get(aziendaId)?.has(riga.dominio)) continue;
    const adempimento = adempimentoDaRiga(riga);
    if (!adempimento) continue;
    const elenco = perAzienda.get(aziendaId) ?? [];
    elenco.push(...risolviTutti([adempimento], oggi));
    perAzienda.set(aziendaId, elenco);
    istanzaPerChiave.set(`${aziendaId}|${riga.dominio}|${riga.codice}`, riga.id);
  }

  for (const [aziendaId, adempimenti] of perAzienda) {
    const azienda = nomePerAzienda.get(aziendaId) ?? "";
    const arricchisci = (a: AdempimentoRisolto, giorni: number): VoceScadenzario => ({
      ...a,
      istanzaId: istanzaPerChiave.get(`${aziendaId}|${a.dominio}|${a.codice}`) ?? "",
      aziendaId,
      azienda,
      titolo: templatePerCodice(a.dominio, a.codice)?.titolo ?? a.codice,
      periodicitaTesto: descriviPeriodicita(a.periodicita),
      giorni,
    });

    for (const v of agenda(adempimenti)) voci.push(arricchisci(v, v.giorni));
    // Presidi continui e mai programmati: vanno mostrati, ma non in agenda. Confonderli
    // riempirebbe lo scadenzario di righe che nessuno può chiudere entro una data.
    for (const a of senzaScadenza(adempimenti)) senzaData.push(arricchisci(a, Number.MAX_SAFE_INTEGER));
  }

  voci.sort((a, b) => a.giorni - b.giorni || a.azienda.localeCompare(b.azienda));
  senzaData.sort((a, b) => a.azienda.localeCompare(b.azienda) || a.codice.localeCompare(b.codice));

  const tutte = [...perAzienda.values()].flat();

  return {
    voci,
    senzaData,
    aziende: aziende.map((a) => ({ id: a.id, nome: a.nome })),
    finestre: finestre(tutte),
    domini: DOMINI,
  };
}
