# Playbook — attivare un'istanza cliente

**Per chi non ha mai visto questo progetto.** Ogni passo ha il comando da dare e **l'output
atteso**. Chi segue questo file non deve decidere niente: se un output non corrisponde, si
ferma e apre [`GUASTI.md`](GUASTI.md).

> **La regola che rende utile questo file**: se incontri un guasto che qui non c'è, lo
> aggiungi a `GUASTI.md` **prima** di dichiarare consegnata l'istanza. Non a fine giornata.

Tempo: **~15 minuti**, di cui 8 di costruzione dell'immagine.

> ## ⚠️ Stato al 2026-09-18: quattro passi non sono ancora eseguibili
>
> Questo playbook descrive la sequenza completa, e **quattro script che cita non esistono
> ancora**. Sta scritto qui e non in fondo perché un playbook che manda a cercare un file
> assente è esattamente il difetto che questo file dovrebbe prevenire.
>
> | Passo | Script                                    | Stato                    |
> | ----- | ----------------------------------------- | ------------------------ |
> | 2     | `deploy/cloud-init.yaml`                  | **da scrivere** (Fase F) |
> | 6     | `deploy/backup-init.sh`                   | **da scrivere** (Fase D) |
> | 7     | `deploy/monitor-add.sh`, `monitor-del.sh` | **da scrivere** (Fase E) |
>
> Tutti e tre aspettano cose che non dipendono dal codice: i token Hetzner e Hostinger, il
> dominio registrato, e la conferma che la Storage Box esista. Finché non ci sono:
>
> - **passo 2**: si crea la VPS dal pannello Hetzner e si lancia `setup-vps.sh` a mano;
> - **passo 6**: vale lo schema GPG dell'attuale `backup.sh`, senza immutabilità;
> - **passo 7**: i monitor si creano a mano nell'interfaccia di Uptime Kuma.
>
> Tutto il resto — passi 1, 3, 4, 5, 8, 9, 10 e la dismissione — è **provato**.

---

## Prima di cominciare — una volta sola, non per cliente

- [ ] Dominio registrato su Hostinger e record **CAA**: `0 issue "letsencrypt.org"`.
      Senza, qualunque altra CA può emettere certificati per i nostri sottodomini.
- [ ] `~/.config/flotta/{hetzner,hostinger,storagebox}.env`, `chmod 600`, cartella `700`.
      Copia nel gestore di password aziendale. **Mai su una VPS cliente.**
- [ ] **Due progetti Hetzner**: uno per la flotta, uno separato `backup` per la Storage Box.
      Il motivo sta in [`GO-LIVE.md`](GO-LIVE.md): un token unico potrebbe cancellare server
      **e** backup insieme, scavalcando la chiave append-only.
- [ ] Macchina di controllo attiva (GlitchTip + Uptime Kuma), **separata dai clienti**: se il
      monitoraggio gira sulla VPS del cliente, quando la VPS cade cade anche ciò che doveva
      avvisarti.
- [ ] **Casella di posta sul dominio Hostinger** — non serve un provider
      transazionale: la casella arriva col dominio, e Hostinger configura SPF e DKIM
      sulla zona che gestisce già lui. È ciò che fa il riferimento in produzione. - pannello → **Email** → crea `ops@<dominio>` - alias `no-reply@`, `postmaster@`, `abuse@`, `dmarc@` - **verifica che SPF, DKIM e DMARC siano attivi**: il pannello li mette da solo,
      ma vanno guardati. Senza DKIM le mail finiscono nello spam e il gate del
      passo 9 fallisce per una ragione che non sembra tecnica - credenziali in `~/.config/flotta/hostinger.env`, **accanto al token DNS**
- [ ] `deploy/fleet.txt` esiste. **Non si committa**: contiene gli indirizzi dei clienti.

---

## 1 · Raccogli i dati del cliente

|           | Esempio                      | Vincolo                                     |
| --------- | ---------------------------- | ------------------------------------------- |
| slug      | `verdi`                      | solo `a-z`, `0-9`, `-`; finisce nel dominio |
| referente | `mario.rossi@studioverdi.it` | diventa la sua utenza di accesso            |
| studio    | `Studio Legale Verdi`        | compare nella barra e sulle relazioni       |

Lo slug **non si cambia dopo**: è nel dominio, nei backup e nel monitoraggio.

---

## 2 · Crea la VPS

