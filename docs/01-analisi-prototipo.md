# Analisi del prototipo "GDPR Compliance Hub v2" e piano strategico

Documento di fase 0. Nessun codice applicativo scritto. In attesa di validazione del committente.
Data: 2026-08-02.

---

## 0. Metodo

Il file `archivio/GDPR-Compliance-Hub-V2 (1).html` è un artifact React compilato: 291 KB su 256 righe,
con React 18 + lucide-react + Tailwind (build JIT) inlinati e minificati. Il codice applicativo vero
è ~112 KB, estratto e ri-formattato (3.692 righe leggibili) per l'analisi.

Le metriche indicate nel report sono state **ricalcolate eseguendo davvero le formule del prototipo sui
suoi dati di seed**, non stimate a occhio.

---

## 1. Analisi microscopica del prototipo

### 1.1 Anatomia tecnica

| Elemento            | Stato                                                                                            |
| ------------------- | ------------------------------------------------------------------------------------------------ |
| Architettura        | Single-file, un solo componente React (`Wi`) da ~2.400 righe                                     |
| Persistenza         | **Nessuna.** Zero `localStorage`, zero `fetch`, zero backend. Refresh = tutto perso              |
| Auth / multi-utente | Assenti                                                                                          |
| Cliente             | Uno solo, stringa in `useState` (`"Gruppo Industriale Verdi S.p.A."`)                            |
| Dati                | 42 controlli hardcoded in `v1()`                                                                 |
| Scadenze            | Calcolate a runtime come `oggi ± N giorni` → il demo non invecchia mai, ma i dati non sono reali |

### 1.2 Il modello dati — l'unico vero asset

42 controlli precaricati, ognuno con 9 campi:
`id, titolo, descrizione, articolo, ruolo, frequenza, scadenza, priorita, stato, rischio`

Distribuzione:

| Ruolo            | N.           | Copertura articoli                                                               |
| ---------------- | ------------ | -------------------------------------------------------------------------------- |
| **Titolare**     | 20 (T01–T20) | 5, 5.1.e, 6.1.f, 7, 12-22, 13-14, 24, 25, 28, 30.1, 32, 33-34, 35, 37, 39, 44-49 |
| **Responsabile** | 10 (R01–R10) | 28, 28.2, 28.3.e, 28.3.g, 28.3.h, 30.2, 31, 32, 33.2                             |
| **DPO**          | 12 (D01–D12) | 28, 30, 35, 38, 39, 39.1.b, 39.1.e                                               |

Enum: `frequenza` (Continuo, Mensile, Semestrale, Annuale, Al verificarsi, Una tantum) ·
`priorita` (Critica, Alta, Media) · `stato` (Da fare, In corso, Completata, In ritardo) ·
`rischio` intero 4–9.

Questo catalogo è **la proprietà intellettuale del prototipo**. Va conservato integralmente e trattato
come contenuto versionato di piattaforma, non come costanti nel codice.

### 1.3 Il motore di calcolo, decodificato

Tutto vive in un unico `useMemo` (`f`). Formule esatte:

```
compliance_totale   = round(completate / totale × 100)
compliance_ruolo(r) = round(completate(r) / totale(r) × 100)
imminenti           = count(0 ≤ giorni_a_scadenza ≤ 7 AND stato ≠ Completata)
ritardo             = count(stato = "In ritardo" OR (scadenza < oggi AND stato ≠ Completata))

peso(priorità)      = Critica 1.5 | Alta 1.2 | Media 1.0
V (rischio pesato)  = Σ (rischio × peso) sui task NON completati

stima_sanzione      = ritardo × 12.500 € + critici_aperti × 22.000 € + V × 850 €
range mostrato      = stima × 0.6  →  stima × 1.8

prontezza_ispettiva = max(20, 100 − ritardo×8 − (100 − compliance)/2)
```

**Valori reali sul seed** (verificati eseguendo il codice):

