# Runbook — installare, aggiornare, salvare, ripristinare un'istanza

Un cliente, una VPS, un dominio, un database. Due studi non condividono niente: né il
processo, né il database, né i volumi. È la ragione commerciale per cui il prodotto si vende
così, e la ragione tecnica per cui questo documento parla sempre di **un'** istanza.

---

## 1. Prima installazione

### 1.1 Prerequisiti

| Cosa                                                | Perché                                                                           |
| --------------------------------------------------- | -------------------------------------------------------------------------------- |
| VPS Debian 12 o Ubuntu 24.04, 2 vCPU / 4 GB / 40 GB | Chromium per i PDF vuole memoria; sotto i 2 GB la resa fallisce sotto carico     |
| Docker Engine ≥ 26 con Compose v2                   | `depends_on: service_completed_successfully` non esiste su Compose v1            |
| **Il DNS già puntato alla VPS**                     | Caddy chiede il certificato all'avvio: senza risoluzione il rilascio si ferma lì |
| Porte 80 e 443 aperte                               | La 80 non serve solo al reindirizzamento: è il canale della sfida ACME           |

**La 5432 resta chiusa.** Il database non espone porte: si raggiunge solo dalla rete interna
del compose. Una 5432 aperta su una VPS viene trovata da uno scanner nel giro di ore, e qui
dentro ci sono i dati dei clienti di uno studio legale.

### 1.2 Installazione

```bash
git clone <repository> /srv/compliance && cd /srv/compliance

cp deploy/.env.prod.example deploy/.env.prod
chmod 600 deploy/.env.prod

# I due segreti si GENERANO, non si scelgono.
openssl rand -hex 32     # → AUTH_SECRET
openssl rand -base64 24  # → POSTGRES_PASSWORD

$EDITOR deploy/.env.prod

docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env.prod up -d --build
```

L'ordine dell'avvio non è casuale e non va scavalcato: `db` diventa sano, `preparazione`
applica lo schema e crea il primo amministratore e **finisce**, e solo allora parte `app`.
Un server che risponde con uno schema a metà non dà errore subito — lo dà la prima volta che
qualcuno apre la pagina sbagliata, quando ormai ha scritto dati.

### 1.3 Verifica, prima di consegnare

```bash
curl -s https://<dominio>/api/health | jq
./deploy/intestazioni-sicurezza.sh https://<dominio>
```

`/api/health` **interroga il database**: se risponde `503 degradato`, l'istanza è in piedi ma
non può servire. Una verifica che dicesse solo «il processo è vivo» direbbe la cosa che si
sapeva già — se il processo fosse morto, la richiesta non arriverebbe.

Poi, a mano, il giro che conta: accesso → creazione di un'azienda → attivazione dei tre
moduli → una voce di registro → generazione e pubblicazione di una relazione → **scaricamento
del PDF**. Il PDF è l'unica cosa che dipende da Chromium, ed è quindi l'unica che può
funzionare in locale e non su una macchina nuova.

---

## 2. Aggiornamento

```bash
cd /srv/compliance && git pull
docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env.prod up -d --build
```

Le migrazioni girano **due volte**, ed è voluto: nel servizio `preparazione` alla prima
installazione, e a ogni avvio di `app`. Il migratore tiene la propria tabella di controllo e
salta ciò che ha già fatto, quindi il costo è una query — mentre il caso che si copre è
l'aggiornamento fatto senza ricordarsi un comando a parte.

**Prima di aggiornare, un backup.** Sempre. Una migrazione che rimuove una colonna è
irreversibile, e `git revert` non riporta indietro i dati.

---

## 3. Backup

```bash
BACKUP_PASSPHRASE_FILE=/root/.compliance-backup ./deploy/backup.sh
```

Da mettere in cron:

```cron
0 3 * * *  cd /srv/compliance && BACKUP_PASSPHRASE_FILE=/root/.compliance-backup \
           ./deploy/backup.sh >> /var/log/compliance-backup.log 2>&1
```

Salva tre cose, e ognuna serve:

1. **il dump del database** — aziende, assessment, registri, relazioni, registro degli eventi;
2. **il volume dell'archivio** — le evidenze. Senza, il database conserva l'impronta SHA-256
   di file che non esistono più e ogni scaricamento fallisce: peggio di un archivio vuoto,
   perché il sistema continua a dichiarare che il documento c'è;
