#!/usr/bin/env bash
# Backup di un'istanza cliente, su Hetzner Storage Box, in sola aggiunta.
#
# COSA SALVA, e perché ognuna delle tre cose serve:
#
#   1. il dump PostgreSQL      — aziende, assessment, registri, relazioni pubblicate,
#                                registro degli eventi. È il prodotto del lavoro.
#   2. il volume dell'archivio — le EVIDENZE documentali. Senza, il database conserva
#                                l'impronta SHA-256 di file che non esistono più, e ogni
#                                scaricamento fallisce: peggio di un archivio vuoto, perché
#                                il sistema continua a dichiarare che il documento c'è.
#   3. `deploy/.env.prod`      — contiene `AUTH_SECRET`. Perderlo non perde dati, ma
#                                invalida ogni sessione; e contiene la password del
#                                database, senza la quale il dump non si ripristina.
#
# Uso (dalla radice del repository, tipicamente da cron):
#   ./deploy/backup.sh
#
# `RESTIC_REPOSITORY` e `RESTIC_PASSWORD_FILE` arrivano da `/etc/cron.d/compliance-backup`,
# scritto da `backup-init.sh`.
#
# ─────────────────────────────────────────────────────────────────────────────────────────
# PERCHÉ restic E NON PIÙ GPG + rclone
#
# Lo schema precedente funzionava ed era provato. Aveva un punto debole solo, e decisivo:
# le credenziali `rclone` stavano SULLA VPS, quindi chi entrava nella VPS poteva cancellare
# anche le copie remote. È ciò che fa il 76% dei ransomware prima di toccare i dati.
#
# Con restic dietro una chiave in sola aggiunta, questa macchina può SCRIVERE e non può
# CANCELLARE. La potatura la fa la macchina di controllo, con una chiave che qui non esiste.
#
# In più: deduplicazione. Uno snapshot orario di un database che cambia poco costa quasi
# niente, ed è ciò che porta l'RPO da ventiquattro ore a una.
#
# I messaggi non contengono dati: nomi, conteggi e byte, mai contenuti.
# ─────────────────────────────────────────────────────────────────────────────────────────

set -uo pipefail

COMPOSE_FILE="${COMPOSE_FILE:-deploy/docker-compose.prod.yml}"
ENV_FILE="${ENV_FILE:-deploy/.env.prod}"
BATTITO="${BATTITO_URL:-}"

: "${RESTIC_REPOSITORY:?manca RESTIC_REPOSITORY — lo imposta backup-init.sh in /etc/cron.d}"
: "${RESTIC_PASSWORD_FILE:?manca RESTIC_PASSWORD_FILE}"
[ -f "$RESTIC_PASSWORD_FILE" ] || { echo "ERRORE: passphrase non trovata." >&2; exit 1; }
[ -f "$ENV_FILE" ] || { echo "ERRORE: '$ENV_FILE' non trovato (esegui dalla radice)." >&2; exit 1; }

POSTGRES_USER=$(grep -E '^POSTGRES_USER=' "$ENV_FILE" | cut -d= -f2-)
POSTGRES_DB=$(grep -E '^POSTGRES_DB=' "$ENV_FILE" | cut -d= -f2-)
SLUG=$(grep -E '^DOMINIO=' "$ENV_FILE" | cut -d= -f2- | cut -d. -f1)

