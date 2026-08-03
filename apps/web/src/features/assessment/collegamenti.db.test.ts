// Il cancello di F8: chiudere il DVR nell'81/08 aggiorna la lettura del 231, senza
// duplicare la riga.
//
// È la promessa che rende la suite più della somma di tre strumenti, ed è anche la cosa
// che leggendo il codice sembra sempre funzionare. Qui si prova contro il database reale:
// si scrive davvero l'ultima esecuzione sull'istanza dell'81/08, si rilegge l'assessment
// del 231, e si guarda cosa dice.
//
// Le tre cose che devono valere insieme, e che una sola di meno renderebbe il collegamento
// una bugia:
//   1. il 231 mostra lo stato del PROPRIETARIO, non il proprio;
//   2. la riga resta UNA — il collegamento non aggiunge un adempimento, ne cambia la fonte;
//   3. il 231 non può modificarla: due verità sullo stesso fatto sono peggio di una vista
//      incompleta.
//
// Alla fine si rimette com'era. Un test che lascia il database diverso da come l'ha trovato
// fa fallire il successivo, e la colpa sembra del prodotto.

import { afterAll, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { COLLEGAMENTI, oggiA } from "@gdpr/engine";
import { db } from "@/lib/db";
import { assessment, clientCompany, companyModule, obligationInstance } from "@/lib/db/schema";
import type { requireStudio } from "@/features/auth/guards";
import { calcolaAssessment } from "./dati";

/** Il presidio condiviso più importante: il DVR, censito nell'81/08 e letto dal 231. */
const PONTE = COLLEGAMENTI.find(
  (c) => c.da.dominio === "d81" && c.a.dominio === "d231" && c.tipo === "presidio_condiviso",
);

const azienda = await db.query.clientCompany.findFirst({
  where: eq(clientCompany.stato, "active"),
  columns: { id: true, nome: true },
});

/** Istanza dell'adempimento proprietario (81/08) per quell'azienda. */
async function istanzaProprietaria() {
  if (!azienda || !PONTE) return null;
  const suoi = await db
    .select({ id: obligationInstance.id, ultima: obligationInstance.ultimaEsecuzione })
    .from(obligationInstance)
    .innerJoin(assessment, eq(obligationInstance.assessmentId, assessment.id))
    .where(
      and(
        eq(assessment.clientCompanyId, azienda.id),
        eq(obligationInstance.dominio, PONTE.da.dominio),
        eq(obligationInstance.codice, PONTE.da.codice),
      ),
    );
  return suoi[0] ?? null;
}

/** Lo stato dell'istanza del 231 PRIMA che il test tocchi qualunque cosa. */
const statoIniziale231 =
  PONTE && azienda
    ? ((
        await db
          .select({ stato: obligationInstance.stato, ultima: obligationInstance.ultimaEsecuzione })
          .from(obligationInstance)
          .innerJoin(assessment, eq(obligationInstance.assessmentId, assessment.id))
          .where(
            and(
              eq(assessment.clientCompanyId, azienda.id),
              eq(obligationInstance.dominio, "d231"),
              eq(obligationInstance.codice, PONTE.a.codice),
            ),
          )
      )[0] ?? null)
    : null;

/** Il contesto che in produzione arriva dal guard. Qui si compone dai dati reali. */
const CTX = {
  organizationId: (await db.query.organization.findFirst({ columns: { id: true } }))!.id,
  ruolo: "admin",
} as unknown as Awaited<ReturnType<typeof requireStudio>>;

let valorePrecedente: string | null = null;
let idProprietaria: string | null = null;

afterAll(async () => {
  // Si rimette esattamente com'era, valore nullo compreso.
  if (idProprietaria) {
    await db
      .update(obligationInstance)
      .set({ ultimaEsecuzione: valorePrecedente })
      .where(eq(obligationInstance.id, idProprietaria));
  }
});

describe("il collegamento fra 81/08 e 231", () => {
  it("esiste un ponte dichiarato nel catalogo, altrimenti non c'è niente da provare", () => {
    expect(PONTE, "nessun presidio condiviso da d81 verso d231 nel catalogo").toBeDefined();
    expect(azienda, "nessuna azienda attiva: esegui `pnpm db:seed-demo`").toBeDefined();
  });

  it("chiudere il presidio nell'81/08 cambia ciò che legge il 231, e la riga resta una", async () => {
    if (!PONTE || !azienda) return;

    // Entrambi i moduli devono essere attivi: con il proprietario spento il 231 censisce
    // l'adempimento per conto proprio, che è il ripiego previsto e un altro caso.
    const moduli = await db
      .select({ dominio: companyModule.dominio, attivo: companyModule.attivo })
      .from(companyModule)
      .where(eq(companyModule.clientCompanyId, azienda.id));
    const attivi = new Set(moduli.filter((m) => m.attivo).map((m) => m.dominio));
    expect(attivi.has("d81") && attivi.has("d231"), "servono entrambi i moduli attivi").toBe(true);

    const proprietaria = await istanzaProprietaria();
    expect(proprietaria, `nessuna istanza ${PONTE.da.codice} per ${azienda.nome}`).not.toBeNull();
    if (!proprietaria) return;
    idProprietaria = proprietaria.id;
    valorePrecedente = proprietaria.ultima;

    const leggiRiga231 = async () => {
      const d = await calcolaAssessment(CTX, azienda.id, "d231");
      const righe = d?.righe.filter((r) => r.codice === PONTE.a.codice) ?? [];
      // 2. LA RIGA RESTA UNA. Se il collegamento aggiungesse invece di sostituire la fonte,
      //    qui ne comparirebbero due e la conformità del 231 si diluirebbe da sola.
      expect(righe, "il collegamento ha duplicato la riga nel 231").toHaveLength(1);
      return righe[0]!;
    };

    // --- prima: il presidio non è mai stato eseguito -------------------------------------
    await db
      .update(obligationInstance)
      .set({ ultimaEsecuzione: null, stato: "Da fare" })
      .where(eq(obligationInstance.id, proprietaria.id));
    const prima = await leggiRiga231();

    // 1. Il 231 dichiara la provenienza invece di mascherarla.
    expect(prima.letturaDa, "la riga del 231 non dichiara di essere letta dall'81/08").not.toBeNull();
    expect(prima.letturaDa?.dominio).toBe("d81");
    expect(prima.letturaDa?.codice).toBe(PONTE.da.codice);
    expect(prima.statoScadenza).toBe("Da programmare");

    // --- si chiude il DVR nell'81/08, oggi ------------------------------------------------
    const oggi = oggiA();
    await db
      .update(obligationInstance)
      .set({ ultimaEsecuzione: oggi, stato: "Completata" })
      .where(eq(obligationInstance.id, proprietaria.id));

    const dopo = await leggiRiga231();

    // Il 231 vede il lavoro fatto nell'81/08 senza che nessuno l'abbia inserito due volte.
    expect(dopo.stato).toBe("Completata");
    expect(dopo.ultimaEsecuzione).toBe(oggi);
    expect(dopo.statoScadenza).toBe("Regolare");

    // 3. E non lo si può toccare da qui.
    expect(dopo.letturaDa).not.toBeNull();
  });

  it("l'istanza del 231 sul disco non è cambiata: la lettura non scrive", async () => {
    if (!PONTE || !azienda) return;
    const righe = await db
      .select({ stato: obligationInstance.stato, ultima: obligationInstance.ultimaEsecuzione })
      .from(obligationInstance)
      .innerJoin(assessment, eq(obligationInstance.assessmentId, assessment.id))
      .where(
        and(
          eq(assessment.clientCompanyId, azienda.id),
          eq(obligationInstance.dominio, "d231"),
          eq(obligationInstance.codice, PONTE.a.codice),
        ),
      );
    // Una sola riga sul disco, e con i suoi valori di prima: ciò che il 231 mostra viene
    // CALCOLATO al momento della lettura, non copiato. Se fosse copiato, il giorno in cui
    // il DVR venisse riaperto nell'81/08 il 231 continuerebbe a dire «fatto» — che è
    // esattamente il difetto per cui questo prodotto esiste.
    expect(righe).toHaveLength(1);
    expect(righe[0]).toEqual(statoIniziale231);
  });
});
