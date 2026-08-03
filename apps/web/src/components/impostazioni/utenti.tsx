"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Copy, KeyRound, UserPlus } from "lucide-react";
import { cambiaRuolo, creaUtente, reimpostaPassword, type EsitoUtente } from "@/features/utenti/azioni";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// Gestione delle utenze dello studio.
//
// LA PASSWORD SI MOSTRA UNA VOLTA SOLA, qui, e non finisce nel registro delle azioni: un
// archivio di accessi in chiaro è esattamente ciò che un prodotto di compliance non può
// permettersi. Chi la crea la copia e la consegna; se la perde, la reimposta.

export type RigaUtente = {
  readonly id: string;
  readonly nome: string;
  readonly email: string;
  readonly ruolo: string;
  readonly io: boolean;
};

const RUOLI = [
  { valore: "admin", etichetta: "Amministratore", spiega: "configura l'istanza e gestisce le utenze" },
  { valore: "consulente", etichetta: "Consulente", spiega: "lavora gli adempimenti e le aziende" },
  { valore: "viewer", etichetta: "Sola lettura", spiega: "vede tutto, non modifica nulla" },
] as const;

export function GestioneUtenti({
  utenti,
  modificabile,
}: {
  utenti: readonly RigaUtente[];
  modificabile: boolean;
}) {
  const router = useRouter();
  const [creazione, azioneCrea, creando] = useActionState<EsitoUtente | null, FormData>(creaUtente, null);
  const [ruolo, azioneRuolo, cambiandoRuolo] = useActionState<EsitoUtente | null, FormData>(
    cambiaRuolo,
    null,
  );
  const [reset, azioneReset, reimpostando] = useActionState<EsitoUtente | null, FormData>(
    reimpostaPassword,
    null,
  );
  const [copiato, setCopiato] = useState(false);

  const consegna = creazione?.ok ? creazione : reset?.ok ? reset : null;
  const errore =
    (creazione && !creazione.ok && creazione.errore) ||
    (ruolo && !ruolo.ok && ruolo.errore) ||
    (reset && !reset.ok && reset.errore) ||
    null;
  const precedenti = creazione && !creazione.ok ? creazione.valori : undefined;

  const copia = async (testo: string) => {
    await navigator.clipboard.writeText(testo).catch(() => {});
    setCopiato(true);
    setTimeout(() => setCopiato(false), 2000);
  };

  return (
    <div className="space-y-5" data-tour="utenti">
      <div className="pannello overflow-x-auto">
        <Table>
          <TableHeader className="bg-surface-sunken">
            <TableRow className="border-b border-border-strong hover:bg-transparent">
              <TableHead className="h-8 px-3">Nome</TableHead>
              <TableHead className="h-8 px-3">Accesso</TableHead>
              <TableHead className="h-8 px-3">Ruolo</TableHead>
              <TableHead className="h-8 px-3" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {utenti.map((u) => (
              <TableRow key={u.id} className="h-riga-comoda border-b border-border-subtle last:border-0">
                <TableCell className="px-3 py-1.5 text-sm font-medium">
                  {u.nome}
                  {u.io ? <span className="ml-2 text-[10px] text-faint-foreground">(tu)</span> : null}
                </TableCell>
                <TableCell className="px-3 py-1.5 font-mono text-xs text-muted-foreground">
                  {u.email}
                </TableCell>
                <TableCell className="px-3 py-1.5">
                  <form action={azioneRuolo}>
                    <input type="hidden" name="userId" value={u.id} />
                    <select
                      name="ruolo"
                      defaultValue={u.ruolo}
                      disabled={!modificabile || cambiandoRuolo}
                      aria-label={`Ruolo di ${u.email}`}
                      onChange={(e) => e.currentTarget.form?.requestSubmit()}
                      className="h-7 rounded border border-border bg-surface px-1.5 text-xs outline-none hover:border-border-strong focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                    >
                      {RUOLI.map((r) => (
                        <option key={r.valore} value={r.valore}>
                          {r.etichetta}
                        </option>
                      ))}
                    </select>
                  </form>
                </TableCell>
                <TableCell className="px-3 py-1.5 text-right">
                  <form action={azioneReset}>
                    <input type="hidden" name="userId" value={u.id} />
                    <Button
                      type="submit"
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs"
                      disabled={!modificabile || reimpostando}
                      // IL CANCELLO VISIVO NON CLICCA QUESTO, e il motivo è che
                      // rigenererebbe la password di ogni utenza — compresa la propria, con
                      // cui deve rientrare al giro dopo. È già successo tre volte: tre giri
                      // bocciati con 401 e nessuna pagina protetta verificata.
                      //
                      // Non è un modo per nascondere il pulsante alla verifica. È che una
                      // spazzata di fumo non è il posto giusto per un'azione distruttiva:
                      // reimpostare una password va provato con un test che crea un'utenza
                      // usa e getta e poi verifica che la nuova password funzioni davvero,
                      // cosa che il cancello non saprebbe fare comunque.
                      data-cancello="salta"
                    >
                      <KeyRound className="size-3.5" aria-hidden />
                      Nuova password
                    </Button>
                  </form>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {consegna ? (
        <div className="rounded-md border border-regolare-border bg-regolare-surface px-4 py-3">
          <p className="text-xs font-semibold">Credenziali da consegnare · si vedono una volta sola</p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <code className="rounded border border-border bg-surface px-2 py-1 font-mono text-sm">
              {consegna.email}
            </code>
            <code className="rounded border border-border bg-surface px-2 py-1 font-mono text-sm">
              {consegna.password}
            </code>
            <Button
              size="sm"
              variant="outline"
              onClick={() => copia(`${consegna.email}\n${consegna.password}`)}
            >
              <Copy className="size-3.5" aria-hidden />
              {copiato ? "Copiato" : "Copia"}
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Non viene registrata da nessuna parte. Se la perdi, reimpostala.
          </p>
        </div>
      ) : null}

      {modificabile ? (
        <form action={azioneCrea} className="pannello space-y-3 p-5">
          <p className="text-xs font-semibold tracking-[0.09em] uppercase">Nuova utenza</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <label htmlFor="u-nome" className="text-xs font-medium">
                Nome
              </label>
              <Input
                id="u-nome"
                name="nome"
                required
                defaultValue={precedenti?.nome ?? ""}
                placeholder="Mario Rossi"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="u-email" className="text-xs font-medium">
                Indirizzo di posta
              </label>
              <Input
                id="u-email"
                name="email"
                type="email"
                required
                defaultValue={precedenti?.email ?? ""}
                placeholder="mario@studio.it"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="u-ruolo" className="text-xs font-medium">
                Ruolo
              </label>
              <select
                id="u-ruolo"
                name="ruolo"
                defaultValue={precedenti?.ruolo ?? "consulente"}
                className="h-9 w-full rounded-md border border-input bg-surface px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {RUOLI.map((r) => (
                  <option key={r.valore} value={r.valore}>
                    {r.etichetta} · {r.spiega}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="u-password" className="text-xs font-medium">
                Password
              </label>
              <Input id="u-password" name="password" placeholder="lasciala vuota e la genero io" />
            </div>
          </div>

          {errore ? (
            <p role="alert" className="flex items-start gap-1.5 text-xs text-scaduta">
              <AlertCircle className="mt-px size-3.5 shrink-0" aria-hidden />
              {errore}
            </p>
          ) : null}

          <Button type="submit" disabled={creando} data-tour="crea-utente" onClick={() => router.refresh()}>
            <UserPlus className="size-4" aria-hidden />
            {creando ? "Creazione…" : "Crea l'utenza"}
          </Button>
        </form>
      ) : (
        <p className="text-xs text-muted-foreground">
          Solo un amministratore può creare o modificare utenze.
        </p>
      )}
    </div>
  );
}