| KPI                                   | Valore                                       |
| ------------------------------------- | -------------------------------------------- |
| Compliance totale                     | **21%** (9/42)                               |
| Titolare / Responsabile / DPO         | 20% / 30% / 17%                              |
| Task in ritardo                       | 9                                            |
| Priorità Critiche aperte              | 12                                           |
| V (rischio pesato)                    | 305,9                                        |
| **Esposizione sanzionatoria stimata** | **€ 636.515** (range € 381k – € 1,15M)       |
| Prontezza ispettiva                   | 20% (valore di floor: la formula darebbe −8) |

### 1.4 I blocchi funzionali dell'interfaccia

1. **Header** — nome cliente editabile, segmentato ruolo (Tutti/Titolare/Responsabile/DPO), toggle
   dark/light, badge "LIVE %", tre pulsanti export.
2. **4 KPI card** — completamento, scadenze 7gg, ritardi, rischio sanzionatorio in €.
3. **3 donut SVG** — compliance per ruolo (Titolare viola, Responsabile ciano, DPO ambra).
4. **Attività per stato** — barre orizzontali + micro bar-chart SVG.
5. **Heatmap rischi 4×4** — righe = `floor(rischio/3)`, colonne = peso priorità.
6. **Timeline "Gantt"** — 12 scadenze più vicine, barra proporzionale ai giorni residui.
7. **Tabella task** — ricerca full-text (titolo+descrizione+articolo), filtro stato, filtro ruolo,
   drawer di dettaglio, "Segna Completata", creazione nuovo task via modale.
8. **Pannello relazione on-screen** — anteprima delle 13 sezioni con "Genera / Aggiorna Relazione",
   contatore di versione incrementale.
9. **Toast** di conferma azione.

### 1.5 Il generatore di relazione — il cuore commerciale

Funzione `Ki()`: costruisce per concatenazione di stringhe un documento HTML autonomo di **13 sezioni**,
con CSS di stampa dedicato (`@media print`), indice ancorato e intestazione "Riservato / Partner Ready".

1. Executive Summary — fotografia e maturità
2. Contesto normativo e perimetro (ruoli ex artt. 24, 28, 37-39; basi giuridiche art. 5)
3. Metodologia di assessment (4 fasi: Scoping → Gap → Risk → Reporting)
4. Analisi KPI combinata — correlazione ritardi/rischio, esposizione art. 83, prontezza ispettiva
5. Analisi per ruolo, con tabella dei primi 8 controlli per ruolo
6. Mappatura rischi — matrice 4×4 + 6 rischi concreti classificati art. 83.4 / 83.5
7. Trend storico 6 mesi
8. SWOT esteso — 5 evidenze per quadrante, generate condizionalmente dai dati
9. Piano di rimedio — 8 azioni con Cosa/Perché/Come, owner, tempistica, KPI, effort, costo, dipendenze
10. Benchmark di settore
11. Roadmap 90 giorni in 3 fasi con budget
12. Allegato: registro completo dei 42 controlli
13. Conclusioni per Partner/CdA + disclaimer

**Export disponibili — con nomi ingannevoli:**

| Pulsante | Cosa produce realmente                                            |
| -------- | ----------------------------------------------------------------- |
| PDF      | Un file `.html`, più apertura di `window.print()` in un tab nuovo |
| Word     | Un `.doc` che è HTML con MIME `application/msword`                |
| Excel    | Un `.csv` con separatore `;` (tre blocchi: task, KPI, SWOT)       |

### 1.6 Obiettivo finale dello strumento

Il prototipo **non è un task manager**. È un **generatore di deliverable consulenziale**.

La catena di valore è:

> 42 controlli con stato → 6 KPI derivati → **un documento da 13 sezioni, firmabile, che il consulente
> consegna al CdA del cliente e fattura**.

Il pubblico del deliverable è dichiarato nel documento stesso: _"Partner, CdA e Organismo di Vigilanza"_.
La leva commerciale è la **traduzione del gap tecnico in una cifra in euro** (esposizione art. 83): è ciò
che trasforma una checklist in una decisione di budget.

Il vero prodotto da costruire, quindi, è: _la piattaforma su cui un DPO/studio legale mantiene lo stato di
compliance di un portafoglio di clienti e da cui estrae, in un click, relazioni difendibili davanti al
Garante._

