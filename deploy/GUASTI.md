# Registro dei guasti

Ogni voce è un guasto **incontrato davvero**, non previsto. Chi installa o mantiene un'istanza
legge questo file quando qualcosa non torna, e ci scrive dentro quando trova qualcosa di nuovo.

**La regola che lo tiene vivo**: un guasto incontrato durante un deploy reale diventa una riga
qui **prima** che l'istanza sia dichiarata consegnata. Non a fine giornata, non «quando c'è
tempo».

Formato: `SINTOMO` cosa si vede · `CAUSA` perché · `RIMEDIO` cosa fare · `VERIFICATO` quando.

> Perché questo file nasce **dopo** il primo collaudo e non prima: `RUNBOOK.md` esiste da mesi,
> è scritto bene, e non ha impedito nessuno dei dodici guasti qui sotto. Un runbook redatto
> prima di aver installato qualcosa descrive ciò che si crede che accada.

---

## Famiglia A — Ambienti condivisi scambiati per isolati

Su una macchina che ospita più progetti, **tutto ciò che non dichiara il proprio spazio dei
nomi ne condivide uno con gli altri**. Nessuno di questi casi dà errore quando collide:
sovrascrive, mescola o attribuisce male, in silenzio.

### A1 · Un `docker compose up` ricrea i container di un altro progetto

    SINTOMO    Un servizio di un altro progetto viene ricreato o reinizializzato senza che
               nessuno l'abbia chiesto. Nel proprio `docker compose ps` compaiono servizi
               che non si sono mai dichiarati.
    CAUSA      Compose ricava il nome del progetto dalla CARTELLA che contiene il file.
               Tutti i prodotti della casa hanno una cartella `deploy/`: per Docker sono lo
               stesso progetto e condividono lo spazio dei nomi dei container.
    RIMEDIO    `name: <prodotto>-<ambiente>` come prima riga del compose.
               Già applicato: `name: legisboard-prod`.
    CONTA      Vale anche per il BACKUP: `backup.sh` ricava il nome del volume delle
               evidenze da `COMPOSE_PROJECT_NAME`. Un nome dedotto male non fa fallire il
               backup, gli fa salvare una cartella vuota, e lo si scopre il giorno del
               ripristino.
    VERIFICATO 2026-09-18. È successo: il database di sviluppo di un altro progetto è stato
               reinizializzato.

### A2 · I log dei test contengono risultati di un altro progetto

    SINTOMO    Fra i test falliti compaiono nomi di file che non esistono nel proprio
               progetto. Il file di log contiene due riepiloghi diversi.
    CAUSA      In Git Bash su Windows `/tmp` NON è privato del processo: è una cartella
               comune. Due progetti che scrivono lo stesso nome scrivono lo stesso file, e
               l'ultimo vince.
    RIMEDIO    Scrivere i file temporanei nella cartella di sessione, mai in `/tmp`.
    CONTROLLO  Quando un esito sorprende, prima di interpretarlo:
                 ls -l <file>                      l'orario è della propria esecuzione?
                 grep -c <proprio-identificativo>  se è 0, non è proprio
    VERIFICATO 2026-09-18. Una sessione ha quasi archiviato una regressione vera come
               inesistente, usando come prova fallimenti di un altro progetto.

### A3 · Un'immagine Docker attribuita al progetto sbagliato

    SINTOMO    Un'immagine con un nome che somiglia a più progetti, che nessuno rivendica.
    CAUSA      Il nome lo sceglie chi costruisce e non ha alcun legame con l'origine. La
               data restringe, non decide.
    RIMEDIO    Guardare DENTRO:
                 docker history <img> --no-trunc
                 docker image inspect <img> --format '{{.Config.Env}}'
               Le COPY nominano file che esistono in un repository solo.
    VERIFICATO 2026-09-18. Due immagini attribuite per due volte a progetti altrui per
               somiglianza di nome; risolte in un comando.

