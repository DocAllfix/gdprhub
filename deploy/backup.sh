#!/usr/bin/env bash
# Backup cifrato di un'istanza cliente.
#
# COSA SALVA, e perché ognuna delle tre cose serve:
#
#   1. il dump PostgreSQL      — aziende, assessment, registri, relazioni pubblicate,
#                                registro degli eventi. È il prodotto del lavoro.
#   2. il volume dell'archivio — le EVIDENZE documentali. Senza, il database conserva
#                                l'impronta SHA-256 di file che non esistono più, e ogni
#                                scaricamento fallisce: peggio di un archivio vuoto,
#                                perché il sistema continua a dichiarare che il documento
#                                c'è.
#   3. `deploy/.env.prod`      — contiene `AUTH_SECRET`. Perderlo non perde dati, ma
#                                invalida ogni sessione e va rigenerato; e soprattutto
#                                contiene la password del database, senza la quale il
#                                dump non si ripristina.
#
# TUTTO CIFRATO, con GPG simmetrico. Un backup in chiaro su una macchina qualunque è un
# secondo trattamento non censito degli stessi dati, e in un prodotto che vende conformità
# al GDPR sarebbe una contraddizione difficile da spiegare a un ispettore.
#
# Uso (dalla radice del repository, tipicamente da cron):
#   BACKUP_PASSPHRASE_FILE=/root/.compliance-backup ./deploy/backup.sh
#
# Variabili:
#   BACKUP_PASSPHRASE_FILE  file (chmod 600, fuori dal repository) con la passphrase
#   BACKUP_DIR              default /var/backups/compliance
#   GIORNI_RITENZIONE       default 30
#   RCLONE_REMOTE           es. "b2-eu:backup/verdi" → copia fuori sede, in UE
#
# I messaggi non contengono dati: nomi di file e conteggi, niente contenuti.

set -euo pipefail

COMPOSE_FILE="${COMPOSE_FILE:-deploy/docker-compose.prod.yml}"
ENV_FILE="${ENV_FILE:-deploy/.env.prod}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/compliance}"
GIORNI_RITENZIONE="${GIORNI_RITENZIONE:-30}"
PASS_FILE="${BACKUP_PASSPHRASE_FILE:?Imposta BACKUP_PASSPHRASE_FILE (file con la passphrase GPG, chmod 600)}"

[ -f "$PASS_FILE" ] || { echo "ERRORE: passphrase '$PASS_FILE' non trovata" >&2; exit 1; }
[ -f "$ENV_FILE" ] || { echo "ERRORE: '$ENV_FILE' non trovato (esegui dalla radice del repository)" >&2; exit 1; }

POSTGRES_USER=$(grep -E '^POSTGRES_USER=' "$ENV_FILE" | cut -d= -f2-)
POSTGRES_DB=$(grep -E '^POSTGRES_DB=' "$ENV_FILE" | cut -d= -f2-)

TIMBRO=$(date +%F-%H%M%S)
DEST="$BACKUP_DIR/$TIMBRO"
mkdir -p "$DEST"
chmod 700 "$BACKUP_DIR" "$DEST"

cifra() { gpg --batch --quiet --symmetric --cipher-algo AES256 --passphrase-file "$PASS_FILE" -o "$1"; }

echo "[backup] dump del database"
# `--format=custom` e non SQL semplice: si ripristina con `pg_restore`, che sa saltare
# oggetti e riordinare le dipendenze. Un dump testuale di uno schema con trigger e vincoli
# incrociati va ripristinato tutto o niente.
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T db \
  pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom --no-owner \
  | cifra "$DEST/database.dump.gpg"

echo "[backup] volume delle evidenze"
# Compose antepone il nome del progetto ai volumi, e il nome del progetto è per
# impostazione predefinita quello della cartella. Si dichiara invece di dedurlo con una
# catena di comandi: un backup che sbaglia il nome del volume non fallisce, salva una
# cartella vuota — ed è il modo in cui ci si accorge del problema il giorno del ripristino.
PROGETTO="${COMPOSE_PROJECT_NAME:-$(basename "$PWD")}"
VOLUME="${PROGETTO}_archivio"
docker volume inspect "$VOLUME" >/dev/null 2>&1 || {
  echo "ERRORE: volume '$VOLUME' inesistente. Imposta COMPOSE_PROJECT_NAME." >&2
  exit 1
}

# Si legge il volume da un contenitore usa e getta invece che dal contenitore vivo: non
# richiede che l'applicazione sia in piedi, e funziona anche mentre si sta riavviando.
docker run --rm -v "$VOLUME":/dati:ro alpine tar -czf - -C /dati . \
  | cifra "$DEST/archivio.tar.gz.gpg"

echo "[backup] configurazione"
cifra "$DEST/env.prod.gpg" < "$ENV_FILE"

# LE IMPRONTE SI CALCOLANO SUI FILE CIFRATI, non su quelli in chiaro: servono a dire che il
# backup è arrivato integro, e per verificarlo non si deve decifrare niente.
( cd "$DEST" && sha256sum ./*.gpg > SHA256SUMS )

echo "[backup] completato in $DEST"
ls -la "$DEST"

if [ -n "${RCLONE_REMOTE:-}" ]; then
  echo "[backup] copia fuori sede su $RCLONE_REMOTE"
  rclone copy "$DEST" "$RCLONE_REMOTE/$TIMBRO"
fi

# La rotazione cancella per ULTIMA cosa. Farlo prima significherebbe, nel giorno in cui il
# dump fallisce, restare senza il vecchio e senza il nuovo.
find "$BACKUP_DIR" -mindepth 1 -maxdepth 1 -type d -mtime "+$GIORNI_RITENZIONE" -exec rm -rf {} +

# --- Da mettere in cron ------------------------------------------------------------------
#   0 3 * * *  cd /srv/compliance && BACKUP_PASSPHRASE_FILE=/root/.compliance-backup \
#              ./deploy/backup.sh >> /var/log/compliance-backup.log 2>&1
#
# UN BACKUP MAI RIPRISTINATO NON È UN BACKUP. Accanto a questo va programmato
# `restore-prova.sh`, almeno mensile: è l'unico modo di sapere che i file cifrati che si
# stanno accumulando contengono davvero qualcosa.
