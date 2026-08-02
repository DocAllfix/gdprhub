# Addendum — modello di distribuzione per istanza

Rettifica dei §3, §4 e §6 di [01-analisi-prototipo.md](01-analisi-prototipo.md) dopo la direttiva del
committente (2026-08-02): **vendita per istanza, deploy su server dedicato dietro Caddy, nessun pagamento
online**. Riferimenti: `C:\Users\user\WhistleBlower` (modello di deploy) e
`C:\Users\user\sistemacommercialisti` (modello applicativo).

L'analisi del prototipo (§1) e i moduli di prodotto (§2) restano validi senza modifiche.

---

## 1. Cosa cade

| Componente                                   | Motivo                                                                                    |
| -------------------------------------------- | ----------------------------------------------------------------------------------------- |
| **Stripe, subscription, webhook, proration** | Non c'è pagamento online. La licenza è contrattuale                                       |
| **Registrazione pubblica**                   | Nessuno si iscrive. Gli utenti li crea l'admin dell'istanza                               |
| **Layer entitlement / capability / paywall** | Chi ha l'istanza ha comprato tutto                                                        |
| **Supabase** (DB, Storage, pooler)           | Servizio cloud gestito: incompatibile con "il dato resta sul server del cliente"          |
| **Resend**                                   | Sostituito da SMTP del cliente                                                            |
| **`@sparticuz/chromium` + puppeteer-core**   | Serviva per il serverless di Vercel. Sul nostro server si installa Chromium nell'immagine |
| **Benchmark aggregato cross-cliente**        | Non esiste un database centrale. Vedi §7                                                  |
| **Macchina RLS + GUC + ruolo `app_rls`**     | Vedi §4: con un'istanza per studio non serve                                              |

## 2. Cosa cambia il modello per il prodotto

Tre conseguenze non ovvie, tutte a nostro favore tranne una.

1. **La data residency diventa l'argomento di vendita più forte che abbiamo.** Vendere a un DPO uno
   strumento di compliance ospitato su cloud altrui è una contraddizione che il compratore nota subito.
   _"I fascicoli dei tuoi assistiti non lasciano mai il tuo server"_ chiude la discussione.
2. **Il DPA si semplifica.** Se l'istanza è sul server del cliente, noi non siamo responsabili del
   trattamento per i dati: lo siamo solo per gli accessi di supporto. Va comunque disciplinato per
   iscritto (accesso SSH, log, durata), ma il perimetro è minuscolo rispetto a un SaaS.
3. **Il benchmark di settore muore definitivamente.** Senza database centrale non c'è aggregato. Le
   opzioni residue sono: (a) toglierlo, (b) spedire con il catalogo un dataset curato e citabile,
   aggiornato a ogni release. Vedi §7.

## 3. Architettura di deploy

Ricalcata su WhistleBlower, che è già in produzione su 5 istanze.

```
   https://studio.gdprhub.it            https://studio-portale.gdprhub.it
   (backoffice consulenti)              (portale azienda cliente, opzionale)
              │                                      │
              ▼                                      ▼
        ┌──────────────── Caddy (TLS automatico) ──────────────┐
        │   security headers · CSP · noindex · IP allow-list   │
        │   reverse_proxy → app:3000                           │
        └──────────────────────────────────────────────────────┘
                                 │
                        app (Next.js standalone, Node)
                          ├── Chromium per il PDF
                          └── /data/evidence  (volume, allegati)
                                 │
                        db (PostgreSQL 16, volume isolato)
```

**Stack rivisto**