```bash
set -a; . ~/.config/flotta/hetzner.env; set +a

hcloud server create --name compliance-verdi \
  --image ubuntu-24.04 --type cx22 --location fsn1 \
  --ssh-key flotta --firewall flotta-web \
  --user-data-from-file deploy/cloud-init.yaml
```

**Atteso**: `Server <id> created`, poi l'indirizzo IPv4.

Il **firewall di Hetzner sta prima della macchina**, quindi Docker — che riscrive iptables per
conto proprio — non lo può scavalcare. È la ragione per cui il muro vero è lì e non in `ufw`.

> `cx22` e non un taglio più grande: l'immagine si tira da GHCR, non si costruisce a bordo.
> Se un giorno tornasse la costruzione sulla VPS, serve almeno `cx32` e 4 GB di swap.

---

## 3 · Crea il record DNS

```bash
set -a; . ~/.config/flotta/hostinger.env; set +a
./deploy/dns-hostinger.sh crea verdi legisboard.it <IP>
```

**Atteso**:

```
[dns] salvata in deploy/.dns-snapshot/… — N record
[dns] record nella zona: N → N+1
[dns] controllo che gli altri slug risolvano ancora…
  ok  rossi.legisboard.it
```

🛑 **Se il conteggio DIMINUISCE, fermati.** Lo script esce con 1 e dice da quale istantanea
ripristinare. È la riga più pericolosa dell'intero playbook: `overwrite: true` sostituisce
l'**intera zona** e risponde 200.

**Aspetta la propagazione prima del passo 5**:

```bash
until [ -n "$(dig +short verdi.legisboard.it)" ]; do sleep 10; done
```

Caddy chiede il certificato all'avvio: senza risoluzione il rilascio si ferma lì.

---

## 4 · Prepara la macchina

```bash
ssh root@<IP> 'bash -s' < deploy/setup-vps.sh
```

**Atteso**: `=== Setup completato ===`. Installa docker, `ufw`, `fail2ban`, fuso orario
italiano.

Poi:

```bash
ssh root@<IP> 'git clone <repository> /srv/compliance'
```

---

## 5 · Genera i segreti e alza lo stack

```bash
ssh root@<IP>
cd /srv/compliance
# La posta si eredita dall'ambiente. Senza, le mail si accodano e non partono, e
# nessuno puo' recuperare la propria password: lo script lo segnala, ma meglio
# non arrivarci.
export SMTP_HOST=smtp.hostinger.com SMTP_PORT=587
export SMTP_USER=ops@legisboard.it SMTP_PASSWORD='<dal gestore>'
export SMTP_MITTENTE=no-reply@legisboard.it

ADMIN_EMAIL=mario.rossi@studioverdi.it \
STUDIO_NOME="Studio Legale Verdi" \
./deploy/onboard-cliente.sh verdi --avvia
```

**Atteso**, in quest'ordine:

```
[onboard] creato deploy/.env.prod (chmod 600), segreti generati.
 Container legisboard-prod-db-1  Healthy
 Container legisboard-prod-preparazione-1  Exited
 Container legisboard-prod-app-1  Started
[onboard] salute OK su https://verdi.legisboard.it
  ok      Content-Security-Policy: … nonce-…
Tutte presenti.
[onboard] COMPLETATO
```

🛑 **Se `app` resta in `Restarting`**: `docker compose … logs app | head -30`. Il messaggio
c'è sempre ed è esplicito. Vedi `GUASTI.md` **B1** (valore fuori enum) e **B3** (dipendenza
mancante nell'immagine).

**Verifica che le variabili siano arrivate** — è la classe di difetti B8, silenziosa perché
Zod scarta le chiavi sconosciute senza protestare:

```bash
docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env.prod \
  exec -T app sh -c 'echo "[$ARCHIVIO_RADICE] [$SMTP_HOST]"'
```

**Atteso**: `[/dati/archivio] [smtp.…]`. Se una è vuota, il nome non combacia con lo schema.

---

## 6 · Backup, **prima** di dichiarare il go-live

```bash
install -m 600 /dev/stdin /root/.compliance-backup   # incolla dal gestore, Ctrl-D
./deploy/backup-init.sh verdi
BACKUP_PASSPHRASE_FILE=/root/.compliance-backup ./deploy/backup.sh
BACKUP_PASSPHRASE_FILE=/root/.compliance-backup ./deploy/restore-prova.sh
```

