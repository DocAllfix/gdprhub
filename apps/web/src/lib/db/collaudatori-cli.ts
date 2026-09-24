import { randomUUID } from "node:crypto";
import { and, eq, like } from "drizzle-orm";
import {
  CATALOGHI,
  CLIENTI_DIMOSTRATIVI,
  DOMINI,
  ETICHETTE_DOMINIO,
  costruisciDemo,
  oggiA,
  type Dominio,
} from "@legisboard/engine";
import { auth } from "@/lib/auth";
import { db } from "./index";
import {
  assessment,
  catalogVersion,
  clientCompany,
  companyModule,
  member,
  obligationInstance,
  obligationTemplate,
  user,
} from "./schema";

// Crea N utenze di collaudo, ognuna con la PROPRIA azienda popolata.
//
// PERCHÉ UN'AZIENDA A TESTA. Far provare l'istanza a dieci persone contemporaneamente sulla
// stessa azienda significa che uno disattiva un modulo mentre un altro lo sta guardando, e
// che il terzo trova cambiato lo stato che aveva appena messo. Daranno la colpa al prodotto,
// e avranno ragione a lamentarsi anche se il prodotto è corretto.
//
// Ognuno lavora sulla sua e vede quella degli altri nel portafoglio: si prova anche la
// vista d'insieme, senza collisioni sui dati.
//
// Uso:  pnpm --filter web db:collaudatori 10
//       pnpm --filter web db:collaudatori --azzera   (rimuove tutti i collaudatori)

const PREFISSO = "collaudo";
const DOMINIO_POSTA = "legisboard.it";

/** Nomi di aziende plausibili e distinguibili: «Azienda 7» non aiuta nessuno a orientarsi. */
const AZIENDE = [
  { nome: "Ferrarini Componenti S.r.l.", settore: "Metalmeccanico", sede: "Modena (MO)" },
  { nome: "Adriatica Logistica S.p.A.", settore: "Trasporti e magazzinaggio", sede: "Ancona (AN)" },
  { nome: "Chimica Padana S.r.l.", settore: "Chimico", sede: "Rovigo (RO)" },
  { nome: "Casearia Monti Sibillini", settore: "Alimentare", sede: "Macerata (MC)" },
  { nome: "Edilcostruzioni Tirreno S.p.A.", settore: "Costruzioni", sede: "Livorno (LI)" },
  { nome: "Sanità Servizi Integrati S.r.l.", settore: "Servizi sanitari", sede: "Bologna (BO)" },
  { nome: "Tessitura Biellese S.p.A.", settore: "Tessile", sede: "Biella (BI)" },
  { nome: "Elettronica Salentina S.r.l.", settore: "Elettronica", sede: "Lecce (LE)" },
  { nome: "Cantine del Montefeltro", settore: "Vitivinicolo", sede: "Pesaro-Urbino (PU)" },
  { nome: "Autotrasporti Val Padana S.r.l.", settore: "Autotrasporto", sede: "Cremona (CR)" },
  { nome: "Officine Meccaniche Brianza", settore: "Metalmeccanico", sede: "Monza (MB)" },
  { nome: "Plastica Adriatica S.p.A.", settore: "Materie plastiche", sede: "Pescara (PE)" },
] as const;

/** Password leggibile e dettabile: niente caratteri che si confondono fra loro. */
function generaPassword(): string {
  const alfabeto = "abcdefghijkmnopqrstuvwxyz23456789";
  const casuali = new Uint32Array(15);
  crypto.getRandomValues(casuali);
  const c = [...casuali].map((n) => alfabeto[n % alfabeto.length]).join("");
  return `${c.slice(0, 5)}-${c.slice(5, 10)}-${c.slice(10, 15)}`;
}

async function azzera(studioId: string) {
  const utenti = await db.query.user.findMany({ where: like(user.email, `${PREFISSO}%@${DOMINIO_POSTA}`) });
  const aziende = await db.query.clientCompany.findMany({
    where: and(eq(clientCompany.organizationId, studioId), like(clientCompany.nome, "%")),
  });
  const daRimuovere = aziende.filter((a) => !a.isDemo);

  for (const a of daRimuovere) await db.delete(clientCompany).where(eq(clientCompany.id, a.id));
  for (const u of utenti) await db.delete(user).where(eq(user.id, u.id));

  console.log(`Rimossi ${utenti.length} collaudatori e ${daRimuovere.length} aziende di collaudo.`);
}