### 1.7 Difetti da correggere prima di industrializzare

**Bloccanti (rischio legale/reputazionale)**

- **B1 — Numeri inventati presentati come analisi.** I coefficienti 12.500 / 22.000 / 850 € non hanno
  fonte. Il trend a 6 mesi è **simulato** (`comp = max(18, totale − 22)`, ritardi = `ritardo + 6`): non è
  storico, è aritmetica sul dato di oggi. La KPI card "+X% vs mese scorso" è `max(2, totale − 60)`.
  Il benchmark di settore (58% / 82% / 5,2 ritardi) è hardcoded, con citazione _"Osservatorio Privacy
  Politecnico Milano 2023/2024, campione 320 aziende"_ di cui il codice non ha alcun dato.
  **Consegnare questo a un CdA è un problema di responsabilità professionale.**
- **B2 — Testo statico che contraddice i numeri dinamici.** La sezione 5 afferma _"Il Titolare mostra
  maturità intermedia con punti di forza su..."_ mentre il calcolo dà **20%**. Le prose delle sezioni
  2, 5, 6 sono costanti; solo SWOT e piano di rimedio sono condizionali.
- **B3 — Il nome cliente finisce grezzo nell'HTML generato.** Innocuo in locale; in un SaaS multi-tenant
  con documenti condivisibili diventa stored XSS.

**Funzionali**

- **F1 — Heatmap sbagliata.** L'intensità di colore è `(riga+colonna)/6`: **puramente posizionale, non
  legata ai dati**. La colonna 4 è strutturalmente sempre vuota (i pesi priorità sono solo 1-3). La riga 0
  è sempre vuota (rischio minimo nel dataset = 4). Di fatto è una griglia decorativa 3×3 utile.
- **F2 — Il "Gantt" non è un Gantt.** Nessun asse temporale: la larghezza è `((30 − giorni)/60)×100 + 20`,
  clampata. Non c'è durata, né dipendenze, né oggi-line.
- **F3 — Contatori hardcoded.** I sottotitoli dei donut dicono sempre "20 task / 10 task / 12 task":
  aggiungendo un controllo, mentono.
- **F4 — Doppio conteggio possibile** in "Attività per stato": un task "Da fare" con scadenza passata
  entra sia in "Da fare" sia in "In ritardo".
- **F5 — Seed incoerente.** T14, R04, D04 hanno stato "In ritardo" ma scadenza **futura**.
- **F6 — Stringhe di debug in produzione.** Un titolo di sezione recita letteralmente
  _"Compliance per Ruolo • FIX DONUT centratissimi"_, con sottotitolo _"viewBox 0 0 120 120 • cx 60 cy 60
  • r 46..."_.
- **F7 — Aritmetica date con `86400000` ms**: errori su cambio ora legale.
- **F8 — Google Fonts via `@import`** dentro il report generato: documento consegnato offline = font rotto.

---

## 2. Cosa manca perché diventi un servizio davvero potente

Il prototipo copre **una** delle sei cose che un DPO fa ogni giorno. Proposta di ampliamento, ordinata per
rapporto valore/sforzo.

### Tier 1 — senza questi non è un prodotto vendibile

| Modulo                               | Perché                                                                                                                                                                                            |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Portafoglio multi-cliente**        | Il target è uno studio con 10–80 clienti. Oggi il cliente è una stringa. Serve dashboard di portafoglio con semaforo per cliente, cosa scade questa settimana su _tutti_ i clienti                |
| **Evidenze documentali**             | La compliance è "dimostrabile" (art. 5.2) solo con prove. Ogni controllo deve poter allegare file, con data, autore, hash, versione. Senza allegati, "Completata" è un'opinione                   |
| **Storico reale e audit trail**      | Chi ha cambiato cosa e quando, append-only. È ciò che rende il trend vero e la relazione difendibile in ispezione                                                                                 |
| **Relazione congelata e versionata** | Il documento pubblicato deve essere uno snapshot immutabile (dati + derivati + PDF), non una rigenerazione al volo. Oggi due export dello stesso giorno danno risultati diversi se cambia un task |
| **PDF vero**                         | Non un `.html` rinominato. Impaginazione A4, numerazione, intestazioni, indice, firma                                                                                                             |
| **Motore sanzionatorio difendibile** | Rifondare la stima sulle **EDPB Guidelines 04/2022** (fatturato, gravità, art. 83.2 a–k) con parametri visibili e modificabili dal consulente, e un disclaimer serio. Vedi §6                     |

