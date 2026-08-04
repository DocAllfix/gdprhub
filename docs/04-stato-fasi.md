# Stato delle fasi

Aggiornato al 2026-08-03. Istanza vetrina: **https://gdprhub.vercel.app**

Ogni fase è chiusa solo con output reale riportato: typecheck, lint, test, cancello visivo
eseguito, e — dove esiste un rischio d'ambiente — verifica **contro la produzione** e non
soltanto contro il portatile.

## Chiuse

| Fase    | Contenuto                                                                    | Verifica                                                                     |
| ------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| **F0**  | Monorepo, adattatori DB/storage/PDF, spike PDF su Vercel                     | il PDF su Vercel falliva: `bin` di `@sparticuz` fuori dal bundle             |
| **F1**  | Motore dei tre domini, `core/ gdpr/ d231/ d81/ suite/`                       | 184 test, copertura di ramo 96,55%, zero dipendenze verificate in CI         |
| **F2**  | 171 adempimenti estratti dai prototipi, 16 collegamenti, 8 famiglie di reato | `pnpm seed:check` in CI: il catalogo non si modifica a mano                  |
| **F3**  | Schema Drizzle, tenancy, append-only da trigger, seed su Neon EU             | UPDATE su `audit_log` respinto dal database, non dall'applicazione           |
| **F4**  | Better Auth, guard dalla sessione, istanza inizializzata                     | la registrazione risponde 403; l'appartenenza si riverifica a ogni richiesta |
| **F5a** | `PRODUCT.md`, brief di forma confermato dal committente                      | —                                                                            |
| **F5b** | `DESIGN.md`, token, shadcn/ui + TanStack Table, `/design`                    | cancello verde in due temi, 21 elementi cliccati per vista                   |
| **F5c** | Quattro prototipi di documento con font incorporati                          | PDF generati **su Vercel**; nomi dei font letti dentro il file               |
| **F6**  | Shell, accesso, primo accesso, portafoglio, moduli, impostazioni             | percorso completo con DevTools + cancello sulle pagine protette              |
| **F5d** | **Rifacimento della forma**: oliva hue 110, Geist, schema «quieto»           | scelto dal committente su anteprime navigabili, non su descrizioni           |

## F5d — come si è arrivati alla forma

Vale la pena scriverlo, perché il metodo era sbagliato e cambiarlo è ciò che ha sbloccato.

Per quattro giri ho descritto modifiche ai token e il committente ha risposto «fa cagare»,
che è un giudizio corretto e inutilizzabile. Il metodo giusto si è rivelato un altro:
**costruire le alternative e farle guardare**, sullo stesso contenuto reale, in entrambi i
temi, su tutte le schermate insieme — perché una direzione può reggere sul cruscotto e
crollare sulla tabella da sessantaquattro righe, e accorgersene alla terza schermata
significa averne due da riscrivere.

Le anteprime vivono sotto `/varianti` e sono ancora online. La sequenza delle scelte:

| Passo | Alternative mostrate                              | Scelta                   |
| ----- | ------------------------------------------------- | ------------------------ |
| 1     | Terminale · Schede · Editoriale                   | **Schede**               |
| 2     | Perizia (Plex+serif) · Console (Geist) · Gazzetta | **Console → Geist**      |
| 3     | Filetto · Piano · Fascia                          | **Piano**                |
| 4     | Quieto · Steso · Inciso                           | **Quieto**               |
| 5     | Notte 288 · Carta · Terra 78                      | tutte scartate           |
| 6     | Grafite · Oliva 110 · Melanzana 307               | **Oliva**                |
| 7     | Binario · Contesto · Testata (barra laterale)     | **Contesto** _(assunto)_ |

Il passo 7 è l'unico dedotto e non dichiarato: la risposta è stata «mi piace più oliva
barra», che corregge il colore rispetto alla mia raccomandazione e non nomina la barra. Ho
applicato la disposizione che avevo raccomandato — colonna di contesto — e l'ho dichiarato.
**Se era un'altra, si cambia in un file.**

Il ragionamento su ciascuna scelta, con i costi, sta in `DESIGN.md`.

## Difetti trovati dalla verifica, non dalla lettura del codice

Sono elencati perché ognuno è passato per una build verde.