### A4 · Porte dell'host già occupate da un altro progetto

    SINTOMO    Un servizio non parte, o ne risponde uno inatteso sulla porta attesa.
    CAUSA      5432, 1025, 3000 occupate da altri stack sulla stessa macchina.
    RIMEDIO    In sviluppo pubblicare su porte diverse, o non pubblicarle affatto. In
               produzione il problema non esiste: una VPS, uno stack.
    VERIFICATO 2026-09-18.

---

## Famiglia B — L'artefatto esiste, il comportamento non è stato osservato

Sono i guasti che **non si vedono leggendo il codice**. Il codice era scritto bene e i commenti
spiegavano scelte corrette: erano invisibili perché nessuno aveva mai eseguito quei passi.

### B1 · Il contenitore muore a ogni avvio, senza spiegazione

    SINTOMO    `app` in crash-loop. Lo script di onboarding fallisce al collaudo dopo
               quattro minuti dicendo solo che la salute non risponde.
    CAUSA      Un valore fuori dall'enum dichiarato in `lib/env.ts` (`STORAGE_DRIVER=disk`
               contro blob|fs). La validazione fallisce all'IMPORTAZIONE del modulo, prima
               che il server risponda a qualunque cosa.
    RIMEDIO    `docker compose logs app | head -30`: il messaggio c'è ed è esplicito.
    SFUGGE     Perché l'immagine non era mai stata AVVIATA fino in fondo. Build verde,
               compose validato, typecheck verde.
    VERIFICATO 2026-09-18, primo avvio dell'immagine.

### B2 · Le evidenze spariscono a ogni aggiornamento, e il backup ne salva zero

    SINTOMO    Dopo un `up -d --build` i documenti caricati non ci sono più. Il database
               continua a elencarli e ogni scaricamento fallisce. La prova di ripristino
               stampa «archivio leggibile: 0 voci» e PASSA.
    CAUSA      Il Dockerfile impostava `STORAGE_PATH`, che non è letto da nessuno: la
               variabile vera è `ARCHIVIO_RADICE`. Senza, l'archivio ripiega su
               `process.cwd()/.archivio`, cioè il layer effimero, non il volume montato.
    RIMEDIO    docker compose exec app sh -c 'echo $ARCHIVIO_RADICE; mount | grep /dati'
    PROVA      Caricare un file, `up -d --force-recreate app`, riscaricarlo.
    VERIFICATO 2026-09-18.

### B3 · L'applicazione non è mai partita: manca `drizzle-orm` nell'immagine

    SINTOMO    ERR_MODULE_NOT_FOUND su `drizzle-orm` nei log di `app`, in loop. `set -e`
               in `avvio.sh` uccide il contenitore a ogni tentativo.
    CAUSA      Next IMPACCHETTA le dipendenze dentro `.next/server` invece di copiarle in
               `node_modules`. Uno script separato che le importa come pacchetti — il
               migratore — non le trova.
    RIMEDIO    Installarle in una cartella propria accanto allo script, con le versioni
               lette da `apps/web/package.json`. NON basta `NODE_PATH`: la risoluzione ESM
               non lo guarda, un modulo si cerca dalla cartella del file che lo importa.
    CONTROLLO  docker run --rm --entrypoint sh <img> -c 'ls /app/apps/web/node_modules'
    VERIFICATO 2026-09-18.

### B4 · `CADDY_TLS=internal` non ha mai funzionato

    SINTOMO    `proxy` in crash-loop: «unrecognized directive: internal».
    CAUSA      La variabile viene sostituita com'è. `internal` da solo non è una direttiva:
               serve `tls internal`.
    RIMEDIO    La variabile deve contenere la direttiva INTERA.
    CONTA      È il ripiego documentato per collaudare senza DNS pubblico, cioè proprio la
               situazione della prova di ripristino su macchina vuota.
    VERIFICATO 2026-09-18.

