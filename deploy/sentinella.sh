#!/usr/bin/env bash
# La sentinella dell'istanza: guarda, misura, e spinge un battito alla macchina di controllo.
#
# Gira da cron ogni cinque minuti sulla VPS del cliente:
#   */5 * * * * cd /srv/compliance && ./deploy/sentinella.sh >> /var/log/sentinella.log 2>&1
#
# ─────────────────────────────────────────────────────────────────────────────────────────
# PERCHÉ UN BATTITO IN USCITA E NON SOLO UNA SONDA IN ENTRATA
#
# Una sonda esterna vede «il sito non risponde». Questo vede «l'istanza non ha chiamato» —
# ed è ciò che intercetta il cron morto, il disco che si sta riempiendo, il backup che non
# parte più e il container che si riavvia ogni due minuti. Una VPS spenta non manda
# eccezioni: solo il SILENZIO la segnala.
#
# `set -uo pipefail` SENZA `-e`, di proposito: una sonda che fallisce non deve zittire le
# altre. Lo script esce sempre 0 — segnala e basta, non fa mai fallire il cron.
# (Impostazione presa da sistemacommercialisti, che l'ha scritta per primo.)
#
# NON REGISTRA DATI. Numeri e stati, mai contenuti, mai indirizzi di rete dei visitatori:
# su un'istanza che tratta le evidenze dei clienti di uno studio legale, un file di
# sorveglianza pieno di dati sarebbe a sua volta un trattamento da censire.
# ─────────────────────────────────────────────────────────────────────────────────────────

set -uo pipefail
cd "$(dirname "$0")/.."

COMPOSE="${COMPOSE_FILE:-deploy/docker-compose.prod.yml}"
ENVF="${ENV_FILE:-deploy/.env.prod}"
BATTITO="${BATTITO_URL:-}"
SLUG="${ISTANZA_SLUG:-$(grep -E '^DOMINIO=' "$ENVF" 2>/dev/null | cut -d= -f2- | cut -d. -f1)}"

avvisi=()
critici=()
avviso()  { avvisi+=("$1"); }
critico() { critici+=("$1"); }

dc() { docker compose -f "$COMPOSE" --env-file "$ENVF" "$@" 2>/dev/null; }
psqlq() { dc exec -T db psql -U "$(grep -E '^POSTGRES_USER=' "$ENVF" | cut -d= -f2-)" \
          -d "$(grep -E '^POSTGRES_DB=' "$ENVF" | cut -d= -f2-)" -tA -c "$1" 2>/dev/null | tr -d '\r'; }

# ── 1. Disco ─────────────────────────────────────────────────────────────────────────────
# Il guasto più comune su una VPS dimenticata, e la causa numero uno sono i log di Docker
# senza `max-size`. Si guarda anche `/var/lib/docker` separatamente: spesso è su un volume
# suo, e riempirlo ferma i container mentre `/` sembra tranquillo.
for punto in / /var/lib/docker; do
  [ -d "$punto" ] || continue
  uso=$(df -P "$punto" 2>/dev/null | awk 'NR==2 {print 0+$5}')
  [ -z "$uso" ] && continue
  [ "$uso" -ge 90 ] && critico "disco ${punto} al ${uso}%"
  [ "$uso" -ge 80 ] && [ "$uso" -lt 90 ] && avviso "disco ${punto} al ${uso}%"
done

# ── 2. Container ─────────────────────────────────────────────────────────────────────────
for s in db app proxy; do
  stato=$(dc ps --format '{{.State}}' "$s" | head -1)
  [ "$stato" = "running" ] || critico "container ${s}: ${stato:-assente}"
done

# ── 3. Riavvii ───────────────────────────────────────────────────────────────────────────
# `restart: unless-stopped` MASCHERA i crash-loop: il container torna su e risulta
# «running». Senza questo contatore, un difetto che riavvia l'applicazione ogni due minuti è
# perfettamente invisibile. È la sonda che consiglierei più di tutte.
for s in db app proxy; do
  cid=$(dc ps -q "$s" | head -1)
  [ -n "$cid" ] || continue
  n=$(docker inspect -f '{{.RestartCount}}' "$cid" 2>/dev/null || echo 0)
  [ "${n:-0}" -ge 10 ] && critico "${s}: ${n} riavvii"
  [ "${n:-0}" -ge 3 ] && [ "${n:-0}" -lt 10 ] && avviso "${s}: ${n} riavvii"
done

# ── 4. Salute applicativa ────────────────────────────────────────────────────────────────
# Interroga il database e verifica che l'istanza contenga UNA sola organizzazione: due
# significherebbero che lo scoping applicativo non basta più.
salute=$(dc exec -T app node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>r.text()).then(t=>console.log(t))" 2>/dev/null)
printf '%s' "$salute" | grep -q '"stato":"ok"' || critico "salute: $(printf '%s' "$salute" | head -c 80)"

# ── 5. Database ──────────────────────────────────────────────────────────────────────────
lente=$(psqlq "select count(*) from pg_stat_activity where state='active' and now()-query_start > interval '30 seconds';")
[ "${lente:-0}" -gt 0 ] && avviso "${lente} query attive da oltre 30s"

