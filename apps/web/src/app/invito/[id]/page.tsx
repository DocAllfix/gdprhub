import { and, eq, gt, sql } from "drizzle-orm";
import Link from "next/link";
import type { Metadata } from "next";
import { MailX } from "lucide-react";
import { CATALOGHI, DOMINI, ETICHETTE_DOMINIO, formattaIt } from "@legisboard/engine";
import { db } from "@/lib/db";
import { invitation, organization } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { PRODOTTO } from "@/lib/brand";
import { ModuloInvito } from "./modulo";

// La pagina che l'invito apre.
//
// Sta FUORI dal gruppo `(app)`, che è protetto da `requireStudio()`: chi arriva qui non ha
// ancora un'utenza, quindi un guard lo respingerebbe prima di fargli accettare l'invito che
// gli abbiamo mandato noi.
//
// La protezione è l'identificativo stesso: è un valore casuale, scade in sette giorni, e
// vale una volta sola.
//
// HA LA STESSA IMPAGINAZIONE DI `/accedi`, e non per simmetria estetica. Sono le due facce
// dello stesso momento — la soglia d'ingresso — e chi accetta un invito vede questa e súbito
// dopo quella. Due impaginazioni diverse a un clic di distanza si leggono come due prodotti.
// La colonna di marca è l'unico posto dove l'oliva occupa mezzo schermo, e qui serve anche a
// dire che l'invito viene da un'istanza vera e non da una pagina copiata.
//
// Il CONTENUTO della colonna però è suo: `/accedi` presenta il prodotto a chi lo conosce
// già, questa lo presenta a chi non l'ha mai visto e deve decidere se fidarsi.

export const metadata: Metadata = { title: "Invito" };
export const dynamic = "force-dynamic";

const RUOLI: Record<string, { nome: string; puo: string }> = {
  admin: {
    nome: "amministratore",
    puo: "Gestisce le aziende, gli utenti dello studio e le impostazioni dell'istanza.",
  },
  consulente: {
    nome: "consulente",
    puo: "Lavora gli adempimenti, tiene i registri, allega evidenze e genera le relazioni.",
  },
  viewer: {
    nome: "sola lettura",
    puo: "Consulta tutto e non modifica nulla: utile a un socio che firma o a un revisore.",
  },
};

export default async function PaginaInvito({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const riga = await db
    .select({
      email: invitation.email,
      ruolo: invitation.role,
      scadenza: invitation.expiresAt,
      studio: organization.name,
    })
    .from(invitation)
    .innerJoin(organization, eq(organization.id, invitation.organizationId))
    // LA SCADENZA LA DECIDE IL DATABASE, non il render.
    //
    // Confrontare con `Date.now()` qui sarebbe una funzione impura dentro un componente — e
    // il lint lo segnala a ragione — ma soprattutto userebbe l'orologio del processo invece
    // di quello che ha scritto la riga. Su una macchina con l'ora sfasata un invito scaduto
    // risulterebbe valido, o viceversa.
    .where(and(eq(invitation.id, id), eq(invitation.status, "pending"), gt(invitation.expiresAt, sql`now()`)))
    .limit(1);

  const inv = riga[0];

  // INVITO NON VALIDO. Un solo messaggio per «non esiste», «già usato» e «scaduto»:
  // distinguerli direbbe a un estraneo se un certo identificativo è mai esistito.
  if (!inv) {
    return (
      <main data-schermata="invito-non-valido" className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-6 py-16">
        <div className="pannello entra p-6">
          <MailX className="size-5 text-faint-foreground" aria-hidden />
          <h1 className="titolo mt-3 text-xl">Invito non valido</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Questo invito non esiste, è già stato usato oppure è scaduto. Gli inviti valgono una
            volta sola e durano sette giorni: chiedi a chi te l&apos;ha mandato di generarne uno
            nuovo.
          </p>
          <div className="mt-5">
            <Button asChild variant="outline">
              <Link href="/accedi">Vai all&apos;accesso</Link>
            </Button>
          </div>
        </div>
      </main>
    );
  }

  const ruolo = RUOLI[inv.ruolo] ?? { nome: inv.ruolo, puo: "" };
  const scade = formattaIt(inv.scadenza.toISOString().slice(0, 10));

  return (
    <main data-schermata="invito" className="grid min-h-dvh lg:grid-cols-[1fr_460px]">
      {/* La colonna di marca, come su `/accedi`: il doppio filetto della carta intestata e il
          perimetro reale dei tre decreti, coi conteggi veri del catalogo. Su schermo stretto
          sparisce, perché chi ha ricevuto un invito è venuto qui per compilare il modulo. */}
      <section className="hidden flex-col justify-between bg-sidebar px-12 py-10 text-sidebar-foreground lg:flex">
        <div className="mx-auto w-full max-w-lg border-t-2 border-b border-sidebar-foreground/70 pt-2 pb-2.5">
          <p className="text-sm font-semibold tracking-widest uppercase">{inv.studio}</p>
        </div>

        <div className="mx-auto w-full max-w-lg">
          <p className="text-xs font-medium tracking-[0.14em] text-sidebar-muted uppercase">
            {PRODOTTO.nome}
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">
            {inv.studio} ti ha aperto un accesso
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-sidebar-muted">
            {ruolo.puo} Lo strumento tiene GDPR, 231 e 81/08 in un registro solo: adempimenti,
            scadenze ed evidenze in una lista sola, con le relazioni che ne escono.
          </p>

          <dl className="mt-8 border-t border-sidebar-border">
            {DOMINI.map((d) => (
              <div
                key={d}
                className="flex items-baseline justify-between gap-4 border-b border-sidebar-border/60 py-2"
              >
                <dt className="text-sm">
                  <span className="font-medium">{ETICHETTE_DOMINIO[d].esteso}</span>
                  <span className="ml-2 font-mono text-micro text-sidebar-muted/80">
                    {ETICHETTE_DOMINIO[d].norma}
                  </span>
                </dt>
                <dd className="font-mono text-xs tabular-nums text-sidebar-muted">
                  {CATALOGHI[d].length}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <p className="mx-auto w-full max-w-lg text-xs text-sidebar-muted/80">
          Istanza dedicata a {inv.studio}. L&apos;invito vale una volta sola.
        </p>
      </section>

      <section className="flex flex-col justify-center px-6 py-16 sm:px-12">
        <div className="mx-auto w-full max-w-sm">
          <h2 className="text-xl font-semibold tracking-tight">Crea la tua utenza</h2>

          {/* I DATI DELL'INVITO PRIMA DEL MODULO, e non come nota in fondo: chi accetta deve
              poter verificare che l'indirizzo sia il suo e che il ruolo sia quello pattuito
              PRIMA di scegliersi una password. Se qualcosa non torna, si ferma qui. */}
          <dl className="mt-5 divide-y divide-border-subtle border-y border-border-subtle text-sm">
            <div className="flex items-baseline justify-between gap-4 py-2">
              <dt className="text-muted-foreground">Indirizzo</dt>
              <dd className="font-medium">{inv.email}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 py-2">
              <dt className="text-muted-foreground">Ruolo</dt>
              <dd className="font-medium">{ruolo.nome}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 py-2">
              <dt className="text-muted-foreground">Scade il</dt>
              <dd className="font-mono tabular-nums">{scade}</dd>
            </div>
          </dl>

          <ModuloInvito id={id} />
        </div>
      </section>
    </main>
  );
}
