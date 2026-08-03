import { and, eq, inArray } from "drizzle-orm";
import { ETICHETTE_DOMINIO, templatePerCodice, type Dominio } from "@gdpr/engine";
import { db } from "@/lib/db";
import { assessment, clientCompany, companyModule, obligationInstance } from "@/lib/db/schema";
import { requireStudio } from "@/features/auth/guards";
import { inCache } from "@/lib/cache";

// LA RICERCA GLOBALE.
//
// L'avevo rifiutata quando serviva solo a riempire una testata: una casella che non cerca
// niente non è un segnaposto, è una bugia. Adesso cerca davvero.
//
// CERCA TRE COSE, e sono le tre che un consulente ha in testa: il nome di un'azienda, il
// codice o il titolo di un adempimento, e il nome di una schermata. Non cerca dentro le
// note né dentro le evidenze — quelle si trovano dall'adempimento a cui appartengono, e
// includerle riempirebbe i risultati di frammenti senza contesto.
//
// L'INDICE SI COSTRUISCE SUL SERVER E SI TIENE IN CACHE. Con quaranta aziende per tre
// moduli le voci sono settemila, e mandarle tutte al browser a ogni apertura della palette
// sarebbe mezzo megabyte per una ricerca che spesso finisce dopo tre caratteri. Si cerca
// sul server e si restituiscono venti risultati.
//
// LA CORRISPONDENZA È PER SOTTOSTRINGA, non fuzzy. Chi cerca «S16» vuole S16, e un
// algoritmo che gli mostra anche S61 perché «contiene le stesse lettere» gli fa perdere
// tempo. Il fuzzy serve quando l'utente non sa cosa cerca; qui lo sa.

export type Risultato = {
  readonly tipo: "azienda" | "adempimento" | "schermata";
  readonly titolo: string;
  readonly sottotitolo: string;
  readonly percorso: string;
  readonly dominio?: Dominio;
  readonly codice?: string;
};

/** Le schermate raggiungibili, che non stanno nel database. */
const SCHERMATE: readonly Risultato[] = [
  { tipo: "schermata", titolo: "Cruscotto", sottotitolo: "come stiamo, sui tre decreti", percorso: "/cruscotto" },
  { tipo: "schermata", titolo: "Portafoglio", sottotitolo: "tutte le aziende assistite", percorso: "/portafoglio" },
  { tipo: "schermata", titolo: "Scadenzario", sottotitolo: "cosa scade, su tutto il portafoglio", percorso: "/scadenzario" },
  { tipo: "schermata", titolo: "Impostazioni", sottotitolo: "marchio, catalogo, utenze", percorso: "/impostazioni" },
];

type VoceIndice = Risultato & { readonly cerca: string };

/**
 * L'indice, calcolato una volta e tenuto in cache per organizzazione.
 *
 * Si invalida con lo stesso marcatore di tutto il resto: quando cambia un'azienda o un
 * adempimento, la ricerca lo sa. Senza, si troverebbe un'azienda archiviata il giorno dopo
 * averla archiviata, ed è il genere di dettaglio che fa perdere fiducia in uno strumento.
 */
