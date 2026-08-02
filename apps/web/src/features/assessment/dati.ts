import { and, desc, eq, inArray } from "drizzle-orm";
import {
  CATALOGHI,
  ETICHETTE_DOMINIO,
  conformitaEffettiva,
  conformitaLavoro,
  conteggi,
  criticiAperti,
  descriviPeriodicita,
  esposizione,
  codiciDelegati,
  letturePer,
  lettoDa,
  oggiA,
  risolvi,
  risolviTutti,
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
  /**
   * Valorizzato quando questo adempimento è PRESIDIATO DA UN ALTRO MODULO.
   *
   * Il DVR si censisce una volta nell'81/08 e il 231 lo legge: qui la riga porta lo stato
   * reale del proprietario e non è modificabile, perché modificarla creerebbe due verità
   * sullo stesso fatto. È l'«adempimento unico, doppia lettura» deciso col committente.
   */
  readonly letturaDa: {
    readonly dominio: Dominio;
    readonly codice: string;
    readonly titolo: string;
    readonly riferimento: string;
  } | null;
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

  // Per risolvere le letture servono anche gli adempimenti DEGLI ALTRI moduli attivi: il
  // presidio condiviso vive lì, e qui se ne mostra lo stato reale.
  const tuttiIModuli = await db.query.companyModule.findMany({
    where: eq(companyModule.clientCompanyId, aziendaId),
  });
  const dominiAttivi = tuttiIModuli.filter((m) => m.attivo).map((m) => m.dominio);

  const altriAssessment = await db.query.assessment.findMany({
    where: eq(assessment.clientCompanyId, aziendaId),
  });
  const istanzeAltrui =
    altriAssessment.length === 0
      ? []
      : await db.query.obligationInstance.findMany({
          where: inArray(
            obligationInstance.assessmentId,
            altriAssessment.map((a) => a.id),
          ),
        });
  const contesto = risolviTutti(
    istanzeAltrui
      .map(adempimentoDaRiga)
      .filter((a): a is Adempimento => a !== null)
      .filter((a) => dominiAttivi.includes(a.dominio)),
    oggi,
  );

  // I codici che questo modulo DELEGA a un altro: il proprietario è attivo, quindi si legge
  // il suo stato invece di chiedere due volte la stessa cosa.
  const delegati = new Set(codiciDelegati(dominio, dominiAttivi));

  const righe: RigaAssessment[] = istanze
    .map((riga): RigaAssessment | null => {
      const adempimento = adempimentoDaRiga(riga);
      const template = templatePerCodice(dominio, riga.codice);
      if (!adempimento || !template) return null;

      const letture = delegati.has(riga.codice)
        ? letturePer(dominio, riga.codice, contesto, dominiAttivi)
        : [];
      const prima = letture[0];

      // Quando il presidio è di un altro modulo, la riga mostra lo stato DEL PROPRIETARIO.
      // Mostrare quello locale significherebbe dire che il DVR è «da fare» nel 231 mentre
      // nell'81/08 è chiuso da sei mesi: due verità sullo stesso fatto.
      const risolto = prima ? prima.origine : risolvi(adempimento, oggi);

      return {
        ...risolto,
        // Il codice e il dominio restano quelli di QUESTA riga: la provenienza si dichiara
        // a parte, non si maschera.
        codice: riga.codice,
        dominio,
        categoria: template.categoria,
        ruolo: template.ruolo,
        id: riga.id,
        titolo: template.titolo,
        descrizione: template.descrizione,
        nota: template.nota,
        riferimento: template.riferimento,
        periodicitaTesto: descriviPeriodicita(prima ? prima.origine.periodicita : adempimento.periodicita),
        motivazione: riga.motivazioneNonApplicabile,
        note: riga.note,
        lettoDa: lettoDa(dominio, riga.codice).map((c) => c.a),
        letturaDa: prima
          ? {
              dominio: prima.origine.dominio,
              codice: prima.origine.codice,
              titolo:
                templatePerCodice(prima.origine.dominio, prima.origine.codice)?.titolo ??
                prima.origine.codice,
              riferimento: prima.collegamento.riferimento,
            }
          : null,
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