| Fase | Difetto                                                                            | Dove si sarebbe visto                                                    |
| ---- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| F0   | Chromium fuori dal bundle serverless                                               | primo PDF generato dal cliente                                           |
| F5b  | Tema scuro identico al chiaro, cancello verde                                      | subito, ma nessuno guardava                                              |
| F5b  | `light-dark()` distrutto da Lightning CSS: fondo trasparente                       | in produzione                                                            |
| F5c  | Pagine riempite al 62% per una calibrazione a occhio                               | mai: non è un errore, è sciatteria                                       |
| F5c  | Chiave glob `/prototipi/[documento]` che non corrisponde a nulla                   | 500 in produzione, 200 in locale                                         |
| F6   | `APP_URL` diverso dall'origine reale: 403 «Invalid origin»                         | all'accesso del committente sulla vetrina                                |
| F6   | Il modulo «nuova azienda» si azzera se la validazione fallisce                     | alla prima partita IVA sbagliata                                         |
| F6   | Un'azienda appena creata si presentava «in regola» in verde                        | mai, ed è il problema: era una bugia rassicurante                        |
| F5d  | `<title>` dentro un `<svg>`: React 19 lo solleva nella testa e rompe l'idratazione | in produzione, come errore #418 minificato                               |
| F5d  | `overflow: hidden` su un antenato annulla `position: sticky`                       | la barra spariva scorrendo, e io avevo scritto che restava               |
| F5d  | Il cancello chiedeva `/azienda/<id>/d81/d81`: nove 404                             | il difetto era **nel cancello**, causato dal nuovo collegamento in barra |
| F5d  | Cancello bocciato tre volte per 401, non per il limitatore                         | un giro di collaudo aveva cambiato le password in banca dati             |
| F13  | **La CI era rossa da almeno tre spinte e io riferivo «verde»**                     | mai: guardavo typecheck, lint e test senza guardare la CI                |
| F13  | Il passo Build della CI non poteva riuscire: compilare pretendeva un database      | nascosto dietro il controllo di formattazione, che falliva prima         |
| F13  | La rotta di esportazione era l'unica senza `force-dynamic`                         | in locale mai: le variabili c'erano e la build passava                   |
| F13  | Il palette muoveva una selezione annunciata a nessuno (nessun `role`)              | mai da chi vede l'evidenziazione                                         |
| F13  | La prova leggeva «la prima riga» di un elenco ordinato per data                    | al secondo giro: il primo aveva il registro vuoto                        |

## Dove gira il calcolo

`vercel.json` fissa le funzioni a **`fra1` (Francoforte)**. Non è un dettaglio di
prestazioni: il database Neon è in `eu-central-1`, e con le funzioni nella regione
predefinita di Vercel — `iad1`, Washington — **ogni query attraversava l'Atlantico**. Il
portafoglio impiegava 2,8 secondi a produrre nove kilobyte di HTML: non rendering, latenza
moltiplicata per una decina di viaggi.

E prima ancora è una questione di sostanza: in un prodotto che vende conformità al GDPR il
**calcolo** deve stare in Unione Europea, non solo l'archivio. Avere scelto Neon in Europa e
lasciato le funzioni negli Stati Uniti era un errore che nessun cliente avrebbe accettato.

## F13-F16 — i registri di dominio

Fin qui il prodotto censiva **adempimenti**: cose che si fanno a scadenza. I registri sono
un'altra natura — raccolgono **fatti** che accadono quando accadono. Una violazione dei dati
non ha una periodicità: ha settantadue ore, e decorrono da quando se n'è saputo.

**Undici registri, una pagina sola.** Le definizioni stanno nel motore (`registri/tipi.ts`)
con quattro regole di termine — `ore`, `giorni`, `validita`, `anagrafica` — e la schermata si
costruisce da lì: campi, etichette, opzioni, note e norma. Undici schermate scritte a mano
sarebbero undici posti in cui il testo di una norma resta indietro rispetto al motore.

| Dominio | Registri                                                                                                                                                            |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GDPR    | violazioni (72h) · richieste degli interessati (30/90gg) · registro dei trattamenti · valutazioni d'impatto · responsabili del trattamento · trasferimenti extra UE |
| 231     | segnalazioni whistleblowing (7gg/3 mesi) · flussi informativi verso l'OdV                                                                                           |
| 81/08   | formazione erogata · sorveglianza sanitaria · verifiche periodiche delle attrezzature                                                                               |

**Le quattro decisioni che, sbagliate, producono un registro che sembra giusto e non lo è**,
ognuna con la propria prova:

