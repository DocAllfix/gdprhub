import { and, desc, eq } from "drizzle-orm";
import {
  calcolaTermine,
  registroPerTipo,
  type DefinizioneRegistro,
  type Dominio,
  type Termine,
  type TipoRegistro,
} from "@gdpr/engine";
import { db } from "@/lib/db";
import { clientCompany, companyModule, registro, user } from "@/lib/db/schema";
import { requireStudio } from "@/features/auth/guards";

// LA LETTURA DEI REGISTRI.
//
// Una funzione sola per undici registri, parametrica sul tipo. Non è una scorciatoia: i
// registri condividono tutto ciò che il prodotto tratta — appartenenza, azienda, data del
// fatto, termine, stato — e differiscono solo nel contenuto. Undici funzioni quasi identiche
// sarebbero undici punti in cui dimenticarsi l'`organization_id`, e ne basta uno.
//
// IL TERMINE SI CALCOLA QUI, chiamando il motore, e non si legge dal database. Un termine
// persistito è un termine che diventa falso alle 00:01 del giorno dopo, e nessuno lo
// aggiorna: la scadenza si deriva sempre, come per gli adempimenti.

export type VoceRegistro = {
  readonly id: string;
  readonly numero: string;
  readonly titolo: string;
  readonly descrizione: string | null;
  readonly stato: string;
  readonly conosciutoIl: Date;
  readonly avvenutoIl: Date | null;
  readonly assoltoIl: Date | null;
  readonly esito: string | null;
  readonly dettagli: Record<string, unknown>;
  readonly apertoDa: string | null;
  readonly termine: Termine;
};

/** La data di validità propria della voce, se il registro ne ha una. */
function validitaDi(def: DefinizioneRegistro, dettagli: Record<string, unknown>): Date | null {
  if (def.termine.tipo !== "validita") return null;
  // Ogni registro a validità ha un campo data che la porta: si trova per tipo, non per nome
  // convenzionale, così aggiungere un registro non richiede di ricordarsi una convenzione.
  const campo = def.campi.find((c) => c.tipo === "data" && /scadenz|valid/i.test(c.chiave));
  const valore = campo ? dettagli[campo.chiave] : null;
  if (typeof valore !== "string" || valore.length < 8) return null;
  const d = new Date(valore);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function registroDi(aziendaId: string, tipo: string) {
  const ctx = await requireStudio();
  const def = registroPerTipo(tipo);
  if (!def) return null;

  const azienda = await db.query.clientCompany.findFirst({
    where: and(eq(clientCompany.id, aziendaId), eq(clientCompany.organizationId, ctx.organizationId)),
    columns: { id: true, nome: true },
  });
  if (!azienda) return null;

  // I moduli attivi servono ai legami fra registri: un avviso sul flusso all'OdV mostrato
  // a un'azienda senza modello 231 è rumore su un obbligo che quell'azienda non ha.
  const moduli = await db.query.companyModule.findMany({
    where: eq(companyModule.clientCompanyId, aziendaId),
  });
  const moduliAttivi = moduli.filter((m) => m.attivo).map((m) => m.dominio as Dominio);

  // UN REGISTRO DI UN MODULO SPENTO NON ESISTE, per la stessa ragione per cui la scheda
  // azienda non lo elenca: un'azienda senza modello 231 non deve poter aprire un flusso
  // verso un Organismo di Vigilanza che non ha. Nasconderlo nell'indice e lasciarlo
  // raggiungibile scrivendo l'indirizzo sarebbe una coerenza a metà, e la metà che manca è
  // quella che scrive nel database.
  if (!moduliAttivi.includes(def.dominio)) return null;

  const righe = await db
    .select({
      id: registro.id,
      numero: registro.numero,
      titolo: registro.titolo,
      descrizione: registro.descrizione,
      stato: registro.stato,
      conosciutoIl: registro.conosciutoIl,
      avvenutoIl: registro.avvenutoIl,
      assoltoIl: registro.assoltoIl,
      esito: registro.esito,
      dettagli: registro.dettagli,
      apertoDa: user.name,
    })
    .from(registro)
    .leftJoin(user, eq(registro.apertoDa, user.id))
    .where(
      and(
        eq(registro.clientCompanyId, aziendaId),
        eq(registro.tipo, tipo),
        eq(registro.organizationId, ctx.organizationId),
      ),
    )
    .orderBy(desc(registro.conosciutoIl));

  const adesso = new Date();
  const voci: VoceRegistro[] = righe.map((r) => ({
    ...r,
    dettagli: r.dettagli ?? {},
    termine: calcolaTermine(
      tipo as TipoRegistro,
      {
        conosciutoIl: r.conosciutoIl,
        assoltoIl: r.assoltoIl,
        stato: r.stato,
        validoFinoA: validitaDi(def, r.dettagli ?? {}),
        prorogato: Boolean((r.dettagli ?? {})["proroga"]),
      },
      adesso,
    ),
  }));

  return { ctx, azienda, def, voci, moduliAttivi };
}

/** Quante voci richiedono un intervento adesso, per registro. Serve alla scheda azienda. */
export async function sommarioRegistri(aziendaId: string) {
  const ctx = await requireStudio();
  const righe = await db
    .select({
      tipo: registro.tipo,
      stato: registro.stato,
      conosciutoIl: registro.conosciutoIl,
      assoltoIl: registro.assoltoIl,
      dettagli: registro.dettagli,
    })
    .from(registro)
    .where(and(eq(registro.clientCompanyId, aziendaId), eq(registro.organizationId, ctx.organizationId)));

  const adesso = new Date();
  const per = new Map<string, { quante: number; daPresidiare: number }>();
  for (const r of righe) {
    const def = registroPerTipo(r.tipo);
    if (!def) continue;
    const t = calcolaTermine(
      r.tipo as TipoRegistro,
      {
        conosciutoIl: r.conosciutoIl,
        assoltoIl: r.assoltoIl,
        stato: r.stato,
        validoFinoA: validitaDi(def, r.dettagli ?? {}),
        prorogato: Boolean((r.dettagli ?? {})["proroga"]),
      },
      adesso,
    );
    const v = per.get(r.tipo) ?? { quante: 0, daPresidiare: 0 };
    v.quante += 1;
    if (t.stato === "scaduto" || t.stato === "in-scadenza") v.daPresidiare += 1;
    per.set(r.tipo, v);
  }
  return per;
}
