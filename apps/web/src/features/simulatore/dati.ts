import { and, eq, inArray } from "drizzle-orm";
import {
  ETICHETTE_DOMINIO,
  conformitaEffettiva,
  descriviPeriodicita,
  esposizione,
  oggiA,
  risolviTutti,
  simulaChiusura,
  suggerisciPriorita,
  templatePerCodice,
  type Adempimento,
  type AdempimentoRisolto,
  type Dominio,
} from "@gdpr/engine";
import { db } from "@/lib/db";
import { assessment, clientCompany, companyModule, obligationInstance } from "@/lib/db/schema";
import { requireStudio } from "@/features/auth/guards";
import { adempimentoDaRiga } from "@/features/scadenzario/dati";

// IL SIMULATORE: «se chiudo questi, dove arrivo?»
//
// Trasforma il piano di rimedio da elenco di cose da fare a strumento di negoziazione. Un
// consulente che va davanti a un consiglio di amministrazione a chiedere un budget non ha
// bisogno di dire «ci sono trentanove adempimenti scaduti»: quello lo sanno. Ha bisogno di
// dire «con questi cinque interventi l'esposizione scende da 71 a 48», che è una frase su
// cui si decide.
//
// NON SCRIVE NULLA, e il vincolo è del motore prima che dell'applicazione: `simulaChiusura`
// riceve gli adempimenti, ne fa una copia e calcola su quella. Un test verifica che
// l'insieme di partenza resti intatto. È importante perché la tentazione opposta — «salvo
// lo scenario così lo ritrovo» — trasformerebbe una proiezione in un dato, e il giorno dopo
// nessuno saprebbe più distinguere ciò che è stato fatto da ciò che era stato ipotizzato.

export type VoceSimulabile = {
  readonly codice: string;
  readonly dominio: Dominio;
  readonly titolo: string;
  readonly ruolo: string;
  readonly priorita: string;
  readonly statoScadenza: string;
  readonly scadenza: string | null;
  readonly periodicita: string;
  /** Punti di esposizione che si tolgono chiudendo questo solo adempimento. */
  readonly guadagno: number;
  readonly rischioPesato: number;
};

/** Gli adempimenti di un'azienda, risolti a oggi. Non è un punto d'ingresso: il contesto arriva già verificato. */
async function adempimentiDi(organizationId: string, aziendaId: string) {
  const oggi = oggiA();
  const az = await db.query.clientCompany.findFirst({
    where: and(eq(clientCompany.id, aziendaId), eq(clientCompany.organizationId, organizationId)),
    columns: { id: true, nome: true },
  });
  if (!az) return null;

  const [moduli, assessments] = await Promise.all([
    db.query.companyModule.findMany({ where: eq(companyModule.clientCompanyId, aziendaId) }),
    db.query.assessment.findMany({ where: eq(assessment.clientCompanyId, aziendaId) }),
  ]);
  const attivi = new Set(moduli.filter((m) => m.attivo).map((m) => m.dominio));

  const istanze =
    assessments.length === 0
      ? []
      : await db.query.obligationInstance.findMany({
          where: inArray(
            obligationInstance.assessmentId,
            assessments.map((a) => a.id),
          ),
        });

  const grezzi: Adempimento[] = [];
  for (const riga of istanze) {
    if (!attivi.has(riga.dominio)) continue;
    const a = adempimentoDaRiga(riga);
    if (a) grezzi.push(a);
  }
  return { az, oggi, tutti: risolviTutti(grezzi, oggi) };
}

export async function datiSimulatore(aziendaId: string) {
  const ctx = await requireStudio();
  const base = await adempimentiDi(ctx.organizationId, aziendaId);
  if (!base) return null;
  const { az, oggi, tutti } = base;
  if (tutti.length === 0) return null;

  // I candidati arrivano dal motore, ordinati per rischio pesato — lo stesso criterio con
  // cui l'esposizione è costruita. Il guadagno di ciascuno è misurato simulandolo davvero,
  // non stimato a parte: il numero che il cliente vede viene dallo stesso calcolo che
  // produrrà il risultato finale.
  const suggeriti = suggerisciPriorita(tutti, oggi, 12);
  const perCodice = new Map(tutti.map((a) => [a.codice, a]));

  const candidati: VoceSimulabile[] = suggeriti
    .map((s): VoceSimulabile | null => {
      const a = perCodice.get(s.codice);
      if (!a) return null;
      return {
        codice: a.codice,
        dominio: a.dominio,
        titolo: templatePerCodice(a.dominio, a.codice)?.titolo ?? a.codice,
        ruolo: a.ruolo,
        priorita: a.priorita,
        statoScadenza: a.statoScadenza,
        scadenza: a.scadenza,
        periodicita: descriviPeriodicita(a.periodicita),
        guadagno: s.guadagno,
        rischioPesato: s.rischioPesato,
      };
    })
    .filter((v): v is VoceSimulabile => v !== null);

  const esp = esposizione(tutti);
  const conf = conformitaEffettiva(tutti);

  return {
    ctx,
    azienda: az,
    oggi,
    candidati,
    etichette: ETICHETTE_DOMINIO,
    partenza: {
      conformita: conf.percentuale,
      numeratore: conf.numeratore,
      applicabili: conf.applicabili,
      esposizione: esp.indice,
      giudizio: esp.giudizio,
    },
  };
}

export type Proiezione = {
  readonly conformitaPrima: number | null;
  readonly conformitaDopo: number | null;
  readonly esposizionePrima: number;
  readonly esposizioneDopo: number;
  readonly giudizioDopo: string;
  readonly quanti: number;
  readonly ignorati: readonly string[];
};

/** Il calcolo della proiezione. Legge, non scrive: è una proiezione, non un'operazione. */
export async function proietta(aziendaId: string, codici: readonly string[]): Promise<Proiezione | null> {
  const ctx = await requireStudio();
  const base = await adempimentiDi(ctx.organizationId, aziendaId);
  if (!base) return null;
  const { oggi, tutti } = base;

  const esito = simulaChiusura(tutti, codici, oggi);
  return {
    conformitaPrima: esito.prima.conformita,
    conformitaDopo: esito.dopo.conformita,
    esposizionePrima: esito.prima.esposizione.indice,
    esposizioneDopo: esito.dopo.esposizione.indice,
    giudizioDopo: esito.dopo.esposizione.giudizio,
    quanti: esito.chiusi.length,
    ignorati: esito.ignorati,
  };
}

export type { AdempimentoRisolto };