### B5 · Il controllo delle intestazioni dice «nessuna risposta» su un'istanza sana

    SINTOMO    Lo script esce con 1 e stampa «nessuna risposta», ma l'istanza risponde.
    CAUSA      Con `tls internal` il certificato è locale e curl rifiuta la catena. Sembra
               un'istanza spenta ed è un'istanza sana.
    RIMEDIO    TLS_INTERNO=1 ./deploy/intestazioni-sicurezza.sh https://…
               MAI come predefinito: contro un'istanza vera un certificato non verificabile
               è esso stesso un guasto da segnalare.
    VERIFICATO 2026-09-18.

### B6 · L'immagine del cliente contiene i sorgenti e i documenti di sviluppo

    SINTOMO    Nessuno: l'istanza funziona. Si vede solo elencando l'immagine.
    CAUSA      `.next/standalone` si porta dietro `src/`, gli script di collaudo e
               `.archivio`. Il Dockerfile copia standalone nell'immagine finale.
    RIMEDIO    `.archivio` e `.dati` nel `.dockerignore` — il `.gitignore` NON basta, il
               contesto di build è il filesystem — più una `RUN rm -rf` nello stadio finale.
    NON        `outputFileTracingExcludes` in `next.config.ts`: provato, NON funziona. La
    FUNZIONA   copia della cartella dell'applicazione non passa dalla tracciatura.
    CONTROLLO  docker run --rm --entrypoint sh <img> -c 'ls -a /app/apps/web'
    VERIFICATO 2026-09-18.

### B7 · Il file d'esempio non è nel repository

    SINTOMO    Su una VPS appena clonata `deploy/.env.prod.example` non esiste, e la
               checklist di go-live dice di copiarlo.
    CAUSA      La regola `.env.*` del `.gitignore` lo cattura, e le negazioni coprono solo
               `.env.example` esatto.
    RIMEDIO    `!deploy/.env.prod.example` DOPO le altre negazioni: vince l'ultima.
    CONTROLLO  `git check-ignore -v` NON basta: segnala anche le negazioni ed esce con 0.
               La prova autorevole è `git ls-files --others --exclude-standard`.
    VERIFICATO 2026-09-18, modificando il file e guardando `git status`.

### B8 · Una variabile che il compose passa e il codice non legge

    SINTOMO    Un valore configurato non ha effetto. Nessun errore.
    CAUSA      Zod scarta le chiavi sconosciute IN SILENZIO: non fallisce, restituisce il
               valore predefinito. Casi trovati: `NOME_STUDIO` contro `STUDIO_NOME`,
               `STORAGE_PATH` che non esiste, `ISTANZA_MODO` assente dallo schema.
    RIMEDIO    Lo schema Zod come unica fonte dei nomi; il template e il blocco environment
               del compose GENERATI da lì, con la CI che boccia il disallineamento.
    CONTROLLO  docker compose exec app sh -c 'echo "[$NOME_VARIABILE]"'
    VERIFICATO 2026-09-18. Ogni istanza si sarebbe chiamata «Studio».

### B9 · La mail firma con il nome sbagliato

    SINTOMO    Le mail escono firmate «Studio» mentre l'organizzazione nel database ha il
               suo nome corretto.
    CAUSA      DUE errori sovrapposti. Primo: il compose passava la variabile al servizio
               `preparazione` e non ad `app`. Secondo, più importante: era la FONTE
               sbagliata — dopo l'installazione il nome lo cambia il cliente dalle
               impostazioni, e finisce in `instance_config.brand_nome`.
    RIMEDIO    Leggere il nome dal database, non dall'ambiente.
    LEZIONE    Una variabile d'ambiente resta ferma al giorno dell'installazione.
    VERIFICATO 2026-09-18, guardando l'oggetto di una mail in coda.