### Tier 2 — il salto da tool a piattaforma

| Modulo                                                 | Contenuto                                                                                                                                                                                                                                               |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Registro dei trattamenti (RoPA), artt. 30.1 e 30.2** | È il documento numero uno chiesto in ispezione ed è oggi solo un _task_. Deve diventare un'entità: trattamenti, finalità, basi giuridiche, categorie di interessati e dati, destinatari, tempi di conservazione, misure. Export nel formato del Garante |
| **Registro violazioni + workflow 72h**                 | Art. 33-34. Timer di notifica, valutazione del rischio per l'interessato, generazione della comunicazione al Garante e agli interessati                                                                                                                 |
| **Gestione DPIA**                                      | Art. 35: screening di obbligatorietà (criteri WP248), questionario guidato, parere DPO, esito                                                                                                                                                           |
| **Registro diritti degli interessati**                 | Artt. 12-22 con SLA a 30 giorni, contatore, tracciamento delle risposte                                                                                                                                                                                 |
| **Anagrafica fornitori / responsabili esterni**        | Art. 28: DPA, sub-responsabili, paese di trasferimento, certificazioni, scadenze contrattuali                                                                                                                                                           |
| **Mappa trasferimenti extra UE**                       | Artt. 44-49: SCC, TIA, misure supplementari (post-Schrems II)                                                                                                                                                                                           |
| **Scadenzario ricorrente vero**                        | Il campo `frequenza` esiste ma non genera nulla. Deve produrre occorrenze automatiche + notifiche email                                                                                                                                                 |
| **Libreria documentale con template**                  | Informative, nomine, DPA, atto di nomina DPO, playbook breach — con placeholder compilati dai dati del cliente                                                                                                                                          |

### Tier 3 — differenziazione competitiva

- **Portale cliente** in sola lettura: l'azienda vede il proprio stato, carica evidenze, il consulente
  valida. Riduce l'80% delle email.
- **Assessment guidato / questionario** da inviare al cliente per popolare i 42 controlli, invece della
  compilazione manuale del consulente.
- **Benchmark reale**, calcolato in forma aggregata e anonima sui clienti della piattaforma — a quel punto
  la frase "media di settore" è vera e diventa un asset difendibile.
- **Libreria normativa aggiornata**: provvedimenti del Garante e linee guida EDPB collegati ai controlli.
- **Formazione**: tracciamento corsi, attestati, scadenze (oggi solo i task T14 e D04).
- **Firma elettronica** della relazione (integrazione, non custom).

---

## 3. Architettura e componenti standard

Principio applicato: **niente codice custom dove esiste uno standard di mercato affidabile.**

### 3.1 Stack proposto

