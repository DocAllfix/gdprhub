import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { DOMINI, ETICHETTE_DOMINIO, TUTTI_I_TEMPLATES } from "@gdpr/engine";
import { db } from "@/lib/db";
import { catalogVersion, member, user } from "@/lib/db/schema";
import { requireStudio } from "@/features/auth/guards";
import { PRODOTTO } from "@/lib/brand";
import { FormMarchio } from "@/components/impostazioni/form-marchio";
import { GestioneUtenti, type RigaUtente } from "@/components/impostazioni/utenti";
import { SecondoFattore } from "@/components/impostazioni/secondo-fattore";

export const metadata: Metadata = { title: "Impostazioni" };
export const dynamic = "force-dynamic";

export default async function PaginaImpostazioni() {
  const ctx = await requireStudio();

  // LE DUE LETTURE NON DIPENDONO L'UNA DALL'ALTRA, e quindi partono insieme.
  //
  // Erano in fila, e in fila costano due viaggi a Francoforte invece di uno. Su una pagina
  // sola non si nota; sotto il carico del cancello — novanta richieste in volo — questa è
  // l'unica che ha superato i novanta secondi di attesa. Non è la causa di quel caso
  // isolato, ma è un viaggio che non serviva fare.
  const [versione, membri, io] = await Promise.all([
    db.query.catalogVersion.findFirst({ where: eq(catalogVersion.attiva, "si") }),
    db
      .select({ id: user.id, nome: user.name, email: user.email, ruolo: member.role })
      .from(member)
      .innerJoin(user, eq(user.id, member.userId))
      .where(eq(member.organizationId, ctx.organizationId)),
    // Lo stato del secondo fattore di chi sta guardando, non di tutti: e' una scelta
    // personale e la si accende sulla propria utenza.
    db.query.user.findFirst({
      columns: { twoFactorEnabled: true },
      where: eq(user.id, ctx.userId),
    }),
  ]);

  const utenti: RigaUtente[] = membri
    .map((m) => ({ ...m, io: m.id === ctx.userId }))
    .sort((a, b) => a.nome.localeCompare(b.nome));

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <header>
        <p className="text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">Impostazioni</p>
        <h1 className="titolo mt-1.5 text-titolo">Istanza e studio</h1>
      </header>

      <section className="mt-7">
        <h2 className="text-sm font-semibold tracking-tight">Marchio dello studio</h2>
        <p className="mt-1 mb-3 max-w-prose text-sm text-muted-foreground">
          Compare nella barra laterale e nell&apos;intestazione delle relazioni. Per uno studio che consegna
          una perizia al CdA di un cliente, la carta intestata propria vale più di molte funzionalità.
        </p>
        <FormMarchio nome={ctx.studioNome} modificabile={ctx.ruolo === "admin"} />
      </section>

      <section className="mt-9">
        <h2 className="text-sm font-semibold tracking-tight">Utenze</h2>
        <p className="mt-1 mb-3 max-w-prose text-sm text-muted-foreground">
          Non esiste registrazione: le utenze le crea un amministratore. La password si vede una volta sola,
          al momento della creazione, e non viene registrata da nessuna parte.
        </p>
        <GestioneUtenti utenti={utenti} modificabile={ctx.ruolo === "admin"} />
      </section>

      <section className="mt-9">
        <h2 className="text-sm font-semibold tracking-tight">Secondo fattore</h2>
        <p className="text-muted-foreground mt-1 mb-3 max-w-prose text-sm">
          Un codice temporaneo dal telefono, oltre alla password. Vale per la tua utenza soltanto: ogni
          persona lo accende sulla propria.
        </p>
        <SecondoFattore attivo={Boolean(io?.twoFactorEnabled)} />
      </section>

      <section className="mt-9">
        <h2 className="text-sm font-semibold tracking-tight">Catalogo</h2>
        <dl className="pannello mt-3 text-sm">
          <Riga voce="Versione attiva" valore={versione?.etichetta ?? "nessuna"} />
          <Riga voce="Adempimenti in catalogo" valore={String(TUTTI_I_TEMPLATES.length)} />
          {DOMINI.map((d) => (
            <Riga
              key={d}
              voce={`${ETICHETTE_DOMINIO[d].breve} · ${ETICHETTE_DOMINIO[d].norma}`}
              valore={String(TUTTI_I_TEMPLATES.filter((t) => t.dominio === d).length)}
            />
          ))}
        </dl>
      </section>

      <section className="mt-9">
        <h2 className="text-sm font-semibold tracking-tight">Questa istanza</h2>
        <dl className="pannello mt-3 text-sm">
          <Riga voce="Prodotto" valore={PRODOTTO.nome} />
          <Riga voce="Profilo" valore={ctx.profilo === "consulente" ? "Consulente" : "Azienda singola"} />
          <Riga voce="Modalità" valore={ctx.mode === "full" ? "Completa" : "Dimostrativa"} />
          <Riga voce="Il tuo ruolo" valore={ctx.ruolo} />
          <Riga voce="Il tuo accesso" valore={ctx.email} />
        </dl>
        <p className="mt-2.5 text-xs text-muted-foreground">
          L&apos;istanza contiene un solo studio: gli utenti li crea l&apos;amministratore, non esiste
          registrazione pubblica.
        </p>
      </section>
    </div>
  );
}

function Riga({ voce, valore }: { voce: string; valore: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 px-4 py-2.5">
      <dt className="text-muted-foreground">{voce}</dt>
      <dd className="font-medium tabular-nums">{valore}</dd>
    </div>
  );
}
