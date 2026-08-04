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
for f in deploy/.env.prod deploy/fleet.txt apps/web/.env.local apps/web/.env; do
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