| Livello          | Scelta                                                                            | Motivazione                                                                                      |
| ---------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Framework        | **Next.js 16 (App Router) + TypeScript**                                          | Server actions, RSC, un solo deploy                                                              |
| DB               | **PostgreSQL su Supabase**                                                        | RLS nativa: l'isolamento multi-tenant è nel database, non solo nel codice                        |
| ORM              | **Drizzle**                                                                       | Schema tipizzato, migrazioni SQL leggibili e revisionabili                                       |
| Auth             | **Better Auth + plugin `organization`**                                           | Già usato in due progetti nostri. Dà organizzazioni, membri, ruoli, inviti: zero codice custom   |
| Pagamenti        | **Stripe** (Subscription + webhook idempotente)                                   | Standard                                                                                         |
| UI               | **Tailwind v4 + shadcn/ui (Radix)**                                               | Accessibilità dei primitivi già risolta                                                          |
| Grafici          | **Recharts**                                                                      | Già in uso, palette da token                                                                     |
| Editor testi     | **Tiptap** con whitelist di sanificazione server-side                             | Per le note e i capitoli narrativi della relazione                                               |
| Form/validazione | **Zod + react-hook-form**                                                         | Un solo schema per client e server                                                               |
| PDF              | **Playwright/Chromium** (dev) + `@sparticuz/chromium` + `puppeteer-core` (Vercel) | Pattern già collaudato in `workingnameBilanciotool`. HTML→PDF fedele, niente librerie di disegno |
| Email            | **Resend** + React Email                                                          | Notifiche scadenze, inviti                                                                       |
| File             | **Supabase Storage**, chiavi sempre prefissate `orgId/`                           | Evidenze documentali                                                                             |
| Errori           | **Sentry**                                                                        |                                                                                                  |
| Test             | **Vitest** (puri + DB) + **Playwright** (e2e)                                     | Il motore di calcolo va testato prima della UI                                                   |
| Onboarding       | **driver.js**                                                                     | Tour guidato                                                                                     |

### 3.2 Cosa NON scriviamo

Autenticazione, gestione organizzazioni/inviti/ruoli, fatturazione e proration, primitivi UI accessibili,
rendering PDF, invio email, upload file, generazione XLSX (→ `exceljs`), parsing/formattazione date
(→ `date-fns` con `date-fns-tz`, mai `86400000`).

### 3.3 Cosa scriviamo davvero (il valore)

1. **Il motore di scoring GDPR** — compliance, rischio pesato, esposizione art. 83, prontezza ispettiva:
   funzioni pure, testate, indipendenti dalla UI.
2. **Il catalogo dei 42+ controlli** come contenuto di piattaforma versionato.
3. **Il generatore di relazione** — template strutturati, non concatenazione di stringhe.
4. **I registri di dominio** (RoPA, breach, DPIA, diritti, fornitori).

### 3.4 Riuso concreto da progetti esistenti

`C:\Users\user\workingnameBilanciotool` (EvalisDeck, ESG per studi di consulenza) è un **gemello
architetturale**: stesso modello di business (studio → portafoglio di aziende clienti), stesso stack,
stesso mercato italiano, 8 fasi già completate. Da riadattare (non copiare 1:1):

- `src/lib/db/tenant.ts` — helper `withTenant` con GUC PostgreSQL (`app.org_id`, `app.user_id`) e seam
  `RLS_FORCE_ROLE` per testare le policy in CI. È la soluzione più pulita al multi-tenant che abbiamo.
- Migrazione `0001_rls_tenant_isolation.sql` — ruolo `app_rls` NOBYPASSRLS, policy default-deny, più un
  test `rls-matrix.db.test.ts` che **fallisce se aggiungi una tabella tenant senza policy**.
- `0002_snapshot_immutability.sql` — trigger che rende un documento pubblicato immutabile a livello DB.
  Esattamente ciò che serve alla relazione GDPR congelata.
- Layer `requireEntitlement` (capability + limiti da `platform_config`) e guards
  `requireActiveOrg`/`requireStudioAdmin`.
- `pdf.ts` dual-path dev/serverless, già verificato.
- Convenzione server action: ritorno `{ok} | {ok:false, errore, codice}`, mai eccezioni nude al client.
- Audit log append-only con UPDATE/DELETE revocati per grant.

`FormazioneEvalis` ha in più i pattern Stripe (webhook idempotente) e una copia locale del sorgente
Better Auth in `references/better-auth/`, utile come documentazione offline.

---

## 4. Progetto database multi-tenant

### 4.1 Modello di tenancy

```
organization  (lo STUDIO / DPO / ufficio legale)   ← tenant boundary
  └── member (user × role: owner | admin | consultant | viewer)
  └── client_company  (l'AZIENDA CLIENTE)          ← perimetro operativo
        └── engagement (incarico: ruolo assunto, periodo, tariffa)
              └── assessment (fotografia datata)
                    └── control_instance (i 42+ controlli calati sul cliente)
                          └── evidence / note / history
              └── ropa · breach · dpia · dsar · vendor · transfer
        └── report (snapshot immutabile + PDF)
```