async function creaAziendaPopolata(studioId: string, indice: number, versioneId: string) {
  const modello = AZIENDE[indice % AZIENDE.length]!;
  const suffisso = indice >= AZIENDE.length ? ` ${Math.floor(indice / AZIENDE.length) + 1}` : "";
  const oggi = oggiA();
  const aziendaId = randomUUID();

  await db.insert(clientCompany).values({
    id: aziendaId,
    organizationId: studioId,
    nome: `${modello.nome}${suffisso}`,
    settore: modello.settore,
    sede: modello.sede,
    numeroDipendenti: 40 + ((indice * 17) % 160),
    fatturatoAnnuo: 3_000_000 + ((indice * 1_700_000) % 25_000_000),
  });

  for (const dominio of DOMINI) {
    await db.insert(companyModule).values({
      id: randomUUID(),
      organizationId: studioId,
      clientCompanyId: aziendaId,
      dominio,
      attivo: true,
    });

    const templates = await db.query.obligationTemplate.findMany({
      where: and(
        eq(obligationTemplate.catalogVersionId, versioneId),
        eq(obligationTemplate.dominio, dominio as Dominio),
      ),
    });
    if (templates.length === 0) continue;

    const assessmentId = randomUUID();
    await db.insert(assessment).values({
      id: assessmentId,
      organizationId: studioId,
      clientCompanyId: aziendaId,
      dominio,
      catalogVersionId: versioneId,
      titolo: `Assessment ${ETICHETTE_DOMINIO[dominio].breve}`,
      dataRiferimento: oggi,
      stato: "in_corso",
    });

    // Lo stato di partenza è quello dimostrativo del motore, così ogni collaudatore trova
    // scadute, in scadenza e regolari invece di 171 righe tutte «Da fare» che non dicono
    // nulla su come si comporta il prodotto.
    const demo = new Map(
      costruisciDemo(CATALOGHI[dominio], CLIENTI_DIMOSTRATIVI[dominio], oggi).map((a) => [a.codice, a]),
    );

    await db.insert(obligationInstance).values(
      templates.map((t) => {
        const d = demo.get(t.codice);
        return {
          id: randomUUID(),
          organizationId: studioId,
          assessmentId,
          templateId: t.id,
          dominio,
          codice: t.codice,
          stato: d?.stato ?? ("Da fare" as const),
          ultimaEsecuzione: d?.ultimaEsecuzione ?? null,
          scadenzaEsplicita: d?.scadenzaEsplicita ?? null,
          priorita: d?.priorita ?? t.prioritaDefault,
          rischio: d?.rischio ?? t.rischioDefault,
        };
      }),
    );
  }
  return `${modello.nome}${suffisso}`;
}

// ============================================================================================

const studio = await db.query.organization.findFirst();
if (!studio) {
  console.error("Nessuno studio configurato: esegui prima `pnpm db:bootstrap`.");
  process.exit(1);
}

if (process.argv.includes("--azzera")) {
  await azzera(studio.id);
  process.exit(0);
}

const quanti = Number(process.argv[2] ?? "8");
if (!Number.isInteger(quanti) || quanti < 1 || quanti > 40) {
  console.error("Uso: pnpm db:collaudatori <numero fra 1 e 40>  |  --azzera");
  process.exit(1);
}

const versione = await db.query.catalogVersion.findFirst({ where: eq(catalogVersion.attiva, "si") });
if (!versione) {
  console.error("Nessuna versione di catalogo attiva: esegui prima `pnpm db:seed`.");
  process.exit(1);
}

const contesto = await auth.$context;
const credenziali: { email: string; password: string; azienda: string; ruolo: string }[] = [];

for (let i = 1; i <= quanti; i++) {
  const email = `${PREFISSO}${i}@${DOMINIO_POSTA}`;
  const gia = await db.query.user.findFirst({ where: eq(user.email, email) });
  if (gia) {
    console.log(`· ${email} esiste già: saltato`);
    continue;
  }

  const password = generaPassword();
  // Il primo è amministratore: serve qualcuno che possa provare le impostazioni e le utenze.
  const ruolo = i === 1 ? "admin" : i === quanti && quanti > 2 ? "viewer" : "consulente";

  const creato = await contesto.internalAdapter.createUser({
    email,
    name: `Collaudatore ${i}`,
    emailVerified: true,
    // Le password le consegna chi le ha generate: qui il cambio forzato è solo attrito.
    mustChangePassword: false,
  });
  await contesto.internalAdapter.createAccount({
    userId: creato.id,
    providerId: "credential",
    accountId: creato.id,
    password: await contesto.password.hash(password),
  });
  await db.insert(member).values({
    id: randomUUID(),
    organizationId: studio.id,
    userId: creato.id,
    role: ruolo,
  });

  const azienda = await creaAziendaPopolata(studio.id, i - 1, versione.id);
  credenziali.push({ email, password, azienda, ruolo });
  console.log(`· ${email} → ${azienda} (${ruolo})`);
}

console.log(`\n${"—".repeat(78)}`);
console.log("CREDENZIALI DI COLLAUDO — da consegnare\n");
console.log("indirizzo".padEnd(34) + "password".padEnd(20) + "ruolo".padEnd(12) + "azienda assegnata");
for (const c of credenziali) {
  console.log(c.email.padEnd(34) + c.password.padEnd(20) + c.ruolo.padEnd(12) + c.azienda);
}
console.log(`\n${credenziali.length} utenze create. Ognuna ha la propria azienda con 171 adempimenti.`);
console.log("Vedono tutte il portafoglio completo: la vista d'insieme si prova, i dati non si pestano.");
process.exit(0);
