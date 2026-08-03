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
// Uso:  pnpm --filter web db:consegna <email> <password> [--verifica]
//
// `--verifica` riporta la password SENZA rialzare il flag del primo accesso, e serve a un
// caso solo: l'utenza del cancello visivo. Un cancello che al primo accesso finisce sulla
// schermata di cambio password non verifica niente e boccia tutto — è successo, e il modo
// giusto di risolverlo non è togliere il cambio password al prodotto ma dichiarare
// l'eccezione dove sta.
//
// L'eccezione è ristretta di proposito: vale solo per l'indirizzo dichiarato in
// GATE_EMAIL. Un'opzione che scavalca un controllo di sicurezza per qualunque utenza,
// prima o poi, la usa qualcuno per l'amministratore.

const [email, password, ...opzioni] = process.argv.slice(2);
if (!email || !password) {
  console.error("Uso: pnpm db:consegna <email> <password> [--verifica]");
  process.exit(1);
}

const perVerifica = opzioni.includes("--verifica");
if (perVerifica && email !== process.env.GATE_EMAIL) {
  console.error(
    `--verifica vale solo per l'utenza del cancello (GATE_EMAIL${
      process.env.GATE_EMAIL ? ` = ${process.env.GATE_EMAIL}` : " non impostata"
    }), non per ${email}.`,
  );
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
await db.update(user).set({ mustChangePassword: !perVerifica }).where(eq(user.id, u.id));

console.log(
  perVerifica
    ? `Utenza del cancello ${email} riportata alla password dichiarata, senza cambio forzato.`
    : `Credenziali pronte per ${email}. Al primo accesso il cambio password è forzato.`,
);
process.exit(0);