**Regola non negoziabile:** ogni tabella di dominio porta `organization_id` e ha una policy RLS
`<tabella>_tenant_rls`. L'isolamento è nel database. Il codice applicativo è la seconda linea, non la prima.

### 4.2 Domini e tabelle

**A. Auth & tenancy** (generate da Better Auth + nostre)
`user`, `session`, `account`, `verification`, `organization`, `member`, `invitation`,
`client_company`, `engagement`

`client_company`: `id, organization_id, nome, piva, codice_fiscale, ateco, settore, dimensione,
sede, stato (active|archived), is_demo, logo_storage_key, created_at, archived_at`
→ `is_demo` e `archived` esclusi dai limiti di piano.

`engagement`: `id, organization_id, client_company_id, ruolo_assunto (dpo_esterno|consulente|
legale|auditor), data_inizio, data_fine, stato`

**B. Catalogo di piattaforma (versionato, non tenant)**
`control_catalog_version` — es. "GDPR Core 2026.1"
`control_template` — i 42 controlli: `codice (T01…), titolo, descrizione, articolo_ref, ruolo
(titolare|responsabile|dpo), frequenza, priorita_default, rischio_default, guida_operativa,
evidenze_attese (jsonb)`
`gdpr_article` — anagrafica articoli con testo e link, per collegare tutto alla norma
`sanction_parameter` — coefficienti del motore sanzionatorio, **versionati e con fonte**

Motivo: quando aggiorneremo il catalogo (nuove linee guida EDPB), gli assessment già chiusi devono
restare congelati sulla versione con cui sono stati fatti. Stesso pattern `content_set` di EvalisDeck.

**C. Assessment (il cuore)**
`assessment` — `id, organization_id, client_company_id, catalog_version_id, titolo, data_riferimento,
stato (draft|in_corso|chiuso), created_by`
`control_instance` — `id, organization_id, assessment_id, control_template_id, stato (da_fare|
in_corso|completata|non_applicabile), motivazione_na, priorita, rischio (1-10), scadenza, owner_user_id,
owner_esterno, completed_at, note`
→ aggiunta rispetto al prototipo: **`non_applicabile` con motivazione obbligatoria**. Un DPO deve poter
escludere un controllo e giustificarlo; oggi non può, e questo falsa ogni percentuale.
→ `In ritardo` **non è uno stato**: è derivato da `scadenza < oggi AND stato ≠ completata`. Nel prototipo
è uno stato persistito, ed è la causa dell'incoerenza F5.

`control_evidence` — `id, organization_id, control_instance_id, storage_key, nome_file, mime, dimensione,
hash_sha256, caricato_da, caricato_il, valido_dal, valido_al`
`control_history` — append-only: `control_instance_id, campo, da, a, user_id, at`

**D. Registri di dominio** (Tier 2)
`processing_activity` (+ `processing_purpose`, `processing_data_category`, `processing_recipient`) ·
`data_breach` (+ timeline notifica 72h) · `dpia` (+ `dpia_criterion`) · `dsar` · `vendor` ·
`vendor_dpa` · `transfer`

**E. Reporting**
`report` — `id, organization_id, client_company_id, assessment_id, tipo, versione (int),
snapshot (jsonb, dati + derivati congelati), pdf_storage_key, pubblicato_da, pubblicato_il`
→ **immutabile via trigger DB**: dopo la pubblicazione solo `pdf_storage_key` è modificabile, DELETE
revocata. Una nuova pubblicazione crea la versione N+1.
`report_section_override` — testi narrativi personalizzati dal consulente per sezione.

**F. Operativo**
`task_occurrence` — occorrenze generate dalla `frequenza` (il campo che oggi non fa nulla)
`notification` · `audit_log` (append-only, org + user + azione + entità + dettagli jsonb)
`subscription`, `stripe_event` (idempotenza), `platform_config` (limiti di piano)