- le **72 ore sono ore**, non tre giorni: una violazione saputa venerdì alle 18 scade lunedì
  alle 18, e arrotondare al giorno regalerebbe sei ore che non esistono;
- il termine decorre dalla **conoscenza**, non dal fatto: sono due date diverse e spesso
  distanti, e il campo non si precompila con «adesso» proprio per non farle coincidere per
  disattenzione;
- un termine **assolto non scade più**, e un ritardo **resta scritto**: sbiancarlo dopo il
  fatto sarebbe riscrivere il passato;
- una validità **non indicata non è «in regola»**: è un dato mancante, e lo dice.

**Chiudere un termine richiede di dire come.** Il server rifiuta un assolvimento senza esito:
in sede di verifica una spunta senza descrizione vale quanto una casella vuota.

**Il legame fra decreti.** Una violazione dei dati è anche un flusso informativo dovuto
all'Organismo di Vigilanza: il prototipo del committente lo annotava a margine, «Coordinamento
DPO-OdV 72h». L'avviso compare solo se **entrambi** i moduli sono attivi, e non apre niente da
sé — un atto che nessuno ha scritto, con una data che nessuno ha deciso, sarebbe magia.

**L'esportazione.** L'art. 30.3 chiede il registro «in forma scritta, anche in formato
elettronico»: ogni registro si scarica in CSV, con le colonne costruite dalla definizione.

### Verifica in produzione

`pnpm --filter web prova:registri https://gdprhub.vercel.app` — **26 verifiche, 0 difetti**:
i tre casi delle 72 ore, il rifiuto di una data futura, il rifiuto di un esito di due
caratteri, l'assolvimento tardivo che resta tardivo, una voce per ciascuno degli undici
registri, i numeri di protocollo tutti distinti, il CSV con le colonne dell'art. 30.1, la
rotta di esportazione che non aggira il guard, ⌘K che trova un registro e ci porta.

### La mappa dei reati presupposto

Il catalogo delle famiglie (artt. 24 → 25-quinquiesdecies), il calcolo della copertura e la
verifica d'integrità dei presìdi stavano **già** nel motore da fasi precedenti, con le proprie
prove, e il seed li scriveva nel database. Non li vedeva nessuno: mancava la schermata, cioè
l'unica parte che serviva a un OdV. Ora `/azienda/<id>/reati` mostra, per ogni famiglia, quanti
presìdi sono in ordine e quali no, con il collegamento all'adempimento scoperto.

La pagina **dichiara i propri limiti**: copre le famiglie che i tre cataloghi presidiano
davvero, non l'intero arco degli artt. 24 – 25-duodevicies. Fingere una copertura totale
sarebbe l'affermazione più costosa che questo strumento possa fare, perché è quella su cui un
ente si difende ai sensi dell'art. 6.

### Il dataset dimostrativo del 231 è vuoto, e adesso si vede

Sull'azienda della vetrina, dei 65 adempimenti 231 **nessuno risulta completato**: 56 «Da fare»
e 9 «In corso». Non è un difetto del calcolo — è il dataset del prototipo del committente,
riportato fedelmente: là la conformità era **1 su 65, il 2%**. Finora si notava poco; la mappa
dei reati lo rende un muro rosso, otto famiglie scoperte su otto.

È una **decisione del committente**, non nostra, e per questo non l'ho cambiata:

- il dataset è quello che ci ha consegnato, e i test golden del motore verificano proprio la
  fedeltà a quei numeri: cambiarlo significa rinunciare a quella verifica o riscriverla;
- il file `d231-demo.json` conserva `statoPrototipo` accanto a `stato` **apposta** per poter
  divergere in modo tracciabile, quindi la strada tecnica è già aperta;
- ma _quali_ attività una società con un modello adottato avrebbe plausibilmente svolto è
  contenuto di consulenza, non un dettaglio implementativo, e inventarlo sarebbe esattamente
  il difetto che questo progetto contesta ai tre prototipi.

**Raccomandazione**: per la vetrina serve un'azienda a maturità media, non una che ha appena
comprato il modello. Bastano venti o trenta codici 231 dichiarati completati con la loro ultima
esecuzione, scelti dal committente; la divergenza si annota in `politica-scoring.md`.

### Cosa non è entrato in F13-F16, e va detto

- **verbali dell'OdV** come documento proprio: oggi il verbale è un campo di testo sul flusso,
  non un atto con un numero e una firma;
