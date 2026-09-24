#!/usr/bin/env bash
# Onboarding di un cliente: genera i segreti, dice quale DNS creare, alza lo stack,
# e verifica che sia davvero in piedi.
#
# Sostituisce i passi manuali del runbook, e non è comodità: i segreti generati a mano
# sono più deboli di quelli generati da `openssl`, e un passo saltato in una sequenza di
# otto è un'istanza consegnata senza backup o senza il controllo delle intestazioni.
#
# Uso (dalla radice del repository, SULLA VPS del cliente):
#   ./deploy/onboard-cliente.sh verdi                  genera l'env e stampa il DNS
#   ./deploy/onboard-cliente.sh verdi --avvia          ...e alza lo stack + collaudo
#
# Variabili:
#   DOMINIO_BASE   default legisboard.it
#   ADMIN_EMAIL    email del referente del cliente (obbligatoria: è l'utenza di accesso)
#   ADMIN_NOME     nome del referente
#   STUDIO_NOME    ragione sociale dello studio, compare nella barra e sulle relazioni
#
# Adattato da `WhistleBlower/deploy/onboard-client.sh`. Differenze: un dominio solo invece
# di due, e la verifica finale controlla anche `X-Robots-Tag`, che lì non serviva e qui sì.

set -euo pipefail

CLIENTE="${1:?Uso: onboard-cliente.sh <slug> [--avvia]   (es. verdi)}"
AVVIA="${2:-}"
DOMINIO_BASE="${DOMINIO_BASE:-legisboard.it}"
ENV_FILE="deploy/.env.prod"
COMPOSE_FILE="deploy/docker-compose.prod.yml"

# Lo slug finisce nel dominio: solo minuscole, cifre e trattini.
echo "$CLIENTE" | grep -Eq '^[a-z0-9]([a-z0-9-]*[a-z0-9])?$' \
  || { echo "ERRORE: slug non valido '$CLIENTE' (usa solo a-z, 0-9, -)" >&2; exit 1; }

DOMINIO="${CLIENTE}.${DOMINIO_BASE}"

if [ -f "$ENV_FILE" ]; then
  if [ "$AVVIA" != "--avvia" ]; then
    # UNA VPS PER CLIENTE: se l'env esiste, su questa macchina c'è già un'istanza viva.
    # Sovrascriverlo significherebbe cambiare la password del database sotto un
    # PostgreSQL che sta girando, e l'applicazione smetterebbe di connettersi.
    echo "ERRORE: $ENV_FILE esiste già su questa VPS." >&2
    echo "Una VPS per cliente: non sovrascrivo l'istanza esistente." >&2
    echo "Per avviare quella già configurata:  $0 $CLIENTE --avvia" >&2
    exit 1
  fi
  echo "[onboard] $ENV_FILE già presente — salto la generazione e alzo lo stack."
  DOMINIO=$(grep -E '^DOMINIO=' "$ENV_FILE" | cut -d= -f2)
else

# Il controllo è scritto per esteso invece che con `${ADMIN_EMAIL:?…}`: dentro quella
# forma bash tratta l'apostrofo come una quota aperta, e il messaggio in italiano ne è
# pieno. Uno script che non parte per un accento è un modo stupido di perdere un'ora.
if [ -z "${ADMIN_EMAIL:-}" ]; then
  echo "ERRORE: manca ADMIN_EMAIL." >&2
  echo "È la mail del referente del cliente, e diventa la sua utenza di accesso." >&2
  echo "  ADMIN_EMAIL=mario.rossi@studio.it ./deploy/onboard-cliente.sh $CLIENTE" >&2
  exit 1
fi

casuale() { openssl rand -hex "$1"; }

cat > "$ENV_FILE" <<EOF
# Generato da onboard-cliente.sh per '$CLIENTE' il $(date +%F). NON committare.
DOMINIO=$DOMINIO
CADDY_TLS=

POSTGRES_USER=compliance
POSTGRES_PASSWORD=$(casuale 24)
POSTGRES_DB=compliance

# Chi conosce questo valore può forgiare una sessione valida per qualunque utenza di
# questa istanza. È diverso per ogni cliente e finisce nel backup cifrato.
AUTH_SECRET=$(casuale 32)

# Il primo amministratore. Le credenziali si consegnano al referente su canale sicuro.
ADMIN_EMAIL=$ADMIN_EMAIL
ADMIN_PASSWORD=$(casuale 12)
ADMIN_NOME=${ADMIN_NOME:-Amministratore}
STUDIO_NOME=${STUDIO_NOME:-Studio}

RICHIEDI_CAMBIO_PASSWORD=true
ISTANZA_MODO=cliente

