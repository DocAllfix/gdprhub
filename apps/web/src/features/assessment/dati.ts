import { and, desc, eq } from "drizzle-orm";
import {
  CATALOGHI,
  ETICHETTE_DOMINIO,
  conformitaEffettiva,
  conformitaLavoro,
  conteggi,
  criticiAperti,
  descriviPeriodicita,
  esposizione,
  lettoDa,
  oggiA,
  risolvi,
  templatePerCodice,
  type Adempimento,
  type AdempimentoRisolto,
  type Dominio,
  type Priorita,
  type StatoLavoro,
} from "@gdpr/engine";
import { db } from "@/lib/db";
import {
  assessment,
  clientCompany,
  companyModule,
  instanceHistory,
  obligationInstance,
} from "@/lib/db/schema";
import { requireStudio } from "@/features/auth/guards";

// Lettura dell'assessment di un dominio per un'azienda.
//
// UNA SOLA VISTA PER TRE DECRETI. Il modello dati è uno, quindi la schermata è una: cambia
// il contenuto e l'accento, mai la disposizione. Il consulente impara l'interfaccia una
// volta, e ogni difetto si corregge in un posto solo invece che in tre.

export type RigaAssessment = AdempimentoRisolto & {
  readonly id: string;
  readonly titolo: string;
  readonly descrizione: string;
  readonly nota: string | null;
  readonly riferimento: string;
  readonly periodicitaTesto: string;
  readonly motivazione: string | null;
  readonly note: string | null;
  /** Codici degli adempimenti di altri decreti che leggono questo presidio. */
  readonly lettoDa: readonly { readonly dominio: Dominio; readonly codice: string }[];
};

/** Riga del database tradotta nel modello del motore. Gemella di quella del portafoglio. */
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

export async function assessmentDi(aziendaId: string, dominio: Dominio) {
  const ctx = await requireStudio();
  const oggi = oggiA();

  // L'identificativo arriva dall'URL: la clausola porta sempre anche l'organizzazione.
  const azienda = await db.query.clientCompany.findFirst({
    where: and(eq(clientCompany.id, aziendaId), eq(clientCompany.organizationId, ctx.organizationId)),
  });
  if (!azienda) return null;

  const modulo = await db.query.companyModule.findFirst({
    where: and(eq(companyModule.clientCompanyId, aziendaId), eq(companyModule.dominio, dominio)),
  });

  const suo = await db.query.assessment.findFirst({
    where: and(eq(assessment.clientCompanyId, aziendaId), eq(assessment.dominio, dominio)),
  });
  if (!suo) {
    return {
      ctx,
      azienda,
      dominio,
      attivo: Boolean(modulo?.attivo),
      assessment: null,
      righe: [] as RigaAssessment[],
    };
  }

  const istanze = await db.query.obligationInstance.findMany({
    where: eq(obligationInstance.assessmentId, suo.id),
  });

  // L'ordine è quello del catalogo, che è l'ordine in cui il professionista conosce la
  // materia. Riordinare alfabeticamente sarebbe corretto e disorientante.
  const posizione = new Map(CATALOGHI[dominio].map((t, i) => [t.codice, i]));

  const righe: RigaAssessment[] = istanze
    .map((riga): RigaAssessment | null => {
      const adempimento = adempimentoDaRiga(riga);
      const template = templatePerCodice(dominio, riga.codice);
      if (!adempimento || !template) return null;
      return {
        ...risolvi(adempimento, oggi),
        id: riga.id,
        titolo: template.titolo,
        descrizione: template.descrizione,
        nota: template.nota,
        riferimento: template.riferimento,
        periodicitaTesto: descriviPeriodicita(adempimento.periodicita),
        motivazione: riga.motivazioneNonApplicabile,
        note: riga.note,
        lettoDa: lettoDa(dominio, riga.codice).map((c) => c.a),
      };
    })
    .filter((r): r is RigaAssessment => r !== null)
    .sort((a, b) => (posizione.get(a.codice) ?? 999) - (posizione.get(b.codice) ?? 999));

  return {
    ctx,
    azienda,
    dominio,
    attivo: Boolean(modulo?.attivo),
    assessment: suo,
    righe,
    etichetta: ETICHETTE_DOMINIO[dominio],
    misure: {
      effettiva: conformitaEffettiva(righe),
      lavoro: conformitaLavoro(righe),
      scadenze: conteggi(righe).perScadenza,
      lavori: conteggi(righe).perLavoro,
      critici: criticiAperti(righe).length,
      esposizione: esposizione(righe),
    },
  };
}

export type VoceStorico = {
  readonly campo: string;
  readonly da: string | null;
  readonly a: string | null;
  readonly quando: Date;
};

/**
 * Lo storico di un adempimento. È append-only per trigger sul database, non per disciplina
 * applicativa: è ciò che rende il trend vero invece che simulato, e ciò che si mostra a un
 * ispettore quando chiede da quando una cosa è così.
 */
export async function storicoDi(istanzaId: string): Promise<readonly VoceStorico[]> {
  const ctx = await requireStudio();
  const voci = await db.query.instanceHistory.findMany({
    where: and(
      eq(instanceHistory.obligationInstanceId, istanzaId),
      eq(instanceHistory.organizationId, ctx.organizationId),
    ),
    orderBy: [desc(instanceHistory.at)],
    limit: 40,
  });
  return voci.map((v) => ({ campo: v.campo, da: v.da, a: v.a, quando: v.at }));
}

export type { StatoLavoro, Priorita };