### B10 · Un limitatore configurato che non limita

    SINTOMO    Nessuno: la configurazione sembra corretta.
    CAUSA      `rateLimit.storage: "database"` senza la tabella `rate_limit` nello schema.
               Sarebbe fallito a runtime in silenzio.
    RIMEDIO    Tabella più migrazione.
    PROVA      Undici tentativi di accesso falliti di fila: dal decimo in poi deve arrivare
               429. Poi `select * from rate_limit`.
    VERIFICATO 2026-09-18.

### B11 · `instrumentation.ts` nella radice non viene mai caricato

    SINTOMO    Nessuno. La coda della posta non si svuota e nei log non compare una riga
               del drenatore. Gli errori del server non finiscono da nessuna parte.
    CAUSA      Next cerca `instrumentation.ts` accanto alle cartelle `app/` e `pages/`: in
               un progetto con la cartella `src/` il posto giusto è `src/instrumentation.ts`.
               Nella radice dell'applicazione non dà errore — non viene caricato, e basta.
    RIMEDIO    Spostarlo in `src/`.
    CONTROLLO  Far scrivere una riga a `register()` e cercarla nei log all'avvio. Se non
               c'è, il file non è dove Next lo cerca.
    FAMIGLIA   È lo stesso difetto del `.dockerignore` messo in `deploy/`: un file nel posto
               sbagliato è silenzioso. Non sbaglia, non esiste.
    VERIFICATO 2026-09-18, perché la posta restava in coda con il relay raggiungibile.

### B12 · Un cast che nasconde un modello di ruoli diverso

    SINTOMO    L'invito risponde `ROLE_NOT_FOUND: consulente`. Il typecheck era verde.
    CAUSA      Better Auth conosce i ruoli SUOI — owner, admin, member — e non quelli
               dell'applicazione, che sono admin, consulente, viewer. La chiamata era
               scritta con un cast `as "admin" | "member"`: il compilatore taceva e
               l'invito sarebbe fallito sempre, per due ruoli su tre.
    RIMEDIO    Scrivere la riga di invito direttamente, tenendo UN SOLO modello di ruoli.
               Non si perde niente: anche l'accettazione è già nostra, e la tabella è la
               stessa.
    LEZIONE    Un cast che mette a tacere un tipo sta quasi sempre nascondendo una
               differenza vera. Il typecheck verde non è una prova che due sistemi parlino
               la stessa lingua.
    VERIFICATO 2026-09-18, al primo invito inviato davvero.

---

## Famiglia C — Misure prese nel momento sbagliato

### C1 · Il prune di Docker non libera il disco di Windows

    SINTOMO    `docker builder prune -af` dichiara di aver liberato gigabyte, ma `df`
               sull'host mostra lo stesso spazio libero di prima.
    CAUSA      Docker Desktop su WSL2 tiene tutto in un disco virtuale SPARSO. Il prune
               libera dentro il file; il file restituisce lo spazio all'host solo quando
               WSL si ferma.
    RIMEDIO    1. prune   2. wsl --shutdown   3. rimisurare con df
               Se resta molta aria, compattare con diskpart (Docker fermo, da ammin.).
    NON FARE   Concludere che il prune sia inutile e passare a cancellare cose che servono:
               è il passo successivo naturale, ed è quello che fa danni.
    LEZIONE    `docker system df` misura il contenuto, non l'occupazione. E anche una
               verifica fatta bene può essere fatta TROPPO PRESTO.
    VERIFICATO 2026-09-18, misurato da due sessioni in due momenti: 12 GB invariati subito
               dopo, 18,6 GB dopo lo spegnimento di WSL.

### C2 · Il nonce della CSP non corrisponde mai

    SINTOMO    Si confronta il nonce dell'intestazione con quello nell'HTML e non
               combaciano mai: sembra una CSP rotta.
    CAUSA      Intestazione e corpo presi con DUE RICHIESTE diverse. Il nonce è per
               richiesta: sono due valori diversi perché sono due richieste diverse.
    RIMEDIO    Una richiesta sola: curl -D intestazioni.txt -o corpo.html <url>
    CONTROLLO  La verifica utile non è «combaciano» ma «quanti script NON hanno il nonce»:
               deve essere zero.
    VERIFICATO 2026-09-18.

