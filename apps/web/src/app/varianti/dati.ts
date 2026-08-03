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

const MESI_BREVI = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];

export function datiVarianti() {
  const perDominio = Object.fromEntries(DOMINI.map((d) => [d, risolti(d)])) as Record<
    Dominio,
    readonly AdempimentoRisolto[]
  >;
  const tutti = DOMINI.flatMap((d) => perDominio[d]);
  const tuttoIlPortafoglio = AZIENDE.flatMap((_, i) => DOMINI.flatMap((d) => variato(perDominio[d], i * 3)));

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

    /** La cosa peggiore adesso: serve alla scheda che nomina il problema. */
    peggiore: (() => {
      const v = agenda(tutti)[0];
      if (!v) return null;
      return {
        dominio: v.dominio,
        codice: v.codice,
        titolo: templatePerCodice(v.dominio, v.codice)?.titolo ?? v.codice,
        giorni: v.giorni,
        azienda: AZIENDE[0]!.nome,
        ruolo: v.ruolo,
      };
    })(),

    /** Righe dell'assessment 81/08, per l'anteprima della schermata di lavoro. */
    assessment: perDominio.d81.slice(0, 9).map((a) => ({
      codice: a.codice,
      titolo: templatePerCodice("d81", a.codice)?.titolo ?? a.codice,
      categoria: templatePerCodice("d81", a.codice)?.categoria ?? "",
      ruolo: a.ruolo,
      periodicita: descriviPeriodicita(a.periodicita),
      priorita: a.priorita,
      stato: a.stato,
      statoScadenza: a.statoScadenza,
      scadenza: a.scadenza,
      giorni: a.giorniAllaScadenza,
    })),

    /** Distribuzioni per i pannelli secondari del cruscotto. */
    perCategoria: (() => {
      const m = new Map<string, { quanti: number; scaduti: number }>();
      for (const a of tutti) {
        const k = a.categoria;
        const v = m.get(k) ?? { quanti: 0, scaduti: 0 };
        v.quanti += 1;
        if (a.statoScadenza === "Scaduta") v.scaduti += 1;
        m.set(k, v);
      }
      return [...m.entries()]
        .map(([etichetta, v]) => ({ etichetta, ...v }))
        .sort((x, y) => y.scaduti - x.scaduti)
        .slice(0, 6);
    })(),

    /** Chi è il collo di bottiglia. Nei prototipi era una torta: una torta con nove spicchi
     *  non si legge, e la domanda vera è «chi ne ha di più», che è un ordinamento. */
    perRuolo: (() => {
      const m = new Map<string, { quanti: number; scaduti: number }>();
      for (const a of tuttoIlPortafoglio) {
        const v = m.get(a.ruolo) ?? { quanti: 0, scaduti: 0 };
        v.quanti += 1;
        if (a.statoScadenza === "Scaduta") v.scaduti += 1;
        m.set(a.ruolo, v);
      }
      return [...m.entries()]
        .map(([etichetta, v]) => ({ etichetta, ...v }))
        .sort((x, y) => y.quanti - x.quanti)
        .slice(0, 7);
    })(),

    /** IL CARICO DEI PROSSIMI DODICI MESI, per dominio.
     *
     *  È il grafico che nei prototipi era finto: il «trend compliance» a sei mesi veniva da
     *  `62 + i*5 + Math.random()*3`, cioè da niente. Questo invece è calcolato, ed è anche
     *  la domanda più utile delle due: non «come sono andato», che richiede uno storico che
     *  una istanza nuova non ha, ma «quando mi cade addosso il lavoro», che si deriva dalle
     *  periodicità e si sa dal primo giorno. */
    caricoMensile: (() => {
      // Le date del motore sono stringhe ISO, non oggetti Date: si affettano invece di
      // parsarle, e così non esiste nemmeno la possibilità di un fuso orario di mezzo.
      const annoOggi = Number(OGGI.slice(0, 4));
      const meseOggi = Number(OGGI.slice(5, 7)) - 1;
      const mesi = Array.from({ length: 12 }, (_, i) => {
        const assoluto = meseOggi + i;
        const anno = annoOggi + Math.floor(assoluto / 12);
        const mese = ((assoluto % 12) + 12) % 12;
        return {
          chiave: `${anno}-${mese}`,
          etichetta: MESI_BREVI[mese]!,
          anno,
          per: { gdpr: 0, d231: 0, d81: 0 } as Record<Dominio, number>,
          totale: 0,
        };
      });
      const indice = new Map(mesi.map((m) => [m.chiave, m]));
      for (const a of tuttoIlPortafoglio) {
        if (!a.scadenza) continue;
        const m = indice.get(`${Number(a.scadenza.slice(0, 4))}-${Number(a.scadenza.slice(5, 7)) - 1}`);
        if (!m) continue;
        m.per[a.dominio] += 1;
        m.totale += 1;
      }
      return mesi;
    })(),
  };
}

export type DatiVarianti = ReturnType<typeof datiVarianti>;
