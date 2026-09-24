#!/usr/bin/env bash
# Mette un'istanza sotto sorveglianza, e la toglie.
#
# Si esegue sulla MACCHINA DI CONTROLLO, non sulla VPS del cliente.
#
#   ./controllo/monitor-add.sh   verdi verdi.legisboard.it
#   ./controllo/monitor-add.sh --togli verdi
#
# ─────────────────────────────────────────────────────────────────────────────────────────
# PERCHÉ UNO SCRIPT E NON QUALCHE CLIC
#
# Un monitor creato a mano è un monitor che al decimo cliente qualcuno dimentica, e che
# nessuno si accorge di aver dimenticato — finché quel cliente non chiama. Nel progetto di
# riferimento la sorveglianza era descritta bene in un runbook e la macchina non è mai stata
# creata: la differenza fra una procedura e un comando è che il comando viene eseguito.
#
# I monitor sono file YAML: finiscono in git, si rivedono in una revisione, e si ricostruiscono
# da zero se la macchina si perde. È il motivo per cui questa macchina usa Gatus invece di
# Uptime Kuma, che si configura solo cliccando.
# ─────────────────────────────────────────────────────────────────────────────────────────

set -uo pipefail
cd "$(dirname "$0")"

CLIENTI="gatus/clienti"
COMPOSE="docker compose -f docker-compose.yml --env-file .env"

if [ "${1:-}" = "--togli" ]; then
  SLUG="${2:?Uso: $0 --togli <slug>}"
  FILE="${CLIENTI}/${SLUG}.yaml"
  [ -f "$FILE" ] || { echo "Nessun monitor per '${SLUG}'."; exit 0; }
  rm -f "$FILE"
  # Si ricarica invece di riavviare: un riavvio interromperebbe le sonde di tutti gli altri
  # clienti per togliere quelle di uno.
  $COMPOSE kill -s HUP gatus >/dev/null 2>&1 || $COMPOSE restart gatus >/dev/null 2>&1
  echo "[monitor] ${SLUG}: sorveglianza rimossa."
  echo "Ricordati anche: progetto GlitchTip, riga in fleet.txt, record DNS."
  exit 0
fi

SLUG="${1:?Uso: $0 <slug> <dominio>   oppure   $0 --togli <slug>}"
DOMINIO="${2:?manca il dominio}"

echo "$SLUG" | grep -Eq '^[a-z0-9]([a-z0-9-]*[a-z0-9])?$' \
  || { echo "ERRORE: slug non valido '$SLUG'." >&2; exit 1; }

FILE="${CLIENTI}/${SLUG}.yaml"
if [ -f "$FILE" ]; then
  echo "ERRORE: ${SLUG} è già sorvegliato (${FILE})." >&2
  echo "Per rifarlo: $0 --togli ${SLUG} && $0 ${SLUG} ${DOMINIO}" >&2
  exit 1
fi

sed -e "s/__SLUG__/${SLUG}/g" -e "s/__DOMINIO__/${DOMINIO}/g" \
  "${CLIENTI}/_MODELLO.yaml" > "$FILE"

echo "[monitor] creato ${FILE}"
$COMPOSE kill -s HUP gatus >/dev/null 2>&1 || $COMPOSE restart gatus >/dev/null 2>&1

# LA CONFIGURAZIONE VA VERIFICATA, non data per buona: uno YAML malformato fa ripartire
# Gatus senza le sonde nuove, e il servizio resta «su». Sarebbe una sorveglianza che sembra
# esserci e non c'è — la stessa forma del guasto che questo file esiste per evitare.
sleep 3
if $COMPOSE logs --tail 20 gatus 2>&1 | grep -qiE "error|failed to (parse|load)"; then
  echo "ERRORE: Gatus non ha accettato la configurazione." >&2
  $COMPOSE logs --tail 10 gatus >&2
  exit 1
fi

cat <<FINE

[monitor] ${SLUG} sorvegliata. Due sonde:

  ${SLUG}          https://${DOMINIO}/api/health ogni 60 s, da fuori
  ${SLUG}-battito  attende il battito di sentinella.sh, scadenza 15 min

Sulla VPS del cliente resta da impostare l'indirizzo del battito:

  BATTITO_URL=https://<controllo>/api/v1/endpoints/battiti_${SLUG}-battito/external?token=\$GATUS_TOKEN

e il cron:

  */5 * * * * cd /srv/compliance && BATTITO_URL=… ./deploy/sentinella.sh >> /var/log/sentinella.log 2>&1

PROVA D'ALLARME, e non è una formalità — un monitoraggio mai provato è una configurazione,
non una sorveglianza:

  sulla VPS:  docker compose … stop app      → deve arrivare la notifica
              docker compose … start app     → e deve arrivare il rientro
FINE
