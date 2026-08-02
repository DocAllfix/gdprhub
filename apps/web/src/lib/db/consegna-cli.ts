import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { account, user } from "@/lib/db/schema";

// Prepara le credenziali da consegnare al committente e rialza il flag del primo accesso.
//
// Serve alla fine di un giro di verifica: il collaudo cambia la password dell'amministratore
// (è uno dei flussi da provare) e lascia l'istanza con una password di lavoro. Questo script
// la riporta a quella dichiarata e rimette `mustChangePassword`, così chi riceve l'istanza
// attraversa il primo accesso come un cliente vero.
//
// Uso:  pnpm --filter web db:consegna <email> <password>

const [email, password] = process.argv.slice(2);
if (!email || !password) {
  console.error("Uso: pnpm db:consegna <email> <password>");
  process.exit(1);
}
if (password.length < 12) {
  console.error("La password deve essere di almeno 12 caratteri.");
  process.exit(1);
}

const u = await db.query.user.findFirst({ where: eq(user.email, email) });
if (!u) {
  console.error(`Nessun utente con indirizzo ${email}.`);
  process.exit(1);
}

// L'hashing resta quello della libreria: scriverne uno nostro significherebbe che il primo
// accesso non funziona e perdere tempo a cercare il motivo altrove.
const ctx = await auth.$context;
await db
  .update(account)
  .set({ password: await ctx.password.hash(password) })
  .where(eq(account.userId, u.id));
await db.update(user).set({ mustChangePassword: true }).where(eq(user.id, u.id));

console.log(`Credenziali pronte per ${email}. Al primo accesso il cambio password è forzato.`);
process.exit(0);
