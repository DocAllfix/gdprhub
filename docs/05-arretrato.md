# Arretrato — cosa manca, perché, e chi lo decide

Elenco unico di tutto ciò che il piano iniziale prevedeva e non è stato costruito, più ciò che
è emerso strada facendo. Verificato sul codice il 2026-08-04, non ricostruito a memoria.

Ordinato per **cosa blocca la consegna a un cliente pagante**, non per fase.

Stato di partenza: F1-F16 chiuse, cancello visivo 90/90, prova dei registri in produzione
27/27, CI verde. Dettagli in [`04-stato-fasi.md`](04-stato-fasi.md).

---

## Aggiornamento del 2026-09-19 — lavoro sulla forma

**Chiuse, e verificate eseguendo:** §1.1 (la schermata del secondo fattore esiste, con tre
difetti corretti — vedi sotto), §1.2 (gli inviti hanno un'interfaccia; la pagina dell'invito è
rifatta come gemella di `/accedi`). Next aggiornato a **16.3.5**: due CVE critici chiusi.

**⚠️ Il «90/90» qui sopra non verificava niente**, e va letto con questo in mente. Il cancello
apriva le pagine su `127.0.0.1`; in sviluppo Next 16 blocca quell'origine e React non si
idratava mai, quindi ogni clic cadeva su HTML senza gestori e passava. Corretto — il cancello
ora pretende come primo controllo che la pagina sia interattiva. Dettagli in `DESIGN.md`
§Verifica. **Da registrare in `deploy/GUASTI.md`**, che per la sessione della forma è fuori
perimetro.

### Nuove voci emerse, in ordine di peso

**Il cambio cliente non esiste — decisione del committente.** Il codice lo dichiara due volte
il comando più usato del prodotto — `components/ricerca/palette.tsx` («il secondo comando più
usato dopo il cambio cliente») e `app/varianti/barra/page.tsx` («venti volte al giorno») — e non
c'è. Dentro `/azienda/<id>` la barra laterale non attiva nessuna voce e il nome del cliente è un
collegamento grigio da 12px; per cambiarlo si passa dalla palette ⌘K, che nessun elemento
visibile annuncia, o si risale al portafoglio. È progettazione di prodotto, non vestizione: se
si fa, si fa con il metodo di `04-stato-fasi.md` §F5d — alternative costruite e guardate.

**La build di produzione ha bisogno della rete verso `fonts.googleapis.com`.** `next/font/google`
scarica i caratteri in fase di build e poi li serve da sé, quindi la CSP resta rispettata a
runtime — ma una build su una macchina di rilascio senza accesso a Google fallisce. Sei delle
sette pagine che ne dipendono sono i prototipi sotto `/varianti`: rimuoverle (§5) riduce il
problema a `app/layout.tsx`, e passare a `next/font/local` lo elimina.

**Il QR del secondo fattore continua a mancare.** Oggi il segreto si presenta in base32 a gruppi
di quattro, più un collegamento `otpauth://` che da telefono apre l'app: funziona, ma non si
scansiona. La strada a costo zero sul bundle è un'azione di server che restituisce l'SVG; è una
decisione sulle dipendenze.

### Lavoro sulla forma — chiuso, con due voci decise in senso contrario al piano