| Livello                   | Scelta                                                                  | Nota rispetto al SaaS                        |
| ------------------------- | ----------------------------------------------------------------------- | -------------------------------------------- |
| Runtime                   | Next.js 16 `output: "standalone"` in Docker                             | invariato come framework                     |
| DB                        | **PostgreSQL 16 in container**, volume dedicato                         | non più Supabase                             |
| ORM                       | Drizzle, `migrate` automatico all'avvio del container                   | come `alembic upgrade head` di WhistleBlower |
| Auth                      | Better Auth + `organization` + **`twoFactor`**, **signup disabilitato** | vedi §5                                      |
| File                      | volume locale `/data/evidence`, mai servito da Caddy                    | non più Supabase Storage                     |
| Email                     | **SMTP del cliente** via nodemailer (`SMTP_*` in env)                   | non più Resend                               |
| PDF                       | **Playwright + Chromium nell'immagine**                                 | niente più dual-path serverless              |
| Proxy/TLS                 | **Caddy**, Let's Encrypt automatico                                     | nuovo                                        |
| Errori                    | Sentry **opt-in, spento di default**                                    | vedi §8                                      |
| UI, grafici, editor, test | Tailwind v4 + shadcn, Recharts, Tiptap, Vitest + Playwright             | invariati                                    |

**Domini**: teniamo noi il dominio-brand con DNS wildcard, ogni cliente riceve i suoi sottodomini
gratuiti e non configura nulla — esattamente il modello `whistlevault.it`. Chi vuole il proprio dominio
punta un CNAME e Caddy emette il certificato da solo.

## 4. Il punto delicato: cosa resta del multi-tenant

**Domanda:** se ogni studio ha la sua istanza, `organization_id` e le policy RLS servono ancora?

Le tre opzioni, con il costo reale:

|                                                     | Cosa comporta                                                                                                                                                                        | Costo                   | Rischio                                                                                                 |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------- | ------------------------------------------------------------------------------------------------------- |
| **A. Single-tenant puro**                           | Niente `organization_id`. Le entità di primo livello sono le aziende clienti                                                                                                         | Minimo                  | Se un giorno vuoi ospitare 5 studi piccoli su una VPS condivisa, è una migrazione dati, non una feature |
| **B. Colonna sì, macchina RLS no** _(raccomandata)_ | `organization_id` presente ovunque, scoping applicativo con `requireStudio()` dalla sessione, mai da input client. Assert all'avvio: l'istanza contiene esattamente una organization | Una colonna e un indice | Nessuno oggi; domani l'RLS si aggiunge in modo additivo                                                 |
| **C. RLS completa come EvalisDeck**                 | Ruolo `app_rls`, GUC, `withTenant`, matrice di policy, test dedicati                                                                                                                 | Alto                    | Complessità pagata per una difesa contro uno scenario che il deploy già esclude fisicamente             |

**Raccomando B**, ed è anche la scelta che i tuoi progetti hanno già preso: `sistemacommercialisti`
protegge i dati con `requireStudio()` senza RLS, e WhistleBlower ha tenuto il codice "multi-tenant-ready"
pur deployando per istanza. La direttiva 2 del CLAUDE.md ("niente astrazioni premature") esclude la C:
l'isolamento più forte in questo modello è **fisico**, un container e un volume per cliente, e una
seconda barriera crittografica dentro il DB non aggiunge difesa reale contro nessun attaccante credibile.

**Conseguenze sullo schema del §4 del report principale:**

- restano tutte le tabelle di dominio, con `organization_id` come colonna
- spariscono `subscription`, `stripe_event`
- `platform_config` diventa **`instance_config`**: branding dello studio (logo, colori, intestazione dei
  report), politiche di retention, SMTP, versione del catalogo attiva
- si aggiunge `instance_meta`: slug del cliente, data di attivazione, versione applicativa, versione
  del catalogo controlli — serve al supporto e al runbook

## 5. Autenticazione e primo accesso

Il flusso di WhistleBlower, che è già collaudato:

1. `onboard-client.sh <slug>` genera `.env.prod` con segreti forti (`openssl rand`), stampa i record DNS
   e le credenziali admin iniziali.
2. Al primo avvio il container applica le migrazioni, semina il catalogo dei 42 controlli e crea
   l'**admin iniziale** da `ADMIN_USERNAME` / `ADMIN_PASSWORD`.
3. Al primo login: **cambio password forzato + attivazione 2FA obbligatoria**.
4. L'admin invita i colleghi. `emailAndPassword.disableSignUp: true`: nessuno si registra da solo.

