#!/usr/bin/env bash
# Prepara i backup di un'istanza: sotto-account sulla Storage Box, repository restic, cron.
#
# Si esegue UNA VOLTA per cliente, dalla MACCHINA DI CONTROLLO — non dalla VPS.
#
#   ./deploy/backup-init.sh verdi root@<ip-della-vps>
#
# ─────────────────────────────────────────────────────────────────────────────────────────
# DUE DIFESE CHE SI COMPONGONO, e coprono due attacchi diversi
#
#   UN SOTTO-ACCOUNT PER ISTANZA (jailed)   contro il movimento laterale: una chiave rubata
#                                           su una VPS non vede i backup degli altri clienti.
#                                           È già la prassi in produzione su WhistleVault.
#
#   UNA CHIAVE APPEND-ONLY                  contro la distruzione: la VPS può scrivere nuovi
#                                           snapshot e NON può cancellarli. Chi entra nella
#                                           VPS non si porta via anche i backup — ed è ciò
#                                           che fa il 76% dei ransomware prima di toccare i
#                                           dati di produzione.
#
# Le credenziali di POTATURA restano solo qui. La VPS non le ha mai.
# ─────────────────────────────────────────────────────────────────────────────────────────
#
# ⚠️  NON ANCORA PROVATO SU UNA STORAGE BOX REALE. La Storage Box non è un SSH normale:
#     porta 23, shell ristretta (`ls`, `mkdir`, `rm`, `stat` — niente `find`), e i
#     sotto-account sono jailed e non scrivono su percorsi assoluti. **Non è dimostrato** che
#     accettino `command=` in `authorized_keys`, che è il meccanismo dell'append-only.
#
#     Il passo 4 di questo script lo VERIFICA e fallisce se non regge, invece di lasciar
#     credere a un'immutabilità che non c'è. Se fallisce, il ripiego è lo schema GPG del
#     vecchio `backup.sh`, già provato su cinque clienti: si perde l'immutabilità, si tiene
#     l'isolamento per sotto-account.

set -uo pipefail

SLUG="${1:?Uso: $0 <slug> <utente@vps>}"
# NIENTE APOSTROFI nei messaggi di `${var:?...}`: bash li tratta come una quota
# aperta, anche fra virgolette doppie, e l'errore che ne esce indica una riga a
# settanta righe di distanza. Il progetto lo aveva gia' annotato in
# `onboard-cliente.sh`, e ci sono cascato lo stesso.
VPS="${2:?serve indirizzo della VPS, es. root@1.2.3.4}"

: "${HCLOUD_TOKEN:?serve il token del progetto Hetzner backup — vedi ~/.config/flotta}"
: "${STORAGEBOX_ID:?serve identificativo della Storage Box}"

echo "$SLUG" | grep -Eq '^[a-z0-9]([a-z0-9-]*[a-z0-9])?$' \
  || { echo "ERRORE: slug non valido '$SLUG'." >&2; exit 1; }

# ── 1. Il sotto-account ──────────────────────────────────────────────────────────────────
# Si indirizza per NOME e non per username: Hetzner ha cambiato questa API a gennaio 2026 e
# la modifica ha rotto script di backup già in produzione altrove. Un identificativo
# esplicito non dipende da una convenzione che qualcuno può cambiare sotto di noi.
echo "[backup-init] sotto-account per ${SLUG}…"
SOTTO=$(hcloud storage-box subaccount create \
  --storage-box "$STORAGEBOX_ID" \
  --name "compliance-${SLUG}" \
  --home-directory "/istanze/${SLUG}" \
  --ssh --labels "prodotto=legisboard,slug=${SLUG}" \
  -o json 2>&1) || { echo "ERRORE: creazione fallita: $SOTTO" >&2; exit 1; }

UTENTE=$(printf '%s' "$SOTTO" | grep -oE '"username"\s*:\s*"[^"]+"' | cut -d'"' -f4)
HOST=$(printf '%s' "$SOTTO" | grep -oE '"server"\s*:\s*"[^"]+"' | cut -d'"' -f4)
[ -n "$UTENTE" ] && [ -n "$HOST" ] || { echo "ERRORE: non ho ricavato utenza e host." >&2; exit 1; }
echo "[backup-init] ${UTENTE}@${HOST} (porta 23)"

