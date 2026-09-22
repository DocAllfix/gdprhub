#!/usr/bin/env bash
# Cerca segreti finiti dove non devono stare, prima che ci finiscano per sempre.
#
# UN SEGRETO COMMITTATO UNA VOLTA RESTA NELLA STORIA DI GIT PER SEMPRE. Toglierlo con un
# commit successivo non lo toglie da lì: chiunque abbia un clone lo ha già, e riscrivere la
# storia di un repository condiviso è un'operazione che si fa una volta e si racconta per
# anni. L'unica difesa che funziona è non farceli arrivare.
#
# Uso:  ./deploy/check-segreti.sh
# Uscita 0 = pulito. Diversa da 0 = elenco di ciò che va tolto PRIMA di committare.

set -uo pipefail
cd "$(dirname "$0")/.."

trovati=0
segnala() {
  echo "  ✗ $1"
  trovati=$((trovati + 1))
}

echo "Controllo dei segreti"
echo "──────────────────────────────────────────────────────────"

# 1. I file che non devono esistere nell'indice di git, mai.
for f in deploy/.env.prod deploy/fleet.txt controllo/.env apps/web/.env.local apps/web/.env .env.local .env; do
  if git ls-files --error-unmatch "$f" >/dev/null 2>&1; then
    segnala "$f è TRACCIATO da git"
  fi
done

# 2. Gli stessi file, nella storia. Un `git rm` di oggi non li toglie da ieri.
for f in deploy/.env.prod apps/web/.env.local; do
  if git log --all --oneline -- "$f" 2>/dev/null | grep -q .; then
    segnala "$f compare nella STORIA di git — va rimosso riscrivendola, e i segreti ruotati"
  fi
done

# 3. Valori che somigliano a segreti nei file tracciati. Si cercano le FORME, non le
#    parole: `password` in un commento è innocuo, `password=` seguito da qualcosa no.
#    `.example` è escluso apposta: esiste per mostrare le chiavi, coi valori vuoti.
SOSPETTI=$(
  git grep -nIE "(AUTH_SECRET|POSTGRES_PASSWORD|ADMIN_PASSWORD|BLOB_READ_WRITE_TOKEN|DATABASE_URL)[[:space:]]*=[[:space:]]*['\"]?[A-Za-z0-9+/_:@.-]{12,}" \
    -- ':!*.example' ':!*.md' ':!deploy/check-segreti.sh' 2>/dev/null || true
)
if [ -n "$SOSPETTI" ]; then
  echo "$SOSPETTI" | while IFS= read -r riga; do echo "  ✗ possibile segreto: $riga"; done
  trovati=$((trovati + 1))
fi

# 4. Il segreto di sviluppo fuori dal proprio posto. È pubblico — sta nel repository — e
#    un'istanza che parte con quello lascia forgiare una sessione a chiunque legga il codice.
# Si esclude anche QUESTO file: contiene la stringa che sta cercando, e senza
# l'esclusione il controllo boccia sé stesso. Sembra ovvio a leggerlo e non lo è a
# scriverlo — al primo giro ha segnalato un problema che era solo la propria riga.
if git grep -nI "sviluppo-non-usare-in-produzione" \
  -- ':!apps/web/src/lib/env.ts' ':!*.md' ':!deploy/check-segreti.sh' >/dev/null 2>&1; then
  segnala "il segreto di sviluppo compare fuori da env.ts"
fi

# 4-bis. L'ARCHIVIO DELLE EVIDENZE, che è il caso che questo controllo NON aveva visto.
#
#     Tre PDF di prova erano tracciati da git, e `.archivio` non era fra i file ignorati.
#     È il percorso di ripiego dell'archivio su disco, quindi ogni documento caricato in
#     sviluppo — un DVR, un certificato medico, una nomina — vi finisce dentro e sarebbe
#     entrato nella storia al primo `git add -A`. Erano 87 byte di stub: il danno non c'era
#     ancora, il meccanismo sì.
if git ls-files | grep -qE '(^|/)\.archivio/'; then
  segnala "un file sotto .archivio/ è TRACCIATO da git: è un'evidenza documentale"
fi

# 4-ter. Le passphrase lasciate come file nella radice, tracciate o no.
#
#     `.gitignore` non protegge da questo, perché il problema non è git: è il file. Nel
#     progetto di riferimento un `.backup-passphrase.tmp` è rimasto nella radice, ignorato
#     da git e leggibile da chiunque abbia accesso alla macchina.
for f in .backup-passphrase* *passphrase*.txt *PASSPHRASE*; do
  [ -e "$f" ] && segnala "$f nella radice: una passphrase non si tiene in un file qui"
done

# 6. CREDENZIALI NELLE TABELLE DI CONSEGNA, che il controllo 3 non vede.
#
#     Il controllo 3 cerca una FORMA: `CHIAVE=valore` con esadecimale lungo. Una fuga reale
#     avvenuta nel progetto gemello FlowCRM aveva un'altra forma — una riga di tabella
#     markdown in un documento di consegna:
#
#         | `mario@studio.it` | `Manutenzione2026!` |
#
#     Nessun `=`, nessun esadecimale, nessuna parola chiave: invisibile al controllo 3. E i
#     nostri `CONSEGNA-CLIENTE.md` sono esattamente documenti di quella forma.
#
#     Il segnale è COMPOSTO: sulla stessa riga un indirizzo di posta E un valore fra apici
#     inversi lungo almeno otto caratteri, con lettere e cifre insieme.
#
#     LE EMAIL SI TOLGONO PRIMA di cercare la password, e non è un dettaglio di stile:
#     `mario@studio.it` ha lettere e cifre, quindi si segnalerebbe da solo e il controllo
#     diventerebbe rumore che si impara a ignorare. Un cancello che grida sempre è un
#     cancello spento. (Lezione pagata da FlowCRM al primo giro, su un file già bonificato.)
EMAIL='[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}'
GETTONE='`[A-Za-z0-9!@#$%^&*()_+=-]{8,}`'

#     L'esito si RACCOGLIE in una variabile invece di segnalare dentro il ciclo: `grep |
#     while` gira in una sottoshell, e lì l'incremento di `trovati` non tornerebbe indietro.
#     Il controllo direbbe di aver trovato qualcosa e uscirebbe con zero.
CREDENZIALI_MD=$(
  for f in $(git ls-files '*.md' 2>/dev/null); do
    grep -nE "$EMAIL" "$f" 2>/dev/null | while IFS= read -r riga; do
      numero="${riga%%:*}"
      resto=$(printf '%s' "${riga#*:}" | sed -E "s/$EMAIL//g")
      gettone=$(printf '%s' "$resto" | grep -oE "$GETTONE" | head -1)
      [ -n "$gettone" ] || continue
      printf '%s' "$gettone" | grep -q '[A-Za-z]' || continue
      printf '%s' "$gettone" | grep -q '[0-9]'   || continue
      echo "$f:$numero"
    done
  done
)
if [ -n "$CREDENZIALI_MD" ]; then
  echo "$CREDENZIALI_MD" | while IFS= read -r r; do
    echo "  ✗ $r: credenziale accanto a un indirizzo di posta"
  done
  trovati=$((trovati + 1))
fi

# 5. Chiavi private, ovunque.
if git grep -lI "BEGIN [A-Z ]*PRIVATE KEY" >/dev/null 2>&1; then
  segnala "una chiave privata è tracciata da git"
fi

echo "──────────────────────────────────────────────────────────"
if [ "$trovati" -gt 0 ]; then
  echo "$trovati problemi. NON committare finché non sono risolti."
  exit 1
fi
echo "Nessun segreto tracciato."