3. **`.env.prod`** — senza la password del database, il dump non si ripristina.

Tutto cifrato con GPG. Un backup in chiaro è un secondo trattamento non censito degli stessi
dati, e in un prodotto che vende conformità sarebbe difficile da spiegare a un ispettore.

**La passphrase non sta sulla stessa macchina del backup.** Se la VPS si perde con dentro
passphrase e archivi, non si è fatto un backup: si è fatta una copia.

---

## 4. Prova di ripristino

```bash
BACKUP_PASSPHRASE_FILE=/root/.compliance-backup ./deploy/restore-prova.sh
```

**Almeno una volta al mese.** Un backup mai ripristinato non è un backup: è una cartella di
file cifrati che nessuno ha mai aperto. Il giorno in cui serve si scopre che la passphrase
era un'altra, o che il volume salvato era vuoto perché il nome era sbagliato.

Lo script ripristina in un PostgreSQL effimero e **conta le righe**. È il punto che lo
distingue da un controllo di forma: un dump di un database vuoto si ripristina benissimo.

---

## 5. Ripristino vero, su macchina vuota

```bash
# 1. Installa Docker, clona il repository, ricrea deploy/.env.prod
gpg --batch --decrypt --passphrase-file /root/.compliance-backup \
    /var/backups/compliance/<data>/env.prod.gpg > deploy/.env.prod
chmod 600 deploy/.env.prod

# 2. Alza solo il database, VUOTO
docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env.prod up -d db

# 3. Rimetti dentro il dump
source <(grep -E '^POSTGRES_(USER|DB)=' deploy/.env.prod)
gpg --batch --decrypt --passphrase-file /root/.compliance-backup \
    /var/backups/compliance/<data>/database.dump.gpg \
  | docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env.prod exec -T db \
    pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner --clean --if-exists

# 4. Rimetti dentro le evidenze
gpg --batch --decrypt --passphrase-file /root/.compliance-backup \
    /var/backups/compliance/<data>/archivio.tar.gz.gpg \
  | docker run --rm -i -v "$(basename "$PWD")_archivio":/dati alpine tar -xzf - -C /dati

# 5. Alza tutto
docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env.prod up -d --build
```

**Il passo 4 non è opzionale.** Ripristinare solo il database dà un'istanza che si apre, mostra
tutto e fallisce ogni scaricamento di evidenza: il caso peggiore, perché sembra funzionare.

Dopo il ripristino, verificare **lo scaricamento di un'evidenza**: l'impronta si ricontrolla a
ogni scaricamento, e un archivio ripristinato male viene rifiutato dall'applicazione stessa —
che è il comportamento giusto, e il modo più rapido di accorgersene.

---

## 6. Diagnosi

| Sintomo                      | Dove guardare                                                                                                                                                                                                   |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| «Invalid origin» all'accesso | `APP_URL` non coincide con il dominio reale. È il difetto che ha bloccato il committente al primo accesso sulla vetrina                                                                                         |
| Il PDF risponde 500          | Chromium: `docker compose exec app /usr/bin/chromium --version`                                                                                                                                                 |
| Pagine senza fogli di stile  | `.next/static` non copiato nell'immagine: sembra un guasto di rendering, è un guasto di build                                                                                                                   |
| `/api/health` dà 503         | `docker compose logs db`. L'applicazione è viva, il database no                                                                                                                                                 |
| Certificato non emesso       | DNS non ancora propagato, o porta 80 chiusa: la sfida ACME passa da lì                                                                                                                                          |
| L'istanza compare su Google  | Manca `X-Robots-Tag` — verificare con `intestazioni-sicurezza.sh`. **Non** usare `Disallow` in robots.txt: impedirebbe al bot di leggere il divieto di indicizzare, e l'indirizzo nudo resterebbe indicizzabile |

---

## 7. Stato di questo runbook

Le procedure sono scritte e gli script esistono, ma **l'installazione su una VPS reale non è
ancora stata eseguita**, e finché non lo è questo documento resta una previsione informata,
non una procedura provata. Il cancello della fase lo dice: istanza installata da zero su una
macchina vera, flusso completo fino al PDF, `intestazioni-sicurezza.sh` verde, backup eseguito
e **ripristino provato su macchina vuota**. Nessuna di queste quattro cose va data per buona
sulla base del fatto che il file esiste.
