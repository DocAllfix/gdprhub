import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { DOMINI, ETICHETTE_DOMINIO, TUTTI_I_TEMPLATES } from "@gdpr/engine";
import { db } from "@/lib/db";
import { catalogVersion } from "@/lib/db/schema";
import { requireStudio } from "@/features/auth/guards";
import { PRODOTTO } from "@/lib/brand";
import { FormMarchio } from "@/components/impostazioni/form-marchio";

export const metadata: Metadata = { title: "Impostazioni" };
export const dynamic = "force-dynamic";

export default async function PaginaImpostazioni() {
  const ctx = await requireStudio();
  const versione = await db.query.catalogVersion.findFirst({ where: eq(catalogVersion.attiva, "si") });

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <header>
        <p className="text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">Impostazioni</p>
        <h1 className="mt-1.5 text-2xl font-semibold tracking-tight">Istanza e studio</h1>
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
        <h2 className="text-sm font-semibold tracking-tight">Catalogo</h2>
        <dl className="mt-3 divide-y divide-border-subtle rounded-md border border-border bg-surface text-sm">
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
        <dl className="mt-3 divide-y divide-border-subtle rounded-md border border-border bg-surface text-sm">
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
