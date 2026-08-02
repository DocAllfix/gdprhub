import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { catalogVersion, instanceConfig, member, organization } from "./schema";

// Inizializzazione dell'istanza al primo avvio.
//
// Sul modello di `onboard-client.sh` di WhistleBlower: chi installa l'istanza mette
// ADMIN_EMAIL e ADMIN_PASSWORD nel file d'ambiente, il primo avvio crea lo studio e
// l'amministratore, e al primo accesso il cambio password è forzato.
//
// Idempotente: se lo studio esiste già non tocca nulla. Si può eseguire a ogni avvio senza
// paura, ed è quello che fa il container in produzione.
//
// Uso:  pnpm --filter web db:bootstrap

export type EsitoBootstrap =
  | { readonly stato: "gia_inizializzata"; readonly studio: string }
  | { readonly stato: "creata"; readonly studio: string; readonly adminEmail: string }
  | { readonly stato: "credenziali_mancanti" };

export async function inizializzaIstanza(): Promise<EsitoBootstrap> {
  const esistente = await db.query.organization.findFirst();
  if (esistente) return { stato: "gia_inizializzata", studio: esistente.name };

  if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD) return { stato: "credenziali_mancanti" };

  // NON si passa da `auth.api.signUpEmail`: la registrazione è disabilitata e la libreria
  // rifiuta la chiamata anche dall'interno del server. È il comportamento corretto — una
  // porta chiusa deve restare chiusa per tutti — quindi l'amministratore si crea dal
  // contesto interno, che è la strada che Better Auth indica per le migrazioni.
  //
  // L'hashing resta quello della libreria: scriverne uno nostro significherebbe che il
  // primo accesso non funziona, e si perderebbe tempo a cercare il motivo altrove.
  const ctx = await auth.$context;
  const utente = await ctx.internalAdapter.createUser({
    email: env.ADMIN_EMAIL,
    name: env.ADMIN_NOME,
    emailVerified: true,
    mustChangePassword: true,
  });
  const utenteId = utente.id;

  await ctx.internalAdapter.createAccount({
    userId: utenteId,
    providerId: "credential",
    accountId: utenteId,
    password: await ctx.password.hash(env.ADMIN_PASSWORD),
  });

  const studioId = randomUUID();
  const slug =
    env.STUDIO_NOME.toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40) || "studio";

  await db.transaction(async (tx) => {
    await tx.insert(organization).values({ id: studioId, name: env.STUDIO_NOME, slug });
    await tx.insert(member).values({
      id: randomUUID(),
      organizationId: studioId,
      userId: utenteId,
      role: "admin",
    });

    const catalogo = await tx.query.catalogVersion.findFirst({
      where: eq(catalogVersion.attiva, "si"),
    });

    await tx.insert(instanceConfig).values({
      id: randomUUID(),
      organizationId: studioId,
      profilo: "consulente",
      // `full` è il default anche sulla vetrina: i blocchi si attivano solo su conferma
      // esplicita del committente, cambiando questa riga e non il codice.
      mode: "full",
      brandNome: env.STUDIO_NOME,
      catalogVersionId: catalogo?.id ?? null,
    });
  });

  return { stato: "creata", studio: env.STUDIO_NOME, adminEmail: env.ADMIN_EMAIL };
}
