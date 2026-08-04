#!/usr/bin/env bash
# Bootstrap di una VPS nuova (Debian 12 / Ubuntu 24.04) per UN'istanza.
#
# Idempotente: rieseguirlo non fa danni. Si esegue come root, una volta sola:
#   ssh root@<IP> 'bash -s' < deploy/setup-vps.sh
#
# Poi si prosegue con `onboard-client.sh`, che genera i segreti e alza lo stack.
#
# Adattato da `WhistleBlower/deploy/setup-vps.sh`, con due differenze che contano:
# lo swap è più grande e i pacchetti comprendono `gnupg` per i backup cifrati.

set -euo pipefail
export DEBIAN_FRONTEND=noninteractive

echo "=== Suite Compliance — setup VPS ==="

echo "[setup] aggiornamento del sistema…"
apt-get update -q
apt-get upgrade -yq -o Dpkg::Options::=--force-confdef -o Dpkg::Options::=--force-confold

echo "[setup] pacchetti…"
apt-get install -yq docker.io docker-compose-v2 git fail2ban ufw curl gnupg jq
systemctl enable --now docker

# UFW: tutto chiuso tranne 22, 80, 443.
#
# ATTENZIONE, e vale come nel riferimento: i container Docker che pubblicano porte
# SCAVALCANO UFW, perché Docker gestisce iptables per conto proprio. La difesa vera è il
# firewall del provider; UFW serve per i servizi dell'host e per coerenza con la
# checklist. Nel nostro compose l'unico servizio che pubblica porte è il proxy (80/443):
# il database non ne pubblica nessuna, ed è la ragione per cui non compare qui.
echo "[setup] firewall…"
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo "[setup] fail2ban…"
cat > /etc/fail2ban/jail.local <<'JAIL'
[sshd]
enabled  = true
maxretry = 5
findtime = 600
bantime  = 3600
JAIL
systemctl enable --now fail2ban
systemctl restart fail2ban

# SSH solo a chiave — MA SOLO SE UNA CHIAVE È GIÀ AUTORIZZATA.
#
# È la riga più importante di questo script. Disabilitare la password senza una chiave
# funzionante significa chiudersi fuori da una macchina a cui si accede solo da lì, e
# l'unico rimedio è la console di emergenza del provider.
if [ -s /root/.ssh/authorized_keys ]; then
  sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
  sed -i 's/^#\?PermitRootLogin.*/PermitRootLogin prohibit-password/' /etc/ssh/sshd_config
  systemctl reload ssh
  echo "[setup] SSH: solo chiave pubblica"
else
  echo "[setup] ATTENZIONE: nessuna chiave in /root/.ssh/authorized_keys — password lasciata attiva"
fi

# SWAP 4 GB, il doppio del riferimento, e per una ragione precisa.
#
# L'immagine si costruisce a bordo, e la nostra build fa due cose che quella di
# WhistleBlower non fa: compila un progetto TypeScript intero (il typecheck di Next è la
# fase che consuma di più) e installa Chromium con le sue dipendenze. Su 4 GB di RAM,
# senza swap, la build va in OOM mentre il database sta girando — e l'OOM killer sceglie
# di solito il processo più grosso, che è la build: si vede un fallimento senza spiegazione.
if [ ! -f /swapfile ]; then
  echo "[setup] swap 4 GB…"
  fallocate -l 4G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

# Il fuso orario decide come si leggono le scadenze. Un termine di 72 ore calcolato su
# un server in UTC e mostrato a un consulente che ragiona in ora italiana è la premessa
# di una discussione che non si vuole avere.
timedatectl set-timezone Europe/Rome || true

echo "=== Setup completato ==="
echo "Prossimo passo:  git clone <repo> /srv/compliance && cd /srv/compliance"
echo "                 ADMIN_EMAIL=<referente> ./deploy/onboard-cliente.sh <slug>"
