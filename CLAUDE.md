# CLAUDE.md - Direttive Operative di Sistema

## 1. Pensa prima di agire

**Non dare per scontato. Non nascondere la confusione. Esponi i compromessi.**

- Dichiara esplicitamente le tue assunzioni. Se una funzionalità, un file o un flusso non ti è chiaro, fermati e chiedi.
- Presenta sempre le alternative architettoniche prima di scrivere codice.

## 2. Semplicità prima di tutto

**Il minimo indispensabile per risolvere il problema. Niente astrazioni premature.**

- Scrivi codice pulito, lineare e moderno. Evita l'over-engineering se non porta un reale valore dimostrabile.

## 3. Modifiche chirurgiche

**Tocca solo ciò che devi. Pulisci solo il tuo disordine.**

- Quando scriveremo codice, modificherai esclusivamente i file necessari. Nessun refactoring a cascata non richiesto.

## 4. Esecuzione guidata da obiettivi

**Definisci criteri di successo verificabili. Itera fino alla verifica.**

- Ogni tuo output deve avere un obiettivo chiaro. Per la fase di analisi, l'obiettivo è una scomposizione totale e analitica degli asset di partenza.

---

## CONTESTO DEL PROGETTO

Progetto SaaS su commissione destinato a consulenti privacy, studi legali e DPO. Il sistema nasce dal prototipo React/HTML "GDPR Compliance Hub" presente nell'archivio. Il lavoro iniziale consiste nell'analizzare attentamente l'HTML, decodificare le logiche di calcolo del rischio, l'esposizione sanzionatoria e la gestione dei task per i vari ruoli (Titolare, Responsabile, DPO). L'obiettivo è ricostruire una piattaforma moderna, , adottando standard UI/UX premium ("Corporate Tech") che si distanzino nettamente dai layout raw.
Ovviamente man mano che definirai il progetto potrai modificare e aggiornare questo claude.md.

### Direttive confermate dal committente (2026-08-02)

- **Distribuzione per istanza**, non SaaS pubblico: un deploy dedicato per cliente dietro **Caddy** (TLS
  automatico), sul modello di `C:\Users\user\WhistleBlower`. **Nessun pagamento online**: niente Stripe,
  niente registrazione pubblica, niente layer entitlement a pagamento. Modello applicativo di riferimento:
  `C:\Users\user\sistemacommercialisti`.
- **Prima istanza online = vetrina.** Il **tour di onboarding** (driver.js, attributi `data-tour` scritti
  insieme ai componenti) entra **dalla prima fase, su tutte le istanze**. I **blocchi demo** si
  implementano **solo dopo conferma esplicita** del committente: fino ad allora si predispone soltanto il
  flag `instance_config.mode` con helper no-op.

### Documenti di fase

- `docs/01-analisi-prototipo.md` — analisi del prototipo, moduli di prodotto, schema, direzione di design
- `docs/02-addendum-modello-per-istanza.md` — rettifica architetturale per il modello per istanza, deploy,
  flotta, tour e blocchi demo

Entrambi **in attesa di validazione**: nessun codice applicativo finché il committente non conferma.
