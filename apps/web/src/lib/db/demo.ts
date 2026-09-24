import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { env } from "@/lib/env";
import { db } from "./index";
import { account, clientCompany, member, user } from "./schema";
import { seminaAziendaDimostrativa, type EsitoDemo } from "./seed-demo";

// LA DEMO PUBBLICA: ripristino dei dati e utente dimostrativo _(docs/07 §5)_.
//
// Un modulo solo, usato da due porte: la riga di comando (`db:demo-reset`, dopo il cancello
// visivo) e il cron notturno della vetrina. Prima la logica stava dentro lo script, e il cron
// l'avrebbe dovuta copiare.

const NOME = "Fondiaria Meccanica Verdi S.p.A.";

/** Riporta l'azienda di esempio allo stato iniziale. */
export async function ripristinaDemo(): Promise<{ eliminate: number; esito: EsitoDemo }> {
  const studio = await db.query.organization.findFirst();
  if (!studio) return { eliminate: 0, esito: { stato: "istanza_non_inizializzata" } };

  // La cancellazione si propaga a moduli, assessment, istanze ed evidenze: sono tutte in
  // `on delete cascade` dall'azienda, che è la ragione per cui quel vincolo esiste.
  const eliminate = await db
    .delete(clientCompany)
    .where(and(eq(clientCompany.organizationId, studio.id), eq(clientCompany.nome, NOME)))
    .returning({ id: clientCompany.id });

  return { eliminate: eliminate.length, esito: await seminaAziendaDimostrativa() };
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

