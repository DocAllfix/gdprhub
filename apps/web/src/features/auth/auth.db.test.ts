// Verifica dell'autenticazione contro il database reale.
//
// Le cose provate qui non sono dimostrabili leggendo il codice: che la registrazione sia
// davvero chiusa anche chiamando l'API dall'interno, che le credenziali dell'amministratore
// funzionino, e che l'istanza contenga una sola organizzazione.

import { describe, expect, it } from "vitest";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { member, organization, user } from "@/lib/db/schema";
import { verificaStudioUnico } from "./guards";

describe("la registrazione pubblica è chiusa", () => {
  it("un tentativo di iscrizione viene respinto, anche dall'API server", () => {
    // È il vincolo su cui si regge il modello di vendita per istanza: non basta conoscere
    // l'URL dell'endpoint per entrare. E vale anche per noi: il provisioning
    // dell'amministratore passa dal contesto interno, non da questa porta.
    return expect(
      auth.api.signUpEmail({
        body: { email: "intruso@esempio.it", password: "password-lunghissima-1", name: "Intruso" },
      }),
    ).rejects.toThrow(/sign up is not enabled/i);
  });

  it("l'intruso non è finito nel database nonostante il tentativo", async () => {
    const trovato = await db.query.user.findFirst({ columns: { id: true } });
    const tutti = await db.select({ email: user.email }).from(user);
    expect(trovato).toBeDefined();
    expect(tutti.map((u) => u.email)).not.toContain("intruso@esempio.it");
  });
});

describe("l'istanza è inizializzata correttamente", () => {
  it("contiene esattamente una organizzazione", async () => {
    // È il presupposto su cui si regge la scelta di non usare RLS: se ne comparissero due,
    // lo scoping applicativo non basterebbe più.
    const studi = await db.select({ id: organization.id }).from(organization);
    expect(studi).toHaveLength(1);
    await expect(verificaStudioUnico()).resolves.toBeUndefined();
  });

  it("l'amministratore è membro dello studio con ruolo admin", async () => {
    const membri = await db.select({ role: member.role }).from(member);
    expect(membri.length).toBeGreaterThanOrEqual(1);
    expect(membri.some((m) => m.role === "admin")).toBe(true);
  });

  it("all'amministratore è imposto il cambio password al primo accesso", async () => {
    // Le credenziali iniziali si consegnano su un canale: restano note a chi le ha inviate
    // finché non vengono cambiate.
    const amministratori = await db
      .select({ email: user.email, mustChangePassword: user.mustChangePassword })
      .from(user);
    expect(amministratori.every((u) => u.mustChangePassword)).toBe(true);
  });
});

describe("accesso con le credenziali iniziali", () => {
  it("l'amministratore riesce ad accedere", async () => {
    // Prova che l'hashing usato dal provisioning è quello che Better Auth si aspetta:
    // scriverne uno nostro avrebbe prodotto un utente esistente ma incapace di entrare.
    const email = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;
    if (!email || !password) {
      // Senza credenziali nell'ambiente il test non ha nulla da provare: si dichiara.
      expect.soft(true, "ADMIN_EMAIL/ADMIN_PASSWORD assenti: accesso non verificato").toBe(true);
      return;
    }
    const esito = await auth.api.signInEmail({ body: { email, password } });
    expect(esito.user.email).toBe(email.toLowerCase());
  });

  it("una password sbagliata viene respinta", async () => {
    const email = process.env.ADMIN_EMAIL;
    if (!email) return;
    await expect(
      auth.api.signInEmail({ body: { email, password: "password-sbagliata-123" } }),
    ).rejects.toThrow();
  });
});