conn=$(psqlq "select round(100.0*count(*)/greatest((select setting::int from pg_settings where name='max_connections'),1)) from pg_stat_activity;")
[ "${conn:-0}" -ge 90 ] && critico "connessioni al ${conn}% del massimo"
[ "${conn:-0}" -ge 70 ] && [ "${conn:-0}" -lt 90 ] && avviso "connessioni al ${conn}%"

dead=$(psqlq "select coalesce(sum(deadlocks),0) from pg_stat_database;")
[ "${dead:-0}" -gt 0 ] && avviso "${dead} deadlock dall'avvio"

# ── 6. Posta ─────────────────────────────────────────────────────────────────────────────
# RELAY GIÙ SIGNIFICA CHE NESSUNO PUÒ RECUPERARE LA PROPRIA PASSWORD, e con la registrazione
# pubblica chiusa non c'è un'altra strada: l'unico rimedio sarebbe un nostro accesso a mano
# al database del cliente. Va saputo entro mezz'ora, non il giorno dopo.
sofferenza=$(psqlq "select count(*) from outbox where stato='fallita' or (stato='attesa' and creata_il < now() - interval '30 minutes');")
[ "${sofferenza:-0}" -gt 0 ] && critico "${sofferenza} mail non consegnate"

# ── 7. Backup ────────────────────────────────────────────────────────────────────────────
# Il `backup.sh` del progetto di riferimento falliva in silenzio su un log che nessuno
# leggeva. Qui l'assenza di un backup recente è un allarme al pari di un'istanza giù.
if [ -n "${RESTIC_REPOSITORY:-}" ] && command -v restic >/dev/null 2>&1; then
  eta=$(restic snapshots --json --latest 1 2>/dev/null \
        | grep -oE '"time":"[^"]+"' | head -1 | cut -d'"' -f4)
  if [ -n "$eta" ]; then
    ore=$(( ( $(date +%s) - $(date -d "$eta" +%s 2>/dev/null || echo 0) ) / 3600 ))
    [ "$ore" -gt 50 ] && critico "ultimo backup ${ore}h fa"
    [ "$ore" -gt 26 ] && [ "$ore" -le 50 ] && avviso "ultimo backup ${ore}h fa"
  else
    critico "nessuno snapshot restic leggibile"
  fi
fi

# ── 8. Certificato ───────────────────────────────────────────────────────────────────────
# Caddy rinnova da solo. Quando smette di farlo — porta 80 chiusa da una regola nuova, DNS
# spostato — non lo dice: lo si scopre dal browser di un cliente il giorno della scadenza.
DOMINIO=$(grep -E '^DOMINIO=' "$ENVF" 2>/dev/null | cut -d= -f2-)
if [ -n "$DOMINIO" ] && command -v openssl >/dev/null 2>&1; then
  fine=$(echo | openssl s_client -connect "${DOMINIO}:443" -servername "$DOMINIO" 2>/dev/null \
         | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)
  if [ -n "$fine" ]; then
    giorni=$(( ( $(date -d "$fine" +%s 2>/dev/null || echo 0) - $(date +%s) ) / 86400 ))
    [ "$giorni" -lt 14 ] && critico "certificato scade fra ${giorni} giorni"
    [ "$giorni" -lt 21 ] && [ "$giorni" -ge 14 ] && avviso "certificato scade fra ${giorni} giorni"
  fi
fi

# ── 9. Sistema ───────────────────────────────────────────────────────────────────────────
swap=$(free 2>/dev/null | awk '/Swap:/ {if ($2>0) print int(100*$3/$2); else print 0}')
[ "${swap:-0}" -ge 80 ] && critico "swap al ${swap}%"
[ "${swap:-0}" -ge 50 ] && [ "${swap:-0}" -lt 80 ] && avviso "swap al ${swap}%"

sicurezza=$(apt-get -s upgrade 2>/dev/null | grep -ci '^Inst.*security' || echo 0)
[ "${sicurezza:-0}" -gt 0 ] && avviso "${sicurezza} aggiornamenti di sicurezza pendenti"

# ── Esito ────────────────────────────────────────────────────────────────────────────────
livello="ok"
[ ${#avvisi[@]}  -gt 0 ] && livello="avviso"
[ ${#critici[@]} -gt 0 ] && livello="critico"

unisci() { local IFS="; "; echo "$*"; }
messaggio=$(unisci "${critici[@]:-}" "${avvisi[@]:-}")

echo "$(date -Is) [${livello}] ${SLUG} ${messaggio}"

# IL BATTITO SI SPINGE SEMPRE, anche quando va tutto bene: è proprio il battito che NON
# arriva a dire che qualcosa non va. Un monitor push con intervallo di quindici minuti
# allarma da solo se la sentinella muore, se cade il cron o se la macchina si spegne.
if [ -n "$BATTITO" ]; then
  curl -fsS -m 15 -X POST "$BATTITO" \
    -H 'Content-Type: application/json' \
    -d "{\"slug\":\"${SLUG}\",\"livello\":\"${livello}\",\"dettaglio\":\"${messaggio//\"/}\"}" \
    >/dev/null 2>&1 || echo "$(date -Is) [avviso] ${SLUG} battito non recapitato"
fi

# ESCE SEMPRE 0: segnala, non fallisce. Un cron che fallisce manda una mail a root che
# nessuno legge, e nasconde il fatto che la sonda successiva non è nemmeno partita.
exit 0
