#!/usr/bin/env bash
# Verifica le intestazioni di sicurezza di un'istanza già online.
#
# Il Caddyfile le DICHIARA; questo controlla che arrivino davvero al browser. Non è la
# stessa cosa: un blocco `header` nel posto sbagliato, un `handle` che intercetta prima, un
# proxy davanti che le riscrive, e la dichiarazione resta vera mentre la realtà è un'altra.
#
# Uso:  ./deploy/intestazioni-sicurezza.sh https://verdi.compliancedesk.it
# Uscita 0 = tutte presenti. Diversa da 0 = elenco di ciò che manca.

set -uo pipefail

BASE="${1:?Uso: $0 https://dominio.esempio}"
echo "Intestazioni di $BASE"
echo "──────────────────────────────────────────────────────────"

INTESTAZIONI=$(curl -sSI --max-time 20 "$BASE/accedi" | tr -d '\r')
if [ -z "$INTESTAZIONI" ]; then
  echo "ERRORE: nessuna risposta." >&2
  exit 1
fi

mancanti=0

pretendi() {
  nome="$1"
  atteso="$2"
  valore=$(printf '%s\n' "$INTESTAZIONI" | grep -i "^$nome:" | cut -d' ' -f2- | head -1)
  if [ -z "$valore" ]; then
    echo "  MANCA   $nome"
    mancanti=$((mancanti + 1))
  elif [ -n "$atteso" ] && ! printf '%s' "$valore" | grep -qi "$atteso"; then
    echo "  DIVERSA $nome: «$valore» (attesa: $atteso)"
    mancanti=$((mancanti + 1))
  else
    echo "  ok      $nome: $valore"
  fi
}

# Un'istanza cliente non deve comparire nei motori di ricerca. Sulla VETRINA questa riga
# non deve esserci, ed è l'unica differenza fra le due configurazioni.
pretendi "X-Robots-Tag" "noindex"
pretendi "Strict-Transport-Security" "max-age="
pretendi "X-Content-Type-Options" "nosniff"
pretendi "X-Frame-Options" "DENY"
pretendi "Referrer-Policy" ""
pretendi "Cross-Origin-Opener-Policy" "same-origin"
pretendi "Permissions-Policy" ""

# LA CACHE È UNA QUESTIONE DI RISERVATEZZA, non di prestazioni: una pagina di assessment
# finita in una cache condivisa è il dato di un cliente servito a un altro.
pretendi "Cache-Control" "no-store"

# L'annuncio del server non è una vulnerabilità, ma è la versione regalata a chi cerca
# bersagli per una falla nota.
if printf '%s\n' "$INTESTAZIONI" | grep -qi "^Server:"; then
  echo "  AVVISO  Server: annunciato ($(printf '%s\n' "$INTESTAZIONI" | grep -i '^Server:' | cut -d' ' -f2-))"
fi

echo "──────────────────────────────────────────────────────────"
if [ "$mancanti" -gt 0 ]; then
  echo "$mancanti intestazioni mancanti o diverse dall'atteso."
  exit 1
fi
echo "Tutte presenti."
