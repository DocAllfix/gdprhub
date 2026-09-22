#!/usr/bin/env bash
# Crea o rimuove il record DNS di un'istanza, sulle zone di Hostinger.
#
# CONDIVISO FRA I TRE PRODOTTI della casa — gdprhub, advisorhub, FlowCRM — e non per
# comodità: è il punto in cui tre implementazioni diverse sarebbero tre modi diversi di
# azzerare la zona di un dominio. Una sola, provata una volta.
#
# Uso:
#   HOSTINGER_API_TOKEN=… ./deploy/dns-hostinger.sh crea   verdi compliancedesk.it 1.2.3.4
#   HOSTINGER_API_TOKEN=… ./deploy/dns-hostinger.sh togli  verdi compliancedesk.it
#   HOSTINGER_API_TOKEN=… ./deploy/dns-hostinger.sh elenca compliancedesk.it
#
# Il gettone si genera da hPanel → API. Vive in `~/.config/flotta/hostinger.env`, chmod 600,
# e NON sta mai su una VPS cliente: questo script gira sulla macchina dell'operatore.
#
# ─────────────────────────────────────────────────────────────────────────────────────────
# LA RIGA PIÙ PERICOLOSA DELL'INTERO PLAYBOOK
#
# L'API di Hostinger accetta `overwrite`. Con `true` non aggiunge un record: **sostituisce
# l'intera zona**. Attivare un cliente metterebbe offline tutti gli altri dello stesso
# prodotto, e la chiamata risponderebbe 200.
#
# Perciò tre difese, non una — e la terza è quella che manca a chi ci pensa solo una volta:
#
#   1. `overwrite: false`, sempre;
#   2. ISTANTANEA della zona prima di ogni scrittura, che fa **ripristinare**;
#   3. CONTEGGIO dei record dopo, che fa **accorgere**.
#
# Con la sola istantanea, il momento in cui si scopre di aver azzerato la zona è la telefonata
# di un cliente. Il conteggio lo scopre in dieci secondi. *(La terza difesa è di
# sistemacommercialisti, ed è migliore delle mie due messe insieme.)*
# ─────────────────────────────────────────────────────────────────────────────────────────

set -uo pipefail

API="https://developers.hostinger.com/api/dns/v1"
AZIONE="${1:-}"
ISTANTANEE="${ISTANTANEE:-deploy/.dns-snapshot}"

[ -n "${HOSTINGER_API_TOKEN:-}" ] || {
  echo "ERRORE: manca HOSTINGER_API_TOKEN." >&2
  echo "  set -a; . ~/.config/flotta/hostinger.env; set +a" >&2
  exit 1
}

# Il gettone non compare MAI in un messaggio, nemmeno troncato: questi script girano anche
# da cron, e un log è un file che qualcuno legge.
chiama() {
  curl -sS --max-time 30 \
    -H "Authorization: Bearer ${HOSTINGER_API_TOKEN}" \
    -H "Content-Type: application/json" \
    "$@"
}

conta_record() {
  chiama "${API}/zones/$1" | grep -o '"type"' | wc -l
}

istantanea() {
  local dominio="$1" quando
  quando=$(date +%F-%H%M%S)
  mkdir -p "$ISTANTANEE"
  chmod 700 "$ISTANTANEE"
  local file="${ISTANTANEE}/${dominio}-${quando}.json"
  chiama "${API}/zones/${dominio}" > "$file" || return 1
  # Una zona salvata vuota è peggio di nessuna istantanea: darebbe l'illusione di poter
  # tornare indietro. Meglio fermarsi prima di scrivere.
  if [ ! -s "$file" ] || ! grep -q '"type"' "$file"; then
    echo "ERRORE: l'istantanea di ${dominio} è vuota o illeggibile. NON scrivo." >&2
    rm -f "$file"
    return 1
  fi
  echo "$file"
}