| Cosa | Esito |
| --- | --- |
| **Aggiornamento ottimistico sul cambio di stato**, con ricevuta | **Fatto.** La riga cambia prima della risposta del server, si blocca solo lei, le altre restano azionabili. E un difetto trovato strada facendo: **l'esito di `cambiaStato` era ignorato** — un rifiuto del server faceva tornare la riga al valore vecchio senza una parola. Ora si legge e compare. |
| **Ordinamento** | **Fatto sullo scadenzario** (azienda, priorità, scadenza; nell'indirizzo). **Non sull'assessment**, di proposito: lì le righe sono raggruppate per categoria, e ordinare per colonna romperebbe il raggruppamento che organizza la pagina. Se serve, va progettato — non aggiunto. |
| **Filtri del portafoglio nell'indirizzo** | **Fatto**, filtro e ordinamento. |
| `.cresce` sulle barre | **Fatto**, e corretto: animava `flex-basis`, cioè la geometria che DESIGN.md vieta di animare. Ora anima `transform`. |
| `.tocca` sulle schede del cruscotto | **Deciso di no.** Le tre schede sono le parti di UNA lastra; `.tocca` solleva ciò che tocca con ombra e anello, e sollevarne una la staccherebbe dalla superficie — il contrario di «un fatto in tre parti». L'effetto fatto a mano, senza ombra, è quello giusto per una parte di lastra. |
| `Tooltip` al posto di `title=` | **Deciso di no per la conversione di massa.** Sono undici, quasi tutti su elementi che hanno già un nome accessibile; `stato.tsx` sta in ogni riga di ogni tabella e diventerebbe un componente client in sessantaquattro celle. **Chiuso invece l'unico buco vero**: il trattino «nessuna scadenza» portava il significato solo nel `title`, che i lettori di schermo non annunciano in modo affidabile. |

---

## 1. Bloccano la consegna a un cliente vero

### 1.1 Attivazione del secondo fattore — **manca la schermata**

Il plugin `twoFactor` di Better Auth è configurato e la schermata di accesso **sa già
verificare un codice TOTP** (`apps/web/src/app/accedi/modulo.tsx`, riga 67). Ma non esiste
nessuna pagina per **accenderlo**: non c'è il codice QR, non c'è la conferma, non ci sono i
codici di recupero. Nessuno può attivarlo.

Il piano lo dava per «forzato al primo accesso». Il committente ha tolto il cambio password
forzato (2026-08-03), ma non ha detto niente sul secondo fattore: la lacuna è mia, non una
sua scelta.

**Perché blocca**: uno strumento che tiene i dati dei clienti di uno studio legale deve poter
offrire il secondo fattore. Non offrirlo è una domanda a cui non si vuole rispondere in fase
di vendita.

### 1.2 Inviti — **manca l'interfaccia**

I ruoli funzionano (titolare, consulente, sola lettura) e sono verificati lato server.
`invitationExpiresIn` è configurato in Better Auth. Ma non esiste l'azione «invita un
collega»: ogni utenza va creata da riga di comando sulla VPS.

**Perché blocca**: uno studio con quattro persone non può chiamarci ogni volta che assume.

### 1.3 F17 — l'installazione su una macchina vera

Tutti gli artefatti esistono e sono verificabili (`deploy/`), ma **il cancello della fase non
è stato attraversato**:

- [ ] istanza installata **da zero su una VPS reale**
- [ ] giro completo fino al **PDF** — è l'unica parte che dipende da Chromium, quindi l'unica
      che può funzionare in sviluppo e fallire su una macchina nuova
- [ ] `intestazioni-sicurezza.sh` verde **online**
- [ ] backup eseguito e **ripristino provato su macchina vuota**

Già verificato: `docker compose config` accetta lo stack, il contesto di build è di 11,9 MB
misurati, `check-segreti.sh` è verde, la costruzione dell'immagine arriva a compilare
l'applicazione dentro il contenitore (interrotta lì per liberare la macchina).

**Serve**: una VPS e un dominio.

---

## 2. Decisioni del committente

### 2.1 Il dataset 231 della vetrina

Dei 65 adempimenti 231 dell'azienda dimostrativa **nessuno risulta completato**: 56 «da fare»,
9 «in corso». Non è un difetto del calcolo — è il dato del prototipo consegnato dal
committente, dove la conformità era **1 su 65, il 2%**.

Finora si notava poco. La mappa dei reati presupposto lo rende un **muro rosso**: otto famiglie
scoperte su otto. Chi apre la vetrina non vede il prodotto, vede un allarme.

Non è stato cambiato d'iniziativa per due ragioni: i test golden del motore verificano proprio
la fedeltà a quei numeri, e **quali** attività un'azienda con un modello adottato avrebbe
plausibilmente svolto è contenuto di consulenza, non un dettaglio implementativo. Inventarlo
sarebbe il difetto che questo progetto contesta ai tre prototipi.

**Serve dal committente**: venti o trenta codici 231 da dichiarare completati (es. «M01, M03,
M07…»). La strada tecnica è già aperta — `d231-demo.json` conserva `statoPrototipo` accanto a
`stato` apposta per divergere in modo tracciabile. La divergenza va annotata in
`politica-scoring.md`.

### 2.2 Nome e dominio

`compliancedesk.it` è **libero** ed è la raccomandazione. Il `.eu` è occupato ma non serve: un
solo `.it` copre presentazione e istanze (`verdi.compliancedesk.it`).

Liberi su **entrambi** i TLD: `compliancedossier`, `complianceledger`.

La verifica WHOIS **non prenota**: un dominio libero oggi può non esserlo domani. Nel frattempo
il nome vive in `src/lib/brand.ts` e cambiarlo costa un file.

### 2.3 Le altre tre, dal piano iniziale

|                            |                                                                                                                                                                                                                                                 |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Chi possiede il server** | VPS nostre nel canone o macchina del cliente. Cambia DPA, ripristino e chi paga l'infrastruttura                                                                                                                                                |
| **Valore della quota 231** | Lo determina il consulente in relazione, o una tabella predefinita? La 231 è la più difendibile delle tre metodologie perché il calcolo per quote è scritto nella norma, ma il valore della quota dipende dalle condizioni economiche dell'ente |
| **Licenza**                | Solo contratto, o file con scadenza e banner?                                                                                                                                                                                                   |
| **Blocchi demo (F18)**     | Predisposti (`instance_config.mode`, helper no-op). Si attivano **solo su conferma esplicita**                                                                                                                                                  |

---

## 3. Profondità di dominio non costruita (F13-F16)

### 3.1 Verbali dell'OdV come atto proprio — **la più seria delle quattro**

L'Organismo di Vigilanza si riunisce e **verbalizza**. Quei verbali sono il primo documento che
un pubblico ministero chiede: dimostrano che l'organismo si è riunito, cosa ha esaminato, cosa
ha contestato.

Oggi il verbale è **un campo di testo** dentro il registro dei flussi («Verbale OdV n. 3»).
Manca come atto proprio: numerato, con data, presenti, ordine del giorno, e soprattutto
**immutabile una volta chiuso** — il meccanismo esiste già per le relazioni pubblicate
(trigger `report_immutabile`), e si riuserebbe.

### 3.2 DUVRI e cantieri

Il DUVRI è oggi **un adempimento con una scadenza** nel catalogo 81/08. Non è un registro con
le imprese coinvolte, le lavorazioni interferenti e i costi della sicurezza non soggetti a
ribasso. Per uno studio che segue appalti è la differenza fra un promemoria e uno strumento.

### 3.3 Notifiche sulle scadenze

**Non c'è posta elettronica da nessuna parte nel sistema**: nessun `nodemailer`, nessun
`resend`, nessuna configurazione SMTP. Nessun promemoria di scadenza, nessuna notifica di
violazione aperta, nessun recupero password self-service.

Il riferimento WhistleBlower ha SMTP nel compose e ne fa un punto della consegna («senza
`ADMIN_EMAIL` il primo admin non ha recupero password self-service»). Qui manca del tutto, e
tocca anche 1.2: un invito senza posta non si può mandare.

### 3.4 Import dai tre prototipi

Chi ha già i dati nei tre HTML deve reinserirli a mano.

---

## 4. Extra del piano non costruiti

Erano marcati «extra» nelle rispettive fasi. Nessuno blocca niente.

| Fase | Cosa                                                                                                                                                                   |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F7   | **Vista per articolo di norma** — gli adempimenti raggruppati per «art. 30», «art. 32», invece che per categoria                                                       |
| F12  | **XLSX e DOCX** — oggi la relazione esce solo in PDF. Chi vuole i numeri in Excel o il testo in Word non può                                                           |
| F12  | **Editor del testo** (Tiptap, sanificato lato server) — le sezioni sono generate dai dati e non si possono correggere prima di pubblicare                              |
| F12  | **Confronto fra versioni** — due relazioni della stessa azienda a sei mesi di distanza, senza un «cosa è cambiato»                                                     |
| F12  | **Attestazione con marca temporale** — oggi la relazione porta la propria impronta SHA-256, che prova che _non è stata alterata_; non prova _quando_ con valore legale |
| F12  | **Modalità presentazione** — la relazione proiettata in riunione                                                                                                       |

---

## 5. Pulizia

- Rimuovere le pagine `/varianti`: servivano a far scegliere la forma al committente, e la
  scelta è fatta (oliva 110, Geist, quieto, binario).

---

## Come leggere questo elenco

Il prodotto **fa il suo mestiere per intero**: un consulente entra, censisce un'azienda, attiva
i tre decreti, lavora gli adempimenti, tiene undici registri con i loro termini di legge,
allega evidenze verificate, genera una relazione che si congela e ne scarica il PDF.

Le due cose che chiuderei **prima** di consegnare a un cliente pagante sono §1.1 e §1.2. Tutto
il resto è ampliamento, non mancanza — con l'eccezione di §3.1, che è l'unica lacuna di dominio
che un OdV noterebbe subito.
