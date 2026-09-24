import { randomUUID } from "node:crypto";
import { CATALOGHI, CLIENTI_DIMOSTRATIVI, costruisciDemo, oggiA, type Dominio } from "@legisboard/engine";
import { and, eq, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { env } from "@/lib/env";
import { db } from "./index";
import {
  account,
  assessment,
  clientCompany,
  companyModule,
  instanceHistory,
  member,
  obligationInstance,
  obligationTemplate,
  user,
} from "./schema";
import { seminaAziendaDimostrativa, type EsitoDemo } from "./seed-demo";

// LA DEMO PUBBLICA: ripristino dei dati e utente dimostrativo _(docs/07 §5)_.
//
// Un modulo solo, usato da due porte: la riga di comando (`db:demo-reset`, dopo il cancello
// visivo) e il cron notturno della vetrina. Prima la logica stava dentro lo script, e il cron
// l'avrebbe dovuta copiare.

const NOME = "Fondiaria Meccanica Verdi S.p.A.";

/**
 * Riporta l'azienda di esempio allo stato iniziale, SENZA CANCELLARE NIENTE.
 *
 * La prima versione cancellava l'azienda e la riseminava. Funzionava finché nessuno cambiava
 * uno stato: la cancellazione si propaga fino a `instance_history`, che è in SOLA AGGIUNTA —
 * un trigger rifiuta ogni DELETE, per chiunque, proprietario dello schema compreso. Con i
 * visitatori della demo il ripristino notturno sarebbe fallito ogni notte, per sempre.
 *
 * Il trigger ha ragione e resta com'è: lo storico di un adempimento è una prova. Un interruttore
 * per aggirarlo sarebbe utilizzabile anche su un'istanza cliente. Quindi si fa ciò che il
 * trigger chiede: il passato non si corregge, gli si AGGIUNGE una riga. Ogni campo riportato al
 * valore iniziale è una modifica come le altre, registrata nello storico con autore vuoto — il
 * sistema.
 *
 * I valori iniziali sono quelli del seme (`costruisciDemo` sul catalogo, relativi a OGGI): le
 * date si rinfrescano ogni notte, così «Completata e scaduta» resta un esempio vero invece di
 * scivolare nel passato un giorno alla volta.
 */
export type EsitoRipristino = { readonly stato: "ripristinata"; readonly campi: number } | EsitoDemo;

export async function ripristinaDemo(): Promise<EsitoRipristino> {
  const studio = await db.query.organization.findFirst();
  if (!studio) return { stato: "istanza_non_inizializzata" };
  const azienda = await db.query.clientCompany.findFirst({
    where: and(eq(clientCompany.organizationId, studio.id), eq(clientCompany.nome, NOME)),
  });
  if (!azienda) return seminaAziendaDimostrativa();

  const oggi = oggiA();
  let campi = 0;
  await db.transaction(async (tx) => {
    // I moduli: il cancello visivo li spegne e li riaccende; qui si riaccendono comunque.
    await tx.update(companyModule).set({ attivo: true }).where(eq(companyModule.clientCompanyId, azienda.id));
    await tx.update(assessment).set({ dataRiferimento: oggi }).where(eq(assessment.clientCompanyId, azienda.id));

    const valutazioni = await tx.query.assessment.findMany({ where: eq(assessment.clientCompanyId, azienda.id) });
    for (const v of valutazioni) {
      const dominio = v.dominio as Dominio;
      const demo = new Map(
        costruisciDemo(CATALOGHI[dominio], CLIENTI_DIMOSTRATIVI[dominio], oggi).map((a) => [a.codice, a]),
      );
      const istanze = await tx.query.obligationInstance.findMany({ where: eq(obligationInstance.assessmentId, v.id) });
      if (istanze.length === 0) continue;
      const modelli = new Map(
        (
          await tx.query.obligationTemplate.findMany({
            where: inArray(
              obligationTemplate.id,
              istanze.map((i) => i.templateId),
            ),
          })
        ).map((t) => [t.id, t]),
      );

      for (const i of istanze) {
        const d = demo.get(i.codice);
        const t = modelli.get(i.templateId);
        const voluti = {
          stato: d?.stato ?? ("Da fare" as const),
          ultimaEsecuzione: d?.ultimaEsecuzione ?? null,
          scadenzaEsplicita: d?.scadenzaEsplicita ?? null,
          priorita: d?.priorita ?? t?.prioritaDefault ?? i.priorita,
          rischio: d?.rischio ?? t?.rischioDefault ?? i.rischio,
          note: null,
          motivazioneNonApplicabile: null,
        };
        const attuali = i as unknown as Record<string, unknown>;
        const testo = (x: unknown) => (x === null || x === undefined ? null : String(x));
        const tracce = Object.entries(voluti)
          .map(([campo, a]) => ({ campo, da: testo(attuali[campo]), a: testo(a) }))
          .filter((x) => x.da !== x.a);
        if (tracce.length === 0) continue;

        await tx.update(obligationInstance).set(voluti).where(eq(obligationInstance.id, i.id));
        await tx.insert(instanceHistory).values(
          tracce.map((x) => ({
            organizationId: studio.id,
            obligationInstanceId: i.id,
            campo: x.campo,
            da: x.da,
            a: x.a,
            userId: null,
          })),
        );
        campi += tracce.length;
      }
    }
  });
  return { stato: "ripristinata", campi };
}

/**
 * Crea l'utente dimostrativo, o lo rimette in ordine se esiste già.
 *
 * Idempotente, e volutamente RIPARATORE: a ogni giro riporta la password al valore
 * dell'ambiente e toglie qualunque secondo fattore. Il gancio in `lib/auth` impedisce già di
 * cambiarli dalla demo; questo è il secondo muro — se un giorno un percorso sfuggisse al
 * gancio, la notte successiva l'utente tornerebbe comunque utilizzabile da tutti.
 *
 * Ruolo CONSULENTE, non amministratore: così anche i controlli per ruolo (utenti, inviti,
 * impostazioni dell'istanza) lo fermano, in aggiunta ai blocchi della modalità demo.
 */
export async function assicuraUtenteDemo(): Promise<"creato" | "riparato" | "non_configurato"> {
  if (!env.DEMO_EMAIL || !env.DEMO_PASSWORD) return "non_configurato";
  const studio = await db.query.organization.findFirst();
  if (!studio) return "non_configurato";

  const contesto = await auth.$context;
  const hash = await contesto.password.hash(env.DEMO_PASSWORD);
  const esistente = await db.query.user.findFirst({ where: eq(user.email, env.DEMO_EMAIL) });

  if (!esistente) {
    const creato = await contesto.internalAdapter.createUser({
      email: env.DEMO_EMAIL,
      name: "Visitatore della demo",
      emailVerified: true,
      // Il cambio obbligatorio della password porterebbe ogni visitatore sulla schermata
      // «scegliete una nuova password», e il primo che la scegliesse chiuderebbe fuori gli altri.
      mustChangePassword: false,
    });
    await contesto.internalAdapter.createAccount({
      userId: creato.id,
      providerId: "credential",
      accountId: creato.id,
      password: hash,
    });
    await db.insert(member).values({ id: randomUUID(), organizationId: studio.id, userId: creato.id, role: "consulente" });
    return "creato";
  }

  await db
    .update(account)
    .set({ password: hash })
    .where(and(eq(account.userId, esistente.id), eq(account.providerId, "credential")));
  await db
    .update(user)
    .set({ twoFactorEnabled: false, mustChangePassword: false, tourVisti: {} })
    .where(eq(user.id, esistente.id));
  return "riparato";
}

/**
 * Le sessioni aperte dall'utente dimostrativo nell'ultimo minuto.
 *
 * Serve al limite dell'ingresso `/demo`: ogni clic apre una sessione, cioè una riga. Senza un
 * tetto, un programma che chiama `/demo` in ciclo riempirebbe la tabella.
 */
export async function sessioniDemoRecenti(): Promise<number> {
  if (!env.DEMO_EMAIL) return 0;
  const u = await db.query.user.findFirst({ where: eq(user.email, env.DEMO_EMAIL), columns: { id: true } });
  if (!u) return 0;
  const unMinutoFa = new Date(Date.now() - 60_000);
  const righe = await db.query.session.findMany({
    where: (s, { and: e, eq: uguale, gt }) => e(uguale(s.userId, u.id), gt(s.createdAt, unMinutoFa)),
    columns: { id: true },
  });
  return righe.length;
}

/** Vero se l'istanza è la vetrina in modalità demo. */
export async function istanzaDemo(): Promise<boolean> {
  const riga = await db.query.instanceConfig.findFirst({ columns: { mode: true } });
  return riga?.mode === "demo";
}


/**
 * L'identificativo dell'azienda d'esempio. Stabile: il ripristino notturno la riporta ai valori
 * iniziali senza cancellarla, quindi l'ingresso `/demo` può portare dritto al suo assessment.
 */
export async function aziendaDemoId(): Promise<string | null> {
  const studio = await db.query.organization.findFirst({ columns: { id: true } });
  if (!studio) return null;
  const a = await db.query.clientCompany.findFirst({
    where: and(eq(clientCompany.organizationId, studio.id), eq(clientCompany.nome, NOME)),
    columns: { id: true },
  });
  return a?.id ?? null;
}