### 4.3 Decisioni tecniche

- Chiavi `text` (cuid2) per allinearsi a Better Auth, non `uuid` misti.
- Percentuali e importi in **`numeric`**, mai float.
- I valori derivati **non si persistono**, si calcolano — _tranne_ nello snapshot del report pubblicato,
  che è l'unico punto in cui si scrivono.
- Timestamp `timestamptz`, calcoli di scadenza in `Europe/Rome`.
- Soft delete solo dove serve (archiviazione clienti); mai cancellare audit ed evidenze.

---

## 5. UI/UX premium "Corporate Tech"

### 5.1 Asset di design trovati nell'ambiente

| Asset                              | Percorso                                                              | Cosa dà                                                                                                                                                                                                                                                |
| ---------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **impeccable**                     | `~/.claude/skills/impeccable/` (SKILL.md + `reference/` + `scripts/`) | Metodo a gate: `teach` → `shape` (brief di forma da confermare) → `craft`. Richiede `PRODUCT.md` e `DESIGN.md` come fonte di verità e vieta di editare file prima che i gate passino. È il framework che tiene il design coerente su tutto il progetto |
| **ui-ux-pro-max**                  | `~/.claude/skills/ui-ux-pro-max/` e `~/.claude-skills/ui-ux-pro-max/` | 67 stili, 96 palette, 57 abbinamenti tipografici, 25 tipi di grafico, integrazione shadcn MCP                                                                                                                                                          |
| **dataviz**                        | skill di sistema                                                      | Regole per grafici accessibili in light/dark, palette validata                                                                                                                                                                                         |
| **taste-skill**, **huashu-design** | `~/.claude-skills/`                                                   | Riferimenti di gusto visivo                                                                                                                                                                                                                            |
| **`DESIGN.md` di EvalisDeck**      | `~/workingnameBilanciotool/DESIGN.md`                                 | Un registro di design "Corporate Tech" **già scritto e già validato dal committente**: token semantici in `globals.css`, divieto di colori hardcodati, numeri tabellari, scala tipografica, regole di motion, "momenti firmati"                        |

### 5.2 La direzione proposta

**Il metodo di EvalisDeck si riusa integralmente. La sua identità no.**

Se copiamo palette e font del gemello ESG, i due prodotti diventano indistinguibili — e il committente
chiede esplicitamente qualcosa di _unico_. Propongo quindi la stessa disciplina, identità diversa:

|                     | EvalisDeck (ESG)                | **GDPR Hub (proposto)**                                            |
| ------------------- | ------------------------------- | ------------------------------------------------------------------ |
| Metafora            | Contabilità della sostenibilità | **Sala di controllo / fascicolo istruttorio**                      |
| Base                | Near-white freddo               | Grigio-inchiostro leggermente più caldo                            |
| Accento             | Verde petrolio                  | **Blu oltremare profondo** + **ambra** riservata _solo_ al rischio |
| Sans                | Geist                           | Inter Display o Söhne-like, con **cifre tabellari obbligatorie**   |
| Serif del documento | Source Serif 4                  | Una serif con più autorità legale (Newsreader / Spectral)          |
| Momento firmato     | Matrice di materialità          | **Il "Fascicolo" e il termometro dell'esposizione**                |

**Principi (contro il prototipo):**

1. **Sobrietà come segnale di autorevolezza.** Il prototipo ha due blob gradient viola/ciano in blur
   120px, glassmorphism su ogni card, `hover:scale`, badge "LIVE" pulsante. È un linguaggio da landing
   page consumer. Chi vende un parere a un CdA non usa i gradienti. Registro di riferimento: Linear,
   Stripe Dashboard, Bloomberg Terminal — densi, silenziosi, veloci.
2. **Il colore è dato, non decorazione.** Rosso/ambra/verde riservati esclusivamente agli stati di
   rischio. Se il viola è ovunque, il rosso non allarma più. Copertura dell'accento ≤ 10% della pagina.
