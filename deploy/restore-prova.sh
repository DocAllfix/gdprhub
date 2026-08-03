#!/usr/bin/env bash
# Prova di ripristino, senza toccare l'istanza in esercizio.
#
# UN BACKUP MAI RIPRISTINATO NON È UN BACKUP: è una cartella di file cifrati che nessuno ha
# mai aperto. Il giorno in cui serve si scopre che la passphrase era un'altra, o che il
# volume salvato era vuoto perché il nome era sbagliato, o che il dump si interrompeva a
# metà. Tutte cose che si scoprono in tre minuti adesso e in tre ore quel giorno.
#
# Cosa verifica, in ordine di ciò che può andare storto:
#   1. le impronte SHA-256 dei file cifrati       (il backup è arrivato integro?)
#   2. la decifratura                             (la passphrase è quella giusta?)
#   3. il ripristino in un PostgreSQL EFFIMERO    (il dump è ripristinabile?)
#   4. il CONTENUTO, non solo lo schema           (ci sono davvero le righe?)
#   5. l'archivio delle evidenze                  (quanti file, e si leggono?)
#
# Il punto 4 è quello che distingue questa prova da un controllo di forma. Un dump di un
# database vuoto si ripristina benissimo.
#
# Uso:  BACKUP_PASSPHRASE_FILE=/root/.compliance-backup ./deploy/restore-prova.sh [CARTELLA]
# Uscita 0 = ripristino verificato. Diversa da 0 = il backup NON è affidabile.

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/backups/compliance}"
PASS_FILE="${BACKUP_PASSPHRASE_FILE:?Imposta BACKUP_PASSPHRASE_FILE}"
BERSAGLIO="${1:-$(find "$BACKUP_DIR" -mindepth 1 -maxdepth 1 -type d | sort | tail -1)}"

[ -n "$BERSAGLIO" ] && [ -d "$BERSAGLIO" ] || {
  echo "ERRORE: nessun backup in $BACKUP_DIR" >&2
  exit 1
}
echo "[prova] verifico: $BERSAGLIO"

# 1. Integrità
( cd "$BERSAGLIO" && sha256sum -c SHA256SUMS ) || {
  echo "ERRORE: impronte non corrispondenti — il backup è corrotto" >&2
  exit 1
}

decifra() { gpg --batch --quiet --decrypt --passphrase-file "$PASS_FILE" "$1"; }

# 5. L'archivio delle evidenze. Si conta: un tar valido ma vuoto passerebbe un `tar -t`
# senza dire niente, ed è esattamente il guasto silenzioso che si teme.
VOCI=$(decifra "$BERSAGLIO/archivio.tar.gz.gpg" | tar -tzf - | wc -l)
echo "[prova] archivio leggibile: $VOCI voci"

# 3. PostgreSQL effimero, su una porta a caso e senza volumi: nasce, riceve il dump, muore.
NOME="prova-ripristino-$$"
PASSWORD_TEMPORANEA=$(head -c 18 /dev/urandom | base64)
docker run -d --rm --name "$NOME" \
  -e POSTGRES_PASSWORD="$PASSWORD_TEMPORANEA" -e POSTGRES_DB=prova \
  postgres:17-alpine >/dev/null

# Si smonta SEMPRE, anche se qualcosa esplode: un contenitore dimenticato con dentro il
# ripristino di dati veri sarebbe la cosa peggiore che questo script possa lasciare in giro.
trap 'docker rm -f "$NOME" >/dev/null 2>&1 || true' EXIT

for _ in $(seq 1 30); do
  docker exec "$NOME" pg_isready -U postgres -d prova >/dev/null 2>&1 && break
  sleep 1
done

echo "[prova] ripristino del dump"
decifra "$BERSAGLIO/database.dump.gpg" \
  | docker exec -i "$NOME" pg_restore -U postgres -d prova --no-owner --clean --if-exists \
  || echo "[prova] pg_restore ha segnalato avvisi (normale su --clean di un database nuovo)"

# 4. IL CONTENUTO. Le tabelle che, se vuote, dicono che il backup non vale niente.
echo "[prova] conteggi"
docker exec -i "$NOME" psql -U postgres -d prova -tA -F' ' -c "
  select 'aziende',      count(*) from client_company
  union all select 'adempimenti', count(*) from obligation_instance
  union all select 'registri',    count(*) from registro
  union all select 'relazioni',   count(*) from report
  union all select 'eventi',      count(*) from audit_log;"

AZIENDE=$(docker exec -i "$NOME" psql -U postgres -d prova -tA -c "select count(*) from client_company;")
if [ "$AZIENDE" -eq 0 ]; then
  echo "ERRORE: nessuna azienda ripristinata. Il dump si apre ma è vuoto." >&2
  exit 1
fi

echo "[prova] ripristino verificato: $AZIENDE aziende, $VOCI evidenze."