async function costruisciIndice(organizationId: string): Promise<VoceIndice[]> {
  const aziende = await db.query.clientCompany.findMany({
    where: and(eq(clientCompany.organizationId, organizationId), eq(clientCompany.stato, "active")),
    columns: { id: true, nome: true, settore: true, sede: true },
  });

  const voci: VoceIndice[] = SCHERMATE.map((s) => ({ ...s, cerca: `${s.titolo} ${s.sottotitolo}`.toLowerCase() }));

  for (const a of aziende) {
    voci.push({
      tipo: "azienda",
      titolo: a.nome,
      sottotitolo: [a.settore, a.sede].filter(Boolean).join(" · ") || "azienda assistita",
      percorso: `/azienda/${a.id}`,
      cerca: `${a.nome} ${a.settore ?? ""} ${a.sede ?? ""}`.toLowerCase(),
    });
  }

  if (aziende.length === 0) return voci;

  const ids = aziende.map((a) => a.id);
  const [moduli, assessments] = await Promise.all([
    db.query.companyModule.findMany({ where: inArray(companyModule.clientCompanyId, ids) }),
    db.query.assessment.findMany({ where: inArray(assessment.clientCompanyId, ids) }),
  ]);
  const attivi = new Set(moduli.filter((m) => m.attivo).map((m) => `${m.clientCompanyId}|${m.dominio}`));
  const aziendaDi = new Map(assessments.map((a) => [a.id, a.clientCompanyId]));
  const nomeDi = new Map(aziende.map((a) => [a.id, a.nome]));

  const istanze =
    assessments.length === 0
      ? []
      : await db.query.obligationInstance.findMany({
          where: inArray(
            obligationInstance.assessmentId,
            assessments.map((a) => a.id),
          ),
          columns: { codice: true, dominio: true, assessmentId: true },
        });

  for (const i of istanze) {
    const aziendaId = aziendaDi.get(i.assessmentId);
    if (!aziendaId || !attivi.has(`${aziendaId}|${i.dominio}`)) continue;
    const t = templatePerCodice(i.dominio, i.codice);
    if (!t) continue;
    const nome = nomeDi.get(aziendaId) ?? "";
    voci.push({
      tipo: "adempimento",
      titolo: t.titolo,
      sottotitolo: `${nome} · ${ETICHETTE_DOMINIO[i.dominio].breve} ${i.codice}`,
      // Si atterra sull'assessment con la ricerca già impostata sul codice: aprire la
      // tabella e lasciare all'utente il compito di ritrovare la riga sarebbe metà lavoro.
      percorso: `/azienda/${aziendaId}/${i.dominio}?q=${i.codice}`,
      dominio: i.dominio,
      codice: i.codice,
      cerca: `${i.codice} ${t.titolo} ${nome} ${t.riferimento}`.toLowerCase(),
    });
  }

  return voci;
}

export async function cerca(query: string): Promise<readonly Risultato[]> {
  const ctx = await requireStudio();
  const q = query.trim().toLowerCase();
  if (q.length < 2) return SCHERMATE;

  const indice = await inCache(ctx.organizationId, "indice-ricerca", () =>
    costruisciIndice(ctx.organizationId),
  );

  // I termini si cercano TUTTI, in qualunque ordine: «dvr ferrarini» deve trovare il DVR di
  // Ferrarini anche se nell'indice l'azienda viene dopo il titolo.
  const termini = q.split(/\s+/).filter(Boolean);
  const trovati = indice.filter((v) => termini.every((t) => v.cerca.includes(t)));

  // L'ordine dei tipi non è alfabetico: chi cerca digita quasi sempre il nome di un'azienda
  // o un codice, e le schermate sono il caso raro. Metterle in cima le farebbe scorrere.
  const peso = { azienda: 0, adempimento: 1, schermata: 2 } as const;
  return trovati
    .sort((a, b) => {
      const p = peso[a.tipo] - peso[b.tipo];
      if (p !== 0) return p;
      // A parità di tipo, prima ciò che comincia con il termine: «S16» prima di «… S16 …».
      const primo = termini[0] ?? "";
      const ai = a.titolo.toLowerCase().startsWith(primo) ? 0 : 1;
      const bi = b.titolo.toLowerCase().startsWith(primo) ? 0 : 1;
      return ai - bi || a.titolo.localeCompare(b.titolo, "it");
    })
    .slice(0, 20)
    // La chiave di ricerca non esce: serve a trovare, non a essere mostrata.
    .map((v): Risultato => ({
      tipo: v.tipo,
      titolo: v.titolo,
      sottotitolo: v.sottotitolo,
      percorso: v.percorso,
      ...(v.dominio ? { dominio: v.dominio } : {}),
      ...(v.codice ? { codice: v.codice } : {}),
    }));
}