# La posta. Si eredita dall'ambiente di chi lancia l'onboarding, come nel riferimento — ma
# qui l'assenza si SEGNALA invece di passare inosservata: senza, le mail restano in coda e
# nessuno puo' recuperare la propria password.
SMTP_HOST=${SMTP_HOST:-}
SMTP_PORT=${SMTP_PORT:-587}
SMTP_USER=${SMTP_USER:-}
SMTP_PASSWORD=${SMTP_PASSWORD:-}
SMTP_MITTENTE=${SMTP_MITTENTE:-no-reply@${DOMINIO_BASE}}
EOF
chmod 600 "$ENV_FILE"
echo "[onboard] creato $ENV_FILE (chmod 600), segreti generati."

# SENZA POSTA L'ISTANZA PARTE LO STESSO, e questo e' il problema: le mail si accodano e non
# partono, senza un errore. Il riferimento lo lasciava scoprire al primo recupero password.
if [ -z "${SMTP_HOST:-}" ]; then
  echo ""
  echo "  ATTENZIONE: nessun relay di posta configurato."
  echo "  Recupero password e inviti NON funzioneranno: le mail resteranno in coda."
  echo ""
  echo "  Esporta le credenziali della casella Hostinger e rilancia:"
  echo "    export SMTP_HOST=smtp.hostinger.com SMTP_PORT=587"
  echo "    export SMTP_USER=ops@${DOMINIO_BASE} SMTP_PASSWORD=<password>"
  echo "    export SMTP_MITTENTE=no-reply@${DOMINIO_BASE}"
  echo ""
fi

IP=$(curl -fsS -4 https://ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')
cat <<EOF

[onboard] 1) Crea questo record DNS sul pannello di ${DOMINIO_BASE}:

   ${CLIENTE}    A    ${IP}    →   https://${DOMINIO}

   IL DNS DEVE PROPAGARE PRIMA DI ALZARE LO STACK: Caddy chiede il certificato
   all'avvio, e senza risoluzione il rilascio si ferma lì.

[onboard] 2) Credenziali iniziali, da consegnare su canale sicuro:

   utenza:   ${ADMIN_EMAIL}
   password: $(grep '^ADMIN_PASSWORD=' "$ENV_FILE" | cut -d= -f2)

EOF

if [ "$AVVIA" != "--avvia" ]; then
  echo "[onboard] Quando il DNS risolve:  ./deploy/onboard-cliente.sh $CLIENTE --avvia"
  exit 0
fi

fi  # chiude il ramo "env non ancora generato"

echo "[onboard] alzo lo stack (la prima build richiede parecchi minuti)…"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --build

# IL COLLAUDO NON È UN OPZIONALE. Un'istanza consegnata senza averla interrogata è
# un'istanza di cui si scopre lo stato dal cliente.
echo "[onboard] collaudo (attendo TLS e avvio, fino a ~4 minuti)…"
for i in $(seq 1 24); do
  if curl -fsS "https://${DOMINIO}/api/health" 2>/dev/null | grep -q '"stato":"ok"'; then
    echo "[onboard] salute OK su https://${DOMINIO}"
    break
  fi
  [ "$i" -eq 24 ] && {
    echo "ERRORE: la verifica di salute non risponde 'ok'." >&2
    echo "  · DNS propagato?   dig +short ${DOMINIO}" >&2
    echo "  · certificato?     docker compose -f $COMPOSE_FILE logs proxy | tail -30" >&2
    echo "  · database?        docker compose -f $COMPOSE_FILE logs db | tail -30" >&2
    exit 1
  }
  sleep 10
done

# `/api/health` interroga il database: un «ok» qui significa che l'istanza può SERVIRE,
# non solo che il processo è vivo.
echo "[onboard] intestazioni di sicurezza…"
"$(dirname "$0")/intestazioni-sicurezza.sh" "https://${DOMINIO}" \
  || { echo "ERRORE: intestazioni mancanti — NON consegnare l'istanza." >&2; exit 1; }

cat <<EOF

[onboard] COMPLETATO su https://${DOMINIO}

Restano da fare, e non sono formalità:
  1. primo accesso e configurazione del marchio dello studio
  2. passphrase di backup:  install -m 600 /dev/stdin /root/.compliance-backup
  3. PRIMO BACKUP SUBITO:
     BACKUP_PASSPHRASE_FILE=/root/.compliance-backup ./deploy/backup.sh
  4. PRIMA PROVA DI RIPRISTINO SUBITO — un backup mai ripristinato non è un backup:
     BACKUP_PASSPHRASE_FILE=/root/.compliance-backup ./deploy/restore-prova.sh
  5. cron: backup notturno + prova di ripristino mensile (esempi in fondo a backup.sh)
  6. documento di consegna da CONSEGNA-CLIENTE.md, su canale sicuro
  7. giro a mano fino al PDF: è l'unica parte che dipende da Chromium
EOF
