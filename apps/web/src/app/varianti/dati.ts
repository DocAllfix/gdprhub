import {
  CATALOGHI,
  CLIENTI_DIMOSTRATIVI,
  DOMINI,
  ETICHETTE_DOMINIO,
  agenda,
  conformitaEffettiva,
  conteggi,
  costruisciDemo,
  criticiAperti,
  descriviPeriodicita,
  esposizione,
  matriceRischio,
  FASCE_RISCHIO,
  PRIORITA,
  oggiA,
  risolviTutti,
  templatePerCodice,
  type AdempimentoRisolto,
  type Dominio,
} from "@gdpr/engine";

// Dati per la vetrina delle varianti.
//
// Vengono dal MOTORE e non dal database: la pagina deve aprirsi in un istante e senza
// accesso, perché serve a guardare tre direzioni di design una accanto all'altra. Sono
// esattamente gli stessi numeri dell'applicazione vera — 17%, 0%, 44%, esposizione 71 — così
// il confronto è fra i disegni e non fra i contenuti.

const OGGI = oggiA();

const risolti = (d: Dominio): readonly AdempimentoRisolto[] =>
  risolviTutti(costruisciDemo(CATALOGHI[d], CLIENTI_DIMOSTRATIVI[d], OGGI), OGGI);

const AZIENDE = [
  { nome: "Ferrarini Componenti S.r.l.", settore: "Metalmeccanico", sede: "Modena (MO)" },
  { nome: "Adriatica Logistica S.p.A.", settore: "Trasporti", sede: "Ancona (AN)" },
  { nome: "Chimica Padana S.r.l.", settore: "Chimico", sede: "Rovigo (RO)" },
  { nome: "Casearia Monti Sibillini", settore: "Alimentare", sede: "Macerata (MC)" },
  { nome: "Edilcostruzioni Tirreno S.p.A.", settore: "Costruzioni", sede: "Livorno (LI)" },
  { nome: "Tessitura Biellese S.p.A.", settore: "Tessile", sede: "Biella (BI)" },
] as const;

/** Sposta gli indici in modo deterministico: le aziende devono avere numeri diversi. */
function variato(base: readonly AdempimentoRisolto[], scarto: number): AdempimentoRisolto[] {
  return base.map((a, i) =>
    (i + scarto) % 7 === 0 && a.stato !== "Completata" ? { ...a, stato: "Completata" as const } : a,
  );
}

export function datiVarianti() {
  const perDominio = Object.fromEntries(DOMINI.map((d) => [d, risolti(d)])) as Record<
    Dominio,
    readonly AdempimentoRisolto[]
  >;
  const tutti = DOMINI.flatMap((d) => perDominio[d]);

  const righe = AZIENDE.map((az, i) => {
    const suoi = DOMINI.map((d) => ({ dominio: d, adempimenti: variato(perDominio[d], i * 3) }));
    const uniti = suoi.flatMap((s) => s.adempimenti);
    return {
      ...az,
      moduli: suoi.map(({ dominio, adempimenti }) => {
        const c = conteggi(adempimenti).perScadenza;
        return {
          dominio,
          conformita: conformitaEffettiva(adempimenti),
          scadute: c.Scaduta,
          inScadenza: c["In scadenza"],
          regolari: c.Regolare,
          daProgrammare: c["Da programmare"],
          totale: adempimenti.length,
        };
      }),
      conformita: conformitaEffettiva(uniti),
      esposizione: esposizione(uniti).indice,
    };
  });

  const prossime = agenda(tutti)
    .slice(0, 8)
    .map((v) => ({
      dominio: v.dominio,
      codice: v.codice,
      titolo: templatePerCodice(v.dominio, v.codice)?.titolo ?? v.codice,
      ruolo: v.ruolo,
      priorita: v.priorita,
      scadenza: v.scadenza,
      giorni: v.giorni,
      statoScadenza: v.statoScadenza,
      stato: v.stato,
      periodicita: descriviPeriodicita(v.periodicita),
      azienda: AZIENDE[v.codice.charCodeAt(1) % AZIENDE.length]!.nome,
    }));

  return {
    righe,
    prossime,
    etichette: ETICHETTE_DOMINIO,
    domini: DOMINI,
    complessivo: {
      conformita: conformitaEffettiva(tutti),
      esposizione: esposizione(tutti),
      conteggi: conteggi(tutti).perScadenza,
      critici: criticiAperti(tutti).length,
    },
    perModulo: DOMINI.map((d) => {
      const suoi = perDominio[d];
      const c = conteggi(suoi).perScadenza;
      return {
        dominio: d,
        etichetta: ETICHETTE_DOMINIO[d],
        conformita: conformitaEffettiva(suoi),
        scadute: c.Scaduta,
        inScadenza: c["In scadenza"],
        regolari: c.Regolare,
        daProgrammare: c["Da programmare"],
        totale: suoi.length,
      };
    }),
    matrice: matriceRischio(tutti),
    fasce: FASCE_RISCHIO,
    priorita: PRIORITA,
  };
}

export type DatiVarianti = ReturnType<typeof datiVarianti>;