- **DUVRI e cantieri** (F15): il DUVRI è un adempimento del catalogo 81/08, non un registro
  con le imprese e le interferenze;
- **notifiche** sulle scadenze ricorrenti (F16): nessuna posta, nessun promemoria;
- **import dai tre prototipi** (F16).

## F17 — confezionamento per istanza

Gli artefatti ci sono. **L'installazione su una VPS reale no**, e finché non c'è questa fase
non è chiusa: il cancello chiede istanza installata da zero su una macchina vera, flusso
completo fino al PDF, intestazioni verdi, backup eseguito e **ripristino provato su macchina
vuota**. Nessuna delle quattro va data per buona perché il file esiste.

| File                               | Cosa fa                                                                                                                                                |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `deploy/Dockerfile`                | tre stadi + `strumenti`. Gli strumenti di prima installazione hanno bisogno dei sorgenti e di `tsx`, e non devono pesare sull'immagine che gira sempre |
| `deploy/docker-compose.prod.yml`   | **validato da Docker**. Database senza porte esposte, `preparazione` che finisce prima che `app` parta, volumi separati                                |
| `deploy/Caddyfile`                 | `X-Robots-Tag: noindex` come intestazione, non `robots.txt`                                                                                            |
| `deploy/backup.sh`                 | dump + volume delle evidenze + `.env.prod`, cifrati GPG                                                                                                |
| `deploy/restore-prova.sh`          | ripristina in un PostgreSQL effimero e **conta le righe**                                                                                              |
| `deploy/intestazioni-sicurezza.sh` | verifica che le intestazioni arrivino davvero al browser                                                                                               |
| `deploy/check-segreti.sh`          | **verde**: nessun segreto tracciato da git                                                                                                             |
| `deploy/aggiorna-flotta.sh`        | una istanza alla volta, si ferma alla prima che non torna sana                                                                                         |
| `deploy/RUNBOOK.md`                | installazione, aggiornamento, backup, ripristino, diagnosi                                                                                             |

**Ciò che è stato verificato davvero**, e non solo scritto:

- `docker compose config` accetta il compose;
- il contesto di build è **11,9 MB**, misurato con un'immagine usa e getta che fa `du` del
  contesto. Era di centinaia di megabyte: il `.dockerignore` stava in `deploy/`, dove Docker
  non lo cerca. Un `.dockerignore` nel posto sbagliato non dà errore, viene ignorato;
- `check-segreti.sh` passa;
- la costruzione dell'immagine è arrivata a compilare l'applicazione **dentro il contenitore**
  («Compiled successfully in 3.6min») e si è fermata lì: l'ho interrotta io, perché su questa
  macchina competeva con il cancello visivo. Non è quindi una build portata a termine, e non
  va contata come tale;
- la **pigrizia del client del database**, introdotta per la CI, è ciò che rende possibile
  `docker build` senza un database: un'immagine si costruisce prima di sapere a quale
  database parlerà, e i segreti di un cliente non entrano in un contesto di build.

**Il perché di due scelte che sembrano ridondanti**:

- le migrazioni girano sia in `preparazione` sia a ogni avvio di `app`. Il caso coperto è
  l'aggiornamento fatto senza ricordarsi un comando a parte; il costo è una query;
- `/api/health` **interroga il database**. Rispondeva «ok» col database spento: Docker non
  avrebbe riavviato niente e un aggiornamento di flotta sarebbe proseguito sulle istanze
  successive credendo che la prima stesse bene.

## Prossime

- **F17, la parte che conta**: installazione da zero su una VPS reale, giro completo fino al
  PDF, `intestazioni-sicurezza.sh` verde, backup e **ripristino provato su macchina vuota**.
  Serve una macchina e un dominio.
- Le cinque voci di F13-F16 rimaste, se il committente le vuole prima del confezionamento.
- Rimuovere le pagine `/varianti`, che hanno esaurito il loro scopo.

## Questioni ancora aperte

1. **Nome e dominio**: `compliancedesk.it` è libero ed è la raccomandazione. Va registrato
   subito: la verifica non lo prenota.
2. **Chi possiede il server** nella vendita reale: cambia DPA, ripristino e chi paga.
3. **Valore della quota 231**: lo determina il consulente o una tabella predefinita?
4. **Licenza**: solo contratto, o file con scadenza e banner?
5. **Blocchi demo**: predisposti (`instance_config.mode`), da attivare solo su conferma.