### C3 · Un test rosso a caso sotto carico

    SINTOMO    Un test fallisce con «Test timed out in 5000ms», e al giro dopo passa in
               1500 ms.
    CAUSA      Il limite predefinito misurava l'importazione a freddo di una libreria
               pesante, non l'asserzione. Con più sessioni che compilano sulla stessa
               macchina, si supera.
    RIMEDIO    Limite esplicito e largo dove il tempo NON è l'asserzione.
    CONTA      Un test che diventa rosso per il carico insegna a non guardare il rosso.
               Questo progetto ha già un precedente: «la CI era rossa da almeno tre spinte
               e io riferivo verde».
    VERIFICATO 2026-09-18, fallito due volte su tre sotto carico.

---

## Famiglia D — Il sistema operativo sotto i comandi

### D1 · Un percorso assoluto in un comando Docker viene riscritto

    SINTOMO    `docker run --entrypoint /usr/bin/chromium <img>` fallisce dicendo che
               `C:/Program Files/Git/usr/bin/chromium` non esiste. Sembra che il binario
               manchi dall'immagine.
    CAUSA      Git Bash su Windows converte i percorsi POSIX in percorsi Windows.
    RIMEDIO    MSYS_NO_PATHCONV=1 docker run …
    VERIFICATO 2026-09-18.

### D2 · L'endpoint di recupero password risponde 404

    SINTOMO    POST su `/api/auth/forget-password` risponde 404, e la funzione sembra non
               configurata.
    CAUSA      In Better Auth 1.6 la rotta è `/api/auth/request-password-reset`. Il nome
               vecchio compare ancora nel pacchetto ma non è instradato.
    RIMEDIO    Usare il nome nuovo. Per trovarlo senza indovinare:
                 grep -rhoE '(forget-password|request-password-reset)' <pacchetto>/dist/
    VERIFICATO 2026-09-18.

### D3 · Un apostrofo dentro `${var:?messaggio}` rompe lo script

    SINTOMO    `bash -n` segnala «unexpected token» o «unexpected EOF while looking for
               matching "» su una riga che non ha niente di sbagliato, spesso a settanta
               righe di distanza dal punto vero.
    CAUSA      Dentro `${var:?messaggio}` bash tratta l'apostrofo come una QUOTA APERTA,
               anche se tutto sta fra virgolette doppie. Un messaggio in italiano ne è
               pieno: «manca l'indirizzo», «serve l'identificativo».
    RIMEDIO    Riformulare senza apostrofo — «serve indirizzo della VPS» — oppure scrivere
               il controllo per esteso con un `if`.
    CONTROLLO  bash -n <script>   dopo ogni modifica, prima di committare.
               Per trovare il punto vero: `head -n N <script> | bash -n` a bisezione.
    STORIA     Il progetto lo aveva GIÀ annotato in `onboard-cliente.sh`, con la stessa
               spiegazione. Ci sono cascato lo stesso, in due script nuovi, lo stesso
               giorno in cui ho letto quel commento. Una nota dentro un file la legge chi
               apre quel file: per questo sta anche qui.
    VERIFICATO 2026-09-18.