case "$AZIONE" in
  elenca)
    DOMINIO="${2:?Uso: $0 elenca <dominio>}"
    chiama "${API}/zones/${DOMINIO}"
    ;;

  crea)
    SLUG="${2:?Uso: $0 crea <slug> <dominio> <ip>}"
    DOMINIO="${3:?manca il dominio}"
    # Niente apostrofi qui dentro: bash li tratta come quota aperta. Vedi
    # `onboard-cliente.sh`, che lo aveva gia' annotato.
    IP="${4:?serve indirizzo IPv4 della VPS}"

    echo "$SLUG" | grep -Eq '^[a-z0-9]([a-z0-9-]*[a-z0-9])?$' \
      || { echo "ERRORE: slug non valido '$SLUG' (solo a-z, 0-9, -)" >&2; exit 1; }
    echo "$IP" | grep -Eq '^([0-9]{1,3}\.){3}[0-9]{1,3}$' \
      || { echo "ERRORE: '$IP' non è un indirizzo IPv4." >&2; exit 1; }

    echo "[dns] istantanea della zona ${DOMINIO}…"
    FILE=$(istantanea "$DOMINIO") || exit 1
    PRIMA=$(conta_record "$DOMINIO")
    echo "[dns] salvata in ${FILE} — ${PRIMA} record"

    echo "[dns] creo ${SLUG}.${DOMINIO} → ${IP}"
    # `overwrite: false`. Non si tocca. Vedi il blocco in cima al file.
    # Il corpo si costruisce PRIMA della chiamata, in una variabile.
    #
    # Annidare una heredoc dentro una sostituzione di comando dentro una stringa fra
    # virgolette e' valido in teoria e confonde il parser di bash in pratica: l'errore
    # che si ottiene indica una riga a settanta righe di distanza, ed e' l'unico modo di
    # perdere venti minuti su uno script di trenta righe.
    CORPO=$(printf '%s' "{\"overwrite\":false,\"zone\":[{\"name\":\"${SLUG}\",\"type\":\"A\",\"ttl\":300,\"records\":[{\"content\":\"${IP}\"}]}]}")

    RISPOSTA=$(chiama -X PUT "${API}/zones/${DOMINIO}" -d "$CORPO")

    DOPO=$(conta_record "$DOMINIO")
    echo "[dns] record nella zona: ${PRIMA} → ${DOPO}"

    # IL CONTROLLO CHE FA ACCORGERE. Un `overwrite` andato a buon fine risponde 200 e lascia
    # la zona con un record solo: senza questo confronto la chiamata sembrerebbe riuscita.
    if [ "$DOPO" -lt "$PRIMA" ]; then
      echo "" >&2
      echo "ALLARME: la zona è DIMINUITA di $((PRIMA - DOPO)) record." >&2
      echo "Ripristina subito da: ${FILE}" >&2
      echo "Risposta: ${RISPOSTA}" >&2
      exit 1
    fi
    if [ "$DOPO" -eq "$PRIMA" ]; then
      echo "AVVISO: il conteggio non è cresciuto. Il record esisteva già?" >&2
      echo "Risposta: ${RISPOSTA}" >&2
    fi

    # Verifica sugli ALTRI, non su quello appena creato: il nuovo deve ancora propagare,
    # mentre uno già attivo deve continuare a risolvere. È la prova che non si è rotto nulla.
    echo "[dns] controllo che gli altri slug risolvano ancora…"
    ALTRI=$(grep -vE "^\s*#|^\s*$" "${FLEET_FILE:-deploy/fleet.txt}" 2>/dev/null | awk '{print $4}' | grep -v "^${SLUG}\." | head -2)
    for d in $ALTRI; do
      if [ -n "$(dig +short "$d" 2>/dev/null)" ]; then
        echo "  ok  $d"
      else
        echo "  ATTENZIONE: $d non risolve più." >&2
      fi
    done

    # Il testo finale sta in un heredoc QUOTATO: senza, la shell prova a eseguire il
    # `$(dig …)` che stiamo solo suggerendo all'operatore. Un messaggio d'aiuto che si
    # esegue da solo è un errore di sintassi nel migliore dei casi.
    cat <<'SUGGERIMENTO'

[dns] fatto. Attendi la propagazione prima di alzare lo stack:

      until [ -n "$(dig +short SLUG.DOMINIO)" ]; do sleep 10; done

      Caddy chiede il certificato all'avvio: senza risoluzione il rilascio si ferma lì.
SUGGERIMENTO
    ;;

  togli)
    SLUG="${2:?Uso: $0 togli <slug> <dominio>}"
    DOMINIO="${3:?manca il dominio}"

    # SI TOGLIE PER PRIMO, alla dismissione di un cliente: un record che punta a un indirizzo
    # non più nostro è un subdomain takeover, cioè il nome del nostro prodotto che serve
    # contenuto di qualcun altro.
    echo "[dns] istantanea della zona ${DOMINIO}…"
    FILE=$(istantanea "$DOMINIO") || exit 1
    PRIMA=$(conta_record "$DOMINIO")
    echo "[dns] salvata in ${FILE} — ${PRIMA} record"

    echo "[dns] rimuovo ${SLUG}.${DOMINIO}"
    chiama -X DELETE "${API}/zones/${DOMINIO}" -d "{\"filters\":[{\"name\":\"${SLUG}\",\"type\":\"A\"}]}" >/dev/null

    DOPO=$(conta_record "$DOMINIO")
    echo "[dns] record nella zona: ${PRIMA} → ${DOPO}"
    # Qui la diminuzione è attesa, ma di UNO solo.
    if [ "$((PRIMA - DOPO))" -gt 1 ]; then
      echo "ALLARME: sono spariti $((PRIMA - DOPO)) record invece di uno." >&2
      echo "Ripristina da: ${FILE}" >&2
      exit 1
    fi
    ;;

  *)
    echo "Uso: $0 {crea|togli|elenca} …" >&2
    echo "  crea   <slug> <dominio> <ip>" >&2
    echo "  togli  <slug> <dominio>" >&2
    echo "  elenca <dominio>" >&2
    exit 1
    ;;
esac