dc() { docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" "$@"; }

esito="ok"
guasto=""
fallisci() { esito="errore"; guasto="$1"; echo "ERRORE: $1" >&2; }

# ── 1. Il database ───────────────────────────────────────────────────────────────────────
# `--format=custom` e non SQL semplice: si ripristina con `pg_restore`, che sa saltare
# oggetti e riordinare le dipendenze.
#
# `--compress=0` NON È UNA SVISTA. Comprimendo prima di restic la deduplicazione non aggancia
# niente e ogni snapshot diventa un blocco nuovo: si perderebbe esattamente la ragione per cui
# restic è stato scelto. Comprime restic, e lo fa dopo aver deduplicato.
# (Segnalazione di sistemacommercialisti.)
echo "[backup] database"
if ! dc exec -T db pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
      --format=custom --compress=0 --no-owner \
   | restic backup --stdin --stdin-filename database.dump \
       --tag database --tag "$SLUG" --host "$SLUG"; then
  fallisci "dump del database"
fi

# ── 2. Le evidenze ───────────────────────────────────────────────────────────────────────
# Si legge il volume da un contenitore usa e getta invece che dal contenitore vivo: non
# richiede che l'applicazione sia in piedi, e funziona anche mentre si sta riavviando.
#
# Il nome del volume si DICHIARA invece di dedurlo. Compose antepone il nome del progetto, e
# un nome dedotto male non fa fallire il backup: gli fa salvare una cartella vuota, e lo si
# scopre il giorno del ripristino. È il guasto A1 del registro, ed è successo davvero.
echo "[backup] evidenze"
PROGETTO="${COMPOSE_PROJECT_NAME:-legisboard-prod}"
VOLUME="${PROGETTO}_archivio"
if ! docker volume inspect "$VOLUME" >/dev/null 2>&1; then
  fallisci "volume '$VOLUME' inesistente — imposta COMPOSE_PROJECT_NAME"
else
  MONTATO=$(docker volume inspect "$VOLUME" --format '{{.Mountpoint}}')
  QUANTI=$(find "$MONTATO" -type f 2>/dev/null | wc -l)
  echo "[backup] ${QUANTI} file nell'archivio"
  # ZERO EVIDENZE SU UN'ISTANZA VIVA È UN SEGNALE, non un'informazione. Il conteggio finisce
  # nel battito e la sentinella lo guarda: è il modo in cui si scopre B2 prima del ripristino.
  if ! restic backup "$MONTATO" --tag evidenze --tag "$SLUG" --host "$SLUG"; then
    fallisci "archivio delle evidenze"
  fi
fi

# ── 3. La configurazione ─────────────────────────────────────────────────────────────────
echo "[backup] configurazione"
restic backup "$ENV_FILE" --tag config --tag "$SLUG" --host "$SLUG" >/dev/null \
  || fallisci "file di configurazione"

# ── 4. Ritenzione: SI DICHIARA, NON SI APPLICA ───────────────────────────────────────────
# `forget` qui fallirebbe — e deve fallire: la chiave di questa macchina è in sola aggiunta.
# La potatura la fa la macchina di controllo con `controllo/prune.sh`, che ha la chiave piena.
#
# Se un giorno questo comando riuscisse, vorrebbe dire che l'append-only si è rotto.
echo "[backup] ritenzione: --keep-hourly 24 --keep-daily 14 --keep-weekly 8 --keep-monthly 12"
echo "         (la potatura la esegue la macchina di controllo)"

# ── 5. Il battito ────────────────────────────────────────────────────────────────────────
# Il `backup.sh` del progetto di riferimento fallisce in silenzio su un log che nessuno
# legge. Qui l'esito esce dalla macchina: se non arriva un backup riuscito da due notti, la
# sorveglianza allarma da sola, senza che nessuno debba ricordarsi di guardare.
ULTIMO=$(restic snapshots --json --latest 1 2>/dev/null | grep -oE '"time":"[^"]+"' | head -1 | cut -d'"' -f4)
echo "[backup] esito: ${esito}${guasto:+ — $guasto} · ultimo snapshot: ${ULTIMO:-nessuno}"

if [ -n "$BATTITO" ]; then
  curl -fsS -m 15 -X POST "$BATTITO" -H 'Content-Type: application/json' \
    -d "{\"slug\":\"${SLUG}\",\"livello\":\"$([ "$esito" = ok ] && echo ok || echo critico)\",\"dettaglio\":\"backup ${esito} ${guasto}\",\"evidenze\":${QUANTI:-0}}" \
    >/dev/null 2>&1 || echo "[backup] AVVISO: battito non recapitato"
fi

[ "$esito" = "ok" ] || exit 1

# --- Da mettere in cron, e lo fa `backup-init.sh` ----------------------------------------
#   0 3 * * *  cd /srv/compliance && ./deploy/backup.sh >> /var/log/compliance-backup.log 2>&1
#
# UN BACKUP MAI RIPRISTINATO NON È UN BACKUP. Accanto a questo va programmato
# `restore-prova.sh`, almeno mensile: è l'unico modo di sapere che gli snapshot che si stanno
# accumulando contengono davvero qualcosa.
