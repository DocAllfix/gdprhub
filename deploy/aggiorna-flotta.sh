#!/usr/bin/env bash
# Aggiorna le istanze della flotta, una alla volta, fermandosi alla prima che si rompe.
#
# UNA ALLA VOLTA, E CI SI FERMA. La tentazione è aggiornarle in parallelo: sono
# indipendenti, e in parallelo ci si mette un decimo del tempo. Ma se la versione nuova ha
# un difetto, in parallelo lo si scopre su tutti i clienti insieme; in fila lo si scopre sul
# primo, e gli altri restano alla versione che funzionava. La lentezza è la funzionalità.
#
# La flotta è un elenco di righe in `deploy/fleet.txt`, che NON sta nel repository:
# contiene gli indirizzi dei clienti.
#
#   <nome>  <utente@host>      <percorso>        <dominio>
#   verdi   root@81.2.3.4      /srv/compliance   verdi.compliancedesk.it
#   rossi   deploy@10.0.0.7    /srv/compliance   rossi.compliancedesk.it
#
# Uso:  ./deploy/aggiorna-flotta.sh [--prova]
#   --prova  dice cosa farebbe senza toccare niente

set -uo pipefail
cd "$(dirname "$0")/.."

ELENCO="${FLEET_FILE:-deploy/fleet.txt}"
PROVA=""
[ "${1:-}" = "--prova" ] && PROVA="1"

[ -f "$ELENCO" ] || {
  echo "ERRORE: '$ELENCO' non trovato. Vedi il commento in cima a questo file." >&2
  exit 1
}

aggiornate=0
fallite=0

while read -r nome host percorso dominio; do
  case "$nome" in ""|\#*) continue ;; esac

  echo ""
  echo "══ $nome ($host) ══════════════════════════════════════"

  if [ -n "$PROVA" ]; then
    echo "  (prova) aggiornerei $percorso su $host"
    continue
  fi

  # IL BACKUP PRIMA DELL'AGGIORNAMENTO, sempre. Una migrazione che rimuove una colonna è
  # irreversibile, e `git revert` non riporta indietro i dati.
  echo "  → backup"
  # shellcheck disable=SC2029
  if ! ssh "$host" "cd '$percorso' && BACKUP_PASSPHRASE_FILE=/root/.compliance-backup ./deploy/backup.sh"; then
    echo "  ✗ backup fallito: NON aggiorno."
    fallite=$((fallite + 1))
    break
  fi

  echo "  → aggiornamento"
  # shellcheck disable=SC2029
  if ! ssh "$host" "cd '$percorso' && git pull --ff-only && docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env.prod up -d --build"; then
    echo "  ✗ aggiornamento fallito."
    fallite=$((fallite + 1))
    break
  fi

  # LA VERIFICA DI SALUTE INTERROGA IL DATABASE. Un controllo che dicesse solo «il processo
  # risponde» direbbe la cosa che si sapeva già, e lascerebbe proseguire il rilascio sulle
  # istanze successive con la prima già rotta.
  echo "  → salute"
  salute=""
  for _ in $(seq 1 20); do
    salute=$(ssh "$host" "curl -sf --max-time 10 http://127.0.0.1:3000/api/health" 2>/dev/null || true)
    printf '%s' "$salute" | grep -q '"stato":"ok"' && break
    sleep 5
  done

  if ! printf '%s' "$salute" | grep -q '"stato":"ok"'; then
    echo "  ✗ $nome non torna sana. MI FERMO: le istanze successive restano alla versione precedente."
    fallite=$((fallite + 1))
    break
  fi

  # LE INTESTAZIONI NON DEVONO REGREDIRE, ed è un controllo che l'istanza sana non fa.
  #
  # Un'applicazione può rispondere benissimo e aver perso `X-Robots-Tag` perché qualcuno
  # ha toccato il Caddyfile: l'istanza è viva, il cliente non se ne accorge, e finisce nei
  # motori di ricerca. Il riferimento WhistleBlower lo mette qui, dopo l'aggiornamento, ed
  # è il punto giusto — è l'unico momento in cui qualcosa può essere cambiato.
  echo "  → intestazioni"
  if ! "$(dirname "$0")/intestazioni-sicurezza.sh" "https://${dominio}" >/dev/null; then
    echo "  ✗ $nome: intestazioni di sicurezza regredite dopo l'aggiornamento. MI FERMO."
    fallite=$((fallite + 1))
    break
  fi

  echo "  ✓ $nome aggiornata, sana, con le intestazioni al loro posto"
  aggiornate=$((aggiornate + 1))
done < "$ELENCO"

echo ""
echo "──────────────────────────────────────────────────────────"
echo "$aggiornate aggiornate, $fallite fallite"
[ "$fallite" -eq 0 ] || exit 1