Ruoli in istanza: `admin` (utenti, branding, configurazione), `consulente` (opera sui clienti),
`viewer` (sola lettura, per il collega junior o il referente aziendale).

Il plugin `organization` di Better Auth lo teniamo anche con una sola organization: regala inviti,
membership e ruoli senza scrivere codice, ed è ciò che rende reversibile la scelta B.

## 6. Gestione della flotta — riuso diretto

Gli script di `WhistleBlower/deploy/` sono **agnostici allo stack** (ssh + docker compose + curl):
si riusano quasi senza modifiche.

| Script                                                                                    | Cosa fa                                                                 | Adattamento                                            |
| ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------ |
| `onboard-client.sh`                                                                       | Genera env, DNS, avvia, smoke-test su `/api/health`                     | Cambiare le variabili, aggiungere il seed del catalogo |
| `update-fleet.sh`                                                                         | Aggiorna **tutte** le istanze in sequenza, si ferma al primo fallimento | Vedi nota sotto                                        |
| `backup.sh` / `restore-test.sh`                                                           | Backup cifrato off-site di DB + allegati + env, test di ripristino      | Aggiungere il volume `/data/evidence`                  |
| `security-headers-check.sh`                                                               | Gate post-update: HSTS e CSP non devono regredire                       | Invariato                                              |
| `setup-vps.sh`                                                                            | Preparazione della macchina                                             | Invariato                                              |
| `fleet.txt`                                                                               | Inventario delle istanze, mai committato                                | Invariato                                              |
| `RUNBOOK.md`, `DR-RUNBOOK.md`, `GO-LIVE-PRIMO-CLIENTE.md`, `CONSEGNA-CLIENTE-TEMPLATE.md` | Procedure operative                                                     | Da riadattare al dominio GDPR                          |