**Atteso dal ripristino**: `aziende: N, evidenze: M`, **entrambi maggiori di zero**.

🛑 **Se le evidenze sono 0** e ne hai caricata almeno una: è `GUASTI.md` **B2** — l'archivio
scrive fuori dal volume montato, e il backup salva una cartella vuota senza lamentarsi.

**Prova che la chiave append-only funzioni davvero**:

```bash
restic forget --prune --keep-last 1
```

**Atteso**: **FALLISCE** con un errore di permessi. Se riesce, la VPS può cancellare i propri
backup e l'immutabilità non c'è.

Poi il cron: backup notturno e prova di ripristino mensile.

---

## 7 · Monitoraggio

```bash
./deploy/monitor-add.sh verdi verdi.legisboard.it
crontab -l | grep sentinella   # */5 * * * * … sentinella.sh
```

**Prova d'allarme reale**, che non è una formalità:

```bash
docker compose … stop app     # deve arrivare la notifica
docker compose … start app
```

Se la notifica non arriva, il monitoraggio non esiste — esiste solo la sua configurazione.

---

## 8 · Il giro a mano, che nessuno script sostituisce

- [ ] Accesso con le credenziali iniziali → **cambio password forzato**
- [ ] Impostazioni → marchio dello studio
- [ ] Impostazioni → **attiva il secondo fattore**: QR, codice, codici di recupero
- [ ] Crea un'azienda, attiva i tre moduli
- [ ] Apri una voce di registro con il suo termine
- [ ] **Carica un'evidenza**, poi `docker compose restart app`, poi **riscaricala**
- [ ] Genera una relazione, pubblicala, **scarica il PDF**

**Il PDF è l'unica parte che dipende da Chromium**, quindi l'unica che può funzionare in
sviluppo e fallire su una macchina nuova. Se un solo passo va provato, è questo.

**Il riscaricamento dell'evidenza dopo il riavvio** è la prova di B2, e nessun test la
sostituisce.

---

## 9 · La prova della posta, che è un gate

Dal riferimento WhistleVault, ed è il cancello migliore che ha:

- [ ] Esci → «Password dimenticata?» con l'utenza del referente
- [ ] **Il messaggio deve arrivare** alla casella — controlla anche lo spam
- [ ] Completa il reimposta e rientra

**Senza questo PASS il go-live non si dichiara.** Una mail scritta e mai verificata non
protegge nessuno, e con la registrazione pubblica chiusa un utente che perde la password non
ha altra strada.

Verifica anche che la coda si sia svuotata:

```bash
docker compose … exec -T db psql -U compliance -d compliance -tA \
  -c "select stato, count(*) from outbox group by stato;"
```

**Atteso**: `inviata | N`. Se c'è `attesa` da più di mezz'ora, il relay non risponde.

---

## 10 · Consegna

- [ ] `CONSEGNA-CLIENTE.md` compilato, su **canale sicuro**: contiene le credenziali
- [ ] Riga aggiunta a `deploy/fleet.txt`
- [ ] DPA ex art. 28 firmato, con la **telemetria dichiarata**: gli errori vanno a una
      macchina nostra che raccoglie da titolari diversi, e questo è un trattamento ulteriore
      da scrivere, non da dare per coperto
- [ ] Guasti nuovi aggiunti a `GUASTI.md`

---

## Dismissione

**In quest'ordine, e il primo passo è il primo per una ragione:**

```bash
./deploy/dns-hostinger.sh togli verdi legisboard.it   # PER PRIMO
docker compose … down -v
hcloud server delete compliance-verdi
./deploy/monitor-del.sh verdi
```

Il record DNS si toglie **prima** di spegnere il server: un record che punta a un indirizzo
non più nostro è un **subdomain takeover**, cioè il nome del nostro prodotto che serve
contenuto di qualcun altro.

I backup restano fino alla scadenza della retention concordata **nel contratto**, poi si
potano dalla macchina di controllo con la chiave piena.

---

## Disciplina del disco — vale per chi costruisce, non per chi installa

Se stai **sviluppando** e non installando, [`GUASTI.md` P-01](GUASTI.md) vale anche per te:
una costruzione per lotto di correzioni, `docker builder prune -af` a fine sessione, uno
stack alla volta, `df -h` prima di avviare. Su questa macchina il disco è arrivato al 100% in
un giorno per otto ricostruzioni di un'immagine da 1,86 GB.