3. **Densità professionale.** Il target guarda 40 clienti, non 4 card. Tabelle compatte, righe da 13px,
   scansione verticale rapida, filtri persistenti nell'URL, scorciatoie da tastiera, comando `⌘K`.
4. **Due registri distinti, e il contrasto è il lusso.** L'_applicazione_ è uno strumento denso e
   neutro; il _documento generato_ è editoriale, con serif, ampi margini, copertina. Oggi il report
   ha `h2` viola su gradiente e bordi arrotondati 20px: sembra una newsletter, non una perizia.
5. **Gerarchia guidata dall'urgenza.** La prima schermata non deve essere "42 task", ma
   _"3 cose scadono questa settimana, su 2 clienti"_.

### 5.3 I quattro momenti firmati

1. **Dashboard di portafoglio** — una riga per cliente, semaforo, esposizione, prossima scadenza,
   sparkline di trend **reale**. È la schermata che il consulente tiene aperta tutto il giorno.
2. **Il "Fascicolo ispettivo"** — vista che simula cosa il Garante chiederebbe domani: documenti pronti,
   documenti mancanti, evidenze scadute. Nessun concorrente italiano lo presenta così.
3. **Termometro dell'esposizione art. 83** — non un numero secco, ma una scala con i parametri visibili
   e regolabili, e la fonte a fianco. Trasforma il difetto B1 nel punto di forza del prodotto.
4. **Copertina e frontespizio della relazione** — il pezzo che il cliente finale vede per primo.

### 5.4 Sequenza operativa proposta

1. Scrivere `PRODUCT.md` (utenti, tono, anti-riferimenti) — è un gate obbligatorio di `impeccable`.
2. `impeccable shape` → brief di forma, da **confermare da te** prima di ogni riga di UI.
3. Scrivere `DESIGN.md` vincolante + token in `globals.css`, sul modello di EvalisDeck.
4. Pagina interna `/design` come showcase di controllo, e script di verifica visiva
   (screenshot light/dark/mobile, zero errori console, zero colori hardcodati) come gate di ogni fase UI.

---

## 6. Punti aperti — decisioni che servono dal committente

1. **Modello sanzionatorio.** È il rischio numero uno. Tre opzioni:
   (a) mantenere i coefficienti attuali dichiarandoli apertamente come _indicatore interno di priorità_,
   non come stima di sanzione; (b) rifondare su EDPB Guidelines 04/2022 con input reali (fatturato,
   gravità, durata, cooperazione ex art. 83.2) e parametri modificabili dal consulente;
   (c) entrambi: indice di priorità sempre, stima economica solo se il consulente inserisce il fatturato.
   **Raccomando (c).**
2. **Benchmark di settore.** Rimuoverlo dalla V1 e reintrodurlo quando avremo dati aggregati reali,
   oppure acquistare una fonte citabile. Consegnare oggi "media 58%" con citazione di uno studio che non
   abbiamo è indifendibile.
3. **Trend storico.** Confermo che va costruito dallo storico reale (`control_history`), quindi nei primi
   mesi di uso di un cliente sarà vuoto. Serve un empty state onesto invece di una simulazione.
4. **Perimetro V1.** Propongo: portafoglio + assessment 42 controlli + evidenze + relazione versionata +
   PDF + Stripe. RoPA, breach e DPIA in V1.1. Confermi?
5. **Ruoli in piattaforma.** Il consulente lavora _per conto di_ un cliente: assumiamo un solo livello
   (consulente dello studio) in V1, con il referente aziendale in sola lettura predisposto ma disattivato?
6. **Pricing e limiti** (numero clienti, membri, storage evidenze) — servono per il layer entitlement.
7. **Nome e dominio del prodotto.**
8. **Multilingua.** Solo italiano in V1, con struttura predisposta?

---

## Criterio di successo di questa fase

Il report è validato quando il committente conferma: (1) l'obiettivo dello strumento come descritto in
§1.6, (2) il perimetro V1 di §6.4, (3) la direzione di design di §5.2, (4) il trattamento del modello
sanzionatorio di §6.1. Solo allora si passa alla pianificazione modulare dello sviluppo.