# ── 2. La chiave della VPS ───────────────────────────────────────────────────────────────
# Si genera SULLA VPS e la privata non esce mai da lì. Qui torna solo la pubblica.
echo "[backup-init] chiave sulla VPS…"
PUBBLICA=$(ssh "$VPS" '
  test -f /root/.ssh/storagebox_ao || ssh-keygen -t ed25519 -N "" -C "backup-append-only" -f /root/.ssh/storagebox_ao >/dev/null
  cat /root/.ssh/storagebox_ao.pub')

# ── 3. L'append-only ─────────────────────────────────────────────────────────────────────
# `restic serve --append-only` dietro `command=` è il meccanismo: la chiave può eseguire
# QUELLO e nient'altro, quindi `restic forget` e `restic prune` non hanno modo di arrivare
# al repository, nemmeno se chi ha la chiave li lancia.
echo "[backup-init] autorizzo la chiave in sola aggiunta…"
ssh -p 23 "${UTENTE}@${HOST}" "mkdir -p .ssh && echo 'command=\"restic serve --append-only --stdio\",restrict ${PUBBLICA}' >> .ssh/authorized_keys" \
  || { echo "ERRORE: il sotto-account non ha accettato authorized_keys." >&2; exit 1; }

# ── 4. LA PROVA CHE L'IMMUTABILITÀ ESISTA DAVVERO ────────────────────────────────────────
# Il passo che questo script esiste per fare. Un backup che si crede immutabile e non lo è è
# peggio di uno dichiaratamente mutabile: nessuno lo controlla più.
echo "[backup-init] inizializzo il repository…"
ssh "$VPS" "RESTIC_PASSWORD_FILE=/root/.compliance-backup \
  restic -r 'sftp:${UTENTE}@${HOST}:/istanze/${SLUG}/restic' init" 2>&1 | tail -2

echo "[backup-init] PROVA: la VPS deve poter scrivere…"
ssh "$VPS" "RESTIC_PASSWORD_FILE=/root/.compliance-backup \
  restic -r 'sftp:${UTENTE}@${HOST}:/istanze/${SLUG}/restic' backup --stdin --stdin-filename prova <<< 'prova'" >/dev/null 2>&1 \
  || { echo "ERRORE: la VPS non riesce a scrivere. Backup NON configurati." >&2; exit 1; }
echo "  ok  scrittura"

echo "[backup-init] PROVA: la VPS NON deve poter cancellare…"
if ssh "$VPS" "RESTIC_PASSWORD_FILE=/root/.compliance-backup \
   restic -r 'sftp:${UTENTE}@${HOST}:/istanze/${SLUG}/restic' forget --keep-last 0 --prune" >/dev/null 2>&1; then
  echo "" >&2
  echo "ALLARME: la cancellazione È RIUSCITA. L'append-only NON funziona." >&2
  echo "Un ransomware sulla VPS si porterebbe via anche i backup." >&2
  echo "" >&2
  echo "Ripiego: schema GPG del vecchio backup.sh, che tiene l'isolamento per" >&2
  echo "sotto-account e rinuncia all'immutabilità. Annotalo in GUASTI.md." >&2
  exit 1
fi
echo "  ok  cancellazione rifiutata — l'immutabilità c'è"

# ── 5. Il cron ───────────────────────────────────────────────────────────────────────────
echo "[backup-init] cron sulla VPS…"
ssh "$VPS" "cat > /etc/cron.d/compliance-backup <<CRON
# Backup notturno e sentinella. Generato da backup-init.sh.
RESTIC_REPOSITORY=sftp:${UTENTE}@${HOST}:/istanze/${SLUG}/restic
RESTIC_PASSWORD_FILE=/root/.compliance-backup
0 3 * * * root cd /srv/compliance && ./deploy/backup.sh >> /var/log/compliance-backup.log 2>&1
CRON
chmod 644 /etc/cron.d/compliance-backup"

cat <<FINE

[backup-init] ${SLUG} configurata.

  repository  sftp:${UTENTE}@${HOST}:/istanze/${SLUG}/restic
  chiave VPS  /root/.ssh/storagebox_ao        (SOLO aggiunta — provato)
  potatura    da questa macchina, con la chiave piena

RESTA DA FARE, e non sono formalità:

  1. primo backup subito:   ssh ${VPS} 'cd /srv/compliance && ./deploy/backup.sh'
  2. prima prova di ripristino SUBITO — un backup mai ripristinato non è un backup:
                            ssh ${VPS} 'cd /srv/compliance && ./deploy/restore-prova.sh'
     deve stampare aziende ed evidenze ENTRAMBE maggiori di zero
  3. potatura mensile da qui: ./controllo/prune.sh ${SLUG}
FINE