**Una modifica che consiglio rispetto a WhistleBlower.** Lì l'update fa `git pull` + `docker compose
up --build` **sulla VPS del cliente**: buildare Next.js su una VPS piccola è lento e va facilmente in
OOM. Meglio **buildare l'immagine una volta sola in CI**, pubblicarla su un registry privato (GHCR) e
sulle istanze fare solo `docker compose pull && up -d`. Vantaggi: update in secondi, nessuna risorsa di
build sul server del cliente, nessun sorgente sulla macchina del cliente, e la stessa immagine
identica su tutta la flotta. Costo: un registry privato e un token di lettura per istanza.

## 7. Le tre voci del report che vanno rifondate

Il modello per istanza chiude definitivamente due dei problemi bloccanti del prototipo, ma cambia le
soluzioni disponibili.

- **B1a — Stima sanzionatoria.** Invariata la raccomandazione: indice di priorità sempre visibile,
  stima economica su EDPB 04/2022 solo se il consulente inserisce fatturato e parametri, con fonte a
  fianco. I coefficienti stanno in `sanction_parameter`, versionati e aggiornabili via release.
- **B1b — Benchmark.** Senza database centrale l'aggregato non esiste. Propongo di **toglierlo dalla V1**
  e valutare in seguito un dataset curato da noi, citabile, spedito col catalogo. Un'alternativa
  tecnicamente possibile (telemetria anonima aggregata in opt-in verso un nostro endpoint) la sconsiglio:
  contraddice l'argomento di vendita del §2.1 e in un prodotto GDPR è un autogol.
- **B1c — Trend storico.** Costruito da `control_history` reale, quindi vuoto nelle prime settimane.
  Serve un empty state onesto.

## 8. Telemetria e supporto: due decisioni di sostanza

- **Sentry.** Un'istanza che manda stack trace a un servizio esterno fa uscire dati dal server del
  cliente. In un prodotto GDPR va **spento di default**, attivabile per istanza con consenso scritto, e
  dichiarato tra i sub-responsabili. In alternativa: log locali strutturati con rotazione, che il cliente
  ci invia solo su richiesta.
- **Accesso di supporto.** Serve una regola scritta prima del primo go-live: chi ha la chiave SSH, se
  l'accesso è loggato, se esiste un ruolo di impersonazione applicativa (raccomando **di no**: su un
  archivio di evidenze di compliance, un admin che può entrare nei dati del cliente è un problema da
  spiegare in ogni trattativa).

## 9. Cosa resta invariato dal report principale

L'analisi del prototipo (§1), i moduli di prodotto Tier 1/2/3 (§2), il motore di calcolo come funzioni
pure testate, il catalogo dei 42 controlli come contenuto versionato, lo schema di dominio (§4), la
direzione di design "Corporate Tech" (§5), il metodo `impeccable` con `PRODUCT.md` + `DESIGN.md`.

Un'aggiunta resa possibile dal nuovo modello: **branding per istanza**. Logo e colori dello studio nel
backoffice e nelle intestazioni delle relazioni, come `tenant.settings` di WhistleBlower. Per uno studio
legale che consegna una perizia al CdA di un cliente, la relazione con la propria carta intestata vale
più di molte funzionalità.

---

## 10. Istanza vetrina: tour di onboarding e blocchi demo

Direttiva del committente (2026-08-02): la prima istanza che mettiamo online fa da vetrina.
**Il tour entra dall'inizio. I blocchi demo si implementano solo su conferma esplicita.**

### 10.1 Due cose diverse, da non confondere

|              | Tour di onboarding                                  | Blocchi demo                                   |
| ------------ | --------------------------------------------------- | ---------------------------------------------- |
| Dove         | **Tutte** le istanze, vetrina e clienti             | Solo l'istanza vetrina                         |
| A cosa serve | Far capire il prodotto a chi lo apre la prima volta | Impedire che la vetrina sostituisca l'acquisto |
| Quando       | **Da subito, fase 1**                               | Quando lo confermi tu                          |
| Natura       | UI                                                  | **Server-side**, mai client-side               |

Il tour non è una funzione della demo: è onboarding di prodotto. Un DPO che riceve la sua istanza il
lunedì mattina deve capire da solo dove si crea il primo cliente, senza chiamarci.

### 10.2 Tour — impianto (da fase 1)

- **driver.js**, come in FormazioneEvalis ed EvalisDeck. Rispetta `prefers-reduced-motion`: con la
  preferenza attiva il tour si auto-disattiva.
- **Attributi `data-tour="…"` su ogni elemento indicabile, scritti insieme al componente.**
  È il punto che costa caro se lo rimandiamo: aggiungerli a posteriori significa ripassare su tutta la UI.
  Va nel `DESIGN.md` come regola vincolante, esattamente come in EvalisDeck.
- **Stato in `user_onboarding`** (`pending | completed | skipped`, passo corrente, passi completati),
  non in localStorage: il tour deve riprendere da dove era anche su un altro browser.
- **Tour per contesto, non un tour unico**: primo accesso (shell, portafoglio, dove si crea un cliente),
  primo assessment (i 42 controlli, evidenze, stati), prima relazione (generazione, versioni, PDF).
  Richiamabili sempre da un menu "Guida", non solo al primo login.
- **Dati su cui girare**: l'istanza vetrina parte con un'azienda di esempio pre-compilata e realistica
  (l'equivalente dei dati del prototipo). Nelle istanze cliente il seed demo è opzionale e cancellabile,
  con flag `is_demo` così non inquina conteggi e statistiche.

### 10.3 Blocchi demo — progettati ora, attivati su tua conferma

Rispetto al SaaS il problema si semplifica molto: non serve il layer entitlement per utente, perché
**la modalità è una proprietà dell'istanza**. Un solo campo in `instance_config`:

```
instance_config.mode = "full" | "demo"      (default: "full")
```

Un unico helper server-side (`assertNotDemo(capability)`) invocato dalle server action e dalle route che
producono valore. Con `mode = "full"` è un no-op: costo nullo per le istanze vendute.

**Cosa proporrei di bloccare in vetrina** — da validare quando mi darai il via:

| Capability                   | Comportamento in demo                                        | Perché                                                      |
| ---------------------------- | ------------------------------------------------------------ | ----------------------------------------------------------- |
| `export_pdf` / `export_docx` | Consentito ma **filigranato** e con copertina "DIMOSTRATIVO" | Il documento è il prodotto: si deve vedere, non portare via |
| `publish_report`             | Bloccato (versioni congelate non generabili)                 | È la funzione che si compra                                 |
| `create_client`              | Massimo 1 azienda oltre a quella di esempio                  | Fa provare il flusso, non gestire un portafoglio            |
| `upload_evidence`            | Limite di numero e dimensione                                | Evita che la vetrina diventi l'archivio di qualcuno         |
| `invite_user`                | Bloccato                                                     | La demo è personale                                         |
| Retention                    | Reset periodico dei dati inseriti dai visitatori             | Igiene e privacy della vetrina                              |

**Tre regole non negoziabili sui blocchi**

1. **Server-side, sempre.** Il controllo sta nella server action o nella route, mai in un `disabled` nel
   client. Un pulsante grigio si aggira con due righe in console.
2. **Il blocco spiega e vende.** Mai un errore secco: stato chiaro, cosa si sblocca, come procedere.
   È l'unico momento in cui la vetrina fa il suo mestiere commerciale.
3. **Verificabile con un test.** Un e2e che prova a chiamare le azioni bloccate in modalità demo e si
   aspetta il rifiuto: è ciò che rende il gating "non aggirabile" un fatto e non una dichiarazione.

**Cosa faccio adesso**: nella pianificazione modulare il campo `mode`, l'helper no-op e la lista delle
capability entrano come _predisposizione_, senza alcun blocco attivo. Il giorno che confermi, attivare la
demo è cambiare una riga di configurazione dell'istanza vetrina, non riaprire il codice.

### 10.4 Conseguenze sull'istanza vetrina

È l'unica istanza pubblica, quindi va trattata diversamente dalle altre nel `Caddyfile`: le istanze
cliente portano `X-Robots-Tag: noindex, nofollow` (come in WhistleBlower), **la vetrina no**, perché deve
essere trovabile. Va nell'inventario `fleet.txt` come le altre e riceve gli stessi aggiornamenti.

Da decidere: la vetrina è ad accesso libero (chiunque entra con credenziali pubblicate) o su richiesta
(form → creiamo l'utente)? La seconda qualifica i contatti e riduce l'abuso, ed è quella che consiglio.

---

## 11. Decisioni aggiornate che servono dal committente

Sostituiscono i punti 1, 4, 5, 6 del §6 del report principale.

1. **Chi è il compratore dell'istanza**: lo studio/DPO che gestisce un portafoglio (assunzione mia,
   coerente col prototipo), oppure la singola azienda che gestisce la propria compliance? Cambia
   radicalmente la schermata iniziale.
2. **Un'istanza per cliente, o un'istanza condivisa fra più studi piccoli?** Se la seconda è nei piani,
   passiamo all'opzione C del §4 fin da subito, e va deciso ora.
3. **Portale azienda in sola lettura in V1** (secondo hostname, come WhistleBlower) o rimandato?
4. **Aggiornamenti: immagini da registry (raccomandato) o `git pull` sulla VPS** come WhistleBlower?
5. **Licenza**: nessun controllo tecnico e solo contratto, come oggi, oppure file di licenza con scadenza
   e banner di cortesia?
6. **Chi possiede il server**: VPS nostre rivendute nel canone, o macchina del cliente su cui installiamo?
   Cambia il DPA, il DR e chi paga l'infrastruttura.
7. **Sentry**: spento di default, come raccomando?
8. **Perimetro V1** (invariato come proposta): portafoglio + assessment 42 controlli + evidenze +
   relazione versionata + PDF + branding. RoPA, breach e DPIA in V1.1.
9. **Nome prodotto e dominio-brand** (serve subito: regge il wildcard DNS di tutta la flotta).
10. **Vetrina ad accesso libero o su richiesta?** Consiglio su richiesta.
11. **Lista delle capability da bloccare in demo** (§10.3): la validi quando mi darai il via ai blocchi.