### B13 · Il file d'esempio documenta il contrario di ciò che lo script fa

    SINTOMO    Nessuno, finché qualcuno non segue la documentazione: configura il relay
               sbagliato e le mail partono da un dominio senza SPF, quindi finiscono nello
               spam — e sembra un difetto dell'applicazione.
    CAUSA      Nel progetto di riferimento `.env.prod.example` dice `SMTP_HOST=smtp.cliente.it`
               (il relay DEL CLIENTE), mentre `onboard-client.sh` manda da
               `no-reply@<dominio-brand>` (il NOSTRO). In produzione ha vinto il secondo.
               Non è «non documentato»: è documentato al contrario.
    RIMEDIO    Dichiarare le due modalità e quando si sceglie l'una o l'altra, invece di
               lasciare che vinca quella che sta nel codice.
    LEZIONE    Una documentazione che contraddice il codice è peggio di una assente: chi
               legge la segue. È la stessa famiglia della dichiarazione falsa sul secondo
               fattore, stampata al cliente a ogni installazione.
    VERIFICATO 2026-09-19, trovato da sistemacommercialisti leggendo il riferimento.

---

## Procedure — regole, non incidenti

### P-01 · Disciplina del disco fra più progetti sulla stessa macchina

Concordata fra le tre sessioni il 2026-09-18, dopo che il disco è arrivato al **100% su
238 GB** e Docker ha cominciato a fallire a caso.

    CAUSA        Due cause sovrapposte, e vale la pena tenerle distinte.
      immediata  Otto ricostruzioni in un giorno di un'immagine da 1,86 GB, una per ogni
                 correzione. Ogni giro lascia strati che il disco virtuale non restituisce.
      strutturale `~/.docker/daemon.json` autorizzava BuildKit a tenere fino a 20 GB di
                 cache (`defaultKeepStorage`), ed era arrivato a 14,5. Il garbage collector
                 non ha sbagliato: ha fatto ciò per cui era configurato, su una macchina che
                 non ha quel margine.

    REGOLE
      1  Una costruzione per LOTTO di correzioni, non per correzione.
      2  `docker builder prune -af` a fine sessione di build. Sempre, non quando serve.
      3  Uno stack acceso alla volta per progetto, e mai produzione e sviluppo insieme.
         Al blocco c'erano quattordici container di tre progetti.
      4  `df -h` prima di avviare uno stack: sotto i 15 GB si libera prima.
      5  `defaultKeepStorage: "4GB"` nel daemon. È l'UNICA che protegge anche quando le
         altre quattro vengono dimenticate: a fermarsi è una build, non la macchina.
      6  Mai `docker volume prune`. Si cancella per nome, mai per esclusione.

    ASIMMETRIA A costruire meno spesso dev'essere chi costruisce PESANTE, non chi costruisce
               leggero a rinunciare a verificare. Le immagini dei tre prodotti pesano 321 MB,
               1,86 GB (Chromium per i PDF) e ~4 GB previsti (stack Supabase).

    LEZIONE    Le regole di comportamento reggono finché qualcuno se le ricorda; un tetto
               regge da solo. È la stessa forma dei difetti di oggi: una configurazione che
               fa in silenzio più di quanto il nome suggerisca.

    APPLICATA  2026-09-18. Tetto portato da 20GB a 4GB, copia in `daemon.json.bak`.
               Richiede un riavvio di Docker per avere effetto.

---

## Guasti già noti prima di questa fase

Restano dal registro di `docs/04-stato-fasi.md`, e valgono ancora:

| Sintomo                                     | Causa                                                                   |
| ------------------------------------------- | ----------------------------------------------------------------------- |
| Certificato non emesso                      | DNS non propagato, o porta 80 chiusa: la sfida ACME passa da lì         |
| «Invalid origin» all'accesso                | `DOMINIO` in `.env.prod` non coincide con l'indirizzo reale             |
| PDF risponde 500                            | rotta non dichiarata in `outputFileTracingIncludes`, o Chromium assente |
| Salute 503                                  | l'applicazione è viva, il database no                                   |
| Pagine senza fogli di stile                 | `.next/static` non copiato: sembra un guasto di resa, è di build        |
| `pg_isready` dice «pronto» durante `initdb` | il server temporaneo accetta e poi si riavvia: usare `SELECT 1`         |
| `.dockerignore` ignorato                    | era in `deploy/`, Docker lo cerca nella radice del CONTESTO             |
