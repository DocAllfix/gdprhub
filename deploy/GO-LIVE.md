# Go-live — la sequenza per il primo cliente vero

Da eseguire **in ordine**. Tutto ciò che serve è già nel repository: qui c'è solo la
sequenza, e la sequenza è il punto. Un passo saltato in una lista di venti è un'istanza
consegnata senza backup, e non lo si scopre finché non serve.

Dettagli: [RUNBOOK.md](RUNBOOK.md). Struttura ripresa da
`WhistleBlower/deploy/GO-LIVE-PRIMO-CLIENTE.md`.

> **Già attivo da solo, nessuna azione richiesta**: verifica di salute che interroga il
> database (503 se il database è giù), `healthcheck` del servizio, TLS automatico,
> `X-Robots-Tag: noindex`, HSTS, nessun registro degli accessi, migrazioni applicate
> all'avvio, primo amministratore creato dal servizio `preparazione`.

---

## 0. Una tantum, prima del primo cliente

- [ ] **Dominio registrato** e pannello DNS accessibile.
      `compliancedesk.it` è libero; `compliancedossier` e `complianceledger` sono liberi su
      `.it` **e** `.eu`. La verifica non prenota: va registrato.
- [ ] Record **CAA** sul dominio: `0 issue "letsencrypt.org"`. Senza, qualunque altra CA può
      emettere un certificato per i vostri sottodomini.
- [ ] **Macchina di monitoraggio, separata dai clienti.** Se il monitoraggio gira sulla VPS
      del cliente, quando la VPS cade cade anche ciò che doveva avvisarvi.
- [ ] **Storage per i backup fuori sede, in UE** + `rclone` configurato. Un backup sulla
      stessa macchina non è un backup: è una copia.
- [ ] **Passphrase di backup** generata e salvata nel gestore di password aziendale, **non
      solo sulla VPS**.
- [ ] Registro delle istanze (`deploy/fleet.txt`) creato. **Non si committa.**

## 1. La VPS del cliente

- [ ] VPS **in UE**, 2 vCPU / 4 GB / 40 GB. Sotto i 4 GB la costruzione dell'immagine va in
      OOM: compila TypeScript e installa Chromium.
- [ ] Accesso **solo a chiave SSH**.
- [ ] `ssh root@<IP> 'bash -s' < deploy/setup-vps.sh` — docker, firewall, fail2ban, swap da
      4 GB, fuso orario italiano.
- [ ] `git clone <repository> /srv/compliance && cd /srv/compliance`

## 2. Istanza

- [ ] `ADMIN_EMAIL=<mail del referente> ./deploy/onboard-cliente.sh <slug>`
      → genera i segreti e stampa il record DNS da creare.
- [ ] Creare il record **A** sul pannello: `<slug>` → IP della VPS.
- [ ] **Attendere che il DNS risolva** (`dig +short <slug>.compliancedesk.it`). Caddy chiede
      il certificato all'avvio: senza risoluzione il rilascio si ferma lì.
- [ ] `./deploy/onboard-cliente.sh <slug> --avvia`
      → alza lo stack, verifica salute e intestazioni. Deve finire con **COMPLETATO**.

## 3. Backup — prima di dichiarare il go-live

- [ ] Passphrase sulla VPS: `install -m 600 /dev/stdin /root/.compliance-backup`
- [ ] **Primo backup subito**:
      `BACKUP_PASSPHRASE_FILE=/root/.compliance-backup RCLONE_REMOTE=<remote> ./deploy/backup.sh`
- [ ] **Prima prova di ripristino subito**:
      `BACKUP_PASSPHRASE_FILE=/root/.compliance-backup ./deploy/restore-prova.sh`
      → deve stampare il conteggio delle righe ripristinate.
- [ ] Cron: backup notturno + prova di ripristino mensile (esempi in fondo a `backup.sh`).
- [ ] Verificare che il backup fuori sede contenga **`env.prod.gpg`**: lì dentro c'è la
      password del database, e senza quella il dump non si ripristina.

## 4. Il giro a mano, che nessuno script sostituisce

- [ ] Accesso con le credenziali iniziali, cambio password
- [ ] Marchio dello studio
- [ ] Creazione di un'azienda, attivazione dei tre moduli
- [ ] Una voce di registro con il suo termine
- [ ] Generazione di una relazione, pubblicazione, **scaricamento del PDF**

**Il PDF è l'unica parte che dipende da Chromium**, ed è quindi l'unica che può funzionare in
sviluppo e fallire su una macchina nuova. Se un solo passo di questa lista va provato, è
questo.

## 5. Consegna

- [ ] Compilare [CONSEGNA-CLIENTE.md](CONSEGNA-CLIENTE.md) e consegnarlo su **canale sicuro**:
      contiene le credenziali iniziali.
- [ ] Aggiungere la riga in `deploy/fleet.txt`.
- [ ] Monitor sull'indirizzo dell'istanza, dalla macchina di monitoraggio.
- [ ] DPA ex art. 28 firmato.

---

## Se qualcosa va storto

|                              |                                                                  |
| ---------------------------- | ---------------------------------------------------------------- |
| Certificato non emesso       | DNS non propagato, o porta 80 chiusa: la sfida ACME passa da lì  |
| «Invalid origin» all'accesso | `DOMINIO` in `.env.prod` non coincide con l'indirizzo reale      |
| PDF risponde 500             | `docker compose exec app /usr/bin/chromium --version`            |
| Salute 503                   | l'applicazione è viva, il database no: `docker compose logs db`  |
| Pagine senza fogli di stile  | `.next/static` non copiato: sembra un guasto di resa, è di build |
