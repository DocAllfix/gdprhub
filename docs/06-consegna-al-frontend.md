# Consegna alla sessione frontend

Scritto il 2026-09-19 dalla sessione che ha lavorato a sicurezza e deploy, per la sessione
che lavorerà a design e interfaccia. **Leggi questo file prima di proporre qualunque cosa.**

---

## 1. C'è un'altra sessione attiva sullo stesso repository

Sta lavorando su `deploy/`, `controllo/` e la catena di rilascio.

- **Non toccare** `deploy/`, `controllo/`, `.github/`, `apps/web/src/middleware.ts`.
- **Ci sono oltre sessanta file modificati e non committati.** Un `git checkout`, un
  `git reset --hard` o un `git stash` distruggono il lavoro di un'altra sessione. Se ti serve
  un albero pulito, **chiedi**.
- **Non serve Docker** per il lavoro di frontend: `pnpm --filter web dev` basta. Se lo usi,
  leggi `deploy/GUASTI.md` **P-01**: questa macchina è arrivata al 100% di disco in un
  giorno, e l'immagine di questo progetto pesa 1,86 GB.

---

## 2. La forma è già stata scelta, e **come** è stata scelta conta più di cosa

Questa è la cosa più importante del file.

`DESIGN.md` è un **registro vincolante** (lo dice `CLAUDE.md`). Non è una raccolta di
preferenze: è l'esito di un processo documentato in `docs/04-stato-fasi.md` §F5d, e quel
processo è la parte da non buttare.

> Per quattro giri sono state descritte modifiche ai token e il committente ha risposto «fa
> cagare», che è un giudizio corretto e inutilizzabile. Il metodo giusto si è rivelato un
> altro: **costruire le alternative e fargliele guardare**, sullo stesso contenuto reale, in
> entrambi i temi, su tutte le schermate insieme — perché una direzione può reggere sul
> cruscotto e crollare sulla tabella da sessantaquattro righe.

Le scelte, prese così, una per una:

| Passo | Alternative mostrate                              | Scelta         |
| ----- | ------------------------------------------------- | -------------- |
| 1     | Terminale · Schede · Editoriale                   | **Schede**     |
| 2     | Perizia (Plex+serif) · Console (Geist) · Gazzetta | **Geist**      |
| 3     | Filetto · Piano · Fascia                          | **Piano**      |
| 4     | Quieto · Steso · Inciso                           | **Quieto**     |
| 5     | Notte 288 · Carta · Terra 78                      | tutte scartate |
| 6     | Grafite · **Oliva 110** · Melanzana 307           | **Oliva**      |

**Se proponi una direzione diversa, stai rifacendo una scelta che il committente ha già preso
guardando schermate vere.** Può essere legittimo — ma allora la si rifà con lo stesso metodo:
costruendo le alternative e facendogliele vedere, non descrivendole.

Le anteprime esistono ancora, sotto **`/varianti`** (tredici pagine). Funzionano in
sviluppo; in produzione rispondono 404 di proposito. Sono l'archivio di come si è arrivati
qui, e il modo più rapido per capire cosa è già stato scartato **e perché**.

---

## 3. I divieti che collideranno con le tue skill

`DESIGN.md` §Divieti. Li riporto perché una skill di «UI premium» propone naturalmente
quasi tutti:

- niente **glassmorphism**, niente **testo in gradiente**, niente **emoji**
- niente **pulsante primario blu** — il navy è il colore che il committente ha **rifiutato**,
  ed è anche quello del progetto gemello: non ci si torna
- niente **bordo laterale colorato** come accento
- niente **grande numero eroico** in scheda: gli indicatori stanno in una banda compatta
- niente **griglia di schede identiche dove serve una tabella**
- niente **dato inventato**: se lo storico non c'è, si mostra un empty state onesto — mai un
  andamento generato

E sul movimento, §«Movimento: due animazioni in tutto il sistema»:

- `.entra` — opacità e sei pixel di salita, 320 ms, sfalsate di 60 ms
- `.cresce` — le barre partono da zero, 520 ms
- curva `cubic-bezier(0.22, 1, 0.36, 1)`, **niente rimbalzi**: in uno strumento di lavoro
  sembrano un giocattolo
- **nessuna animazione si ripete**: un'interfaccia che si agita mentre la si legge è peggio
  di una ferma
- `prefers-reduced-motion` azzera tutto in `@layer base`

Questo è un prodotto che un consulente apre **otto ore al giorno** per leggere tabelle da
sessantaquattro righe. Non è una landing page. L'eleganza qui si misura in quanto poco
stanca, non in quanto colpisce.

---

## 4. Un vincolo tecnico che condiziona la scelta delle librerie

**C'è una Content-Security-Policy attiva**, impostata da `apps/web/src/middleware.ts`:

```
default-src 'self'
script-src 'self' 'nonce-<per richiesta>' 'strict-dynamic'
style-src 'self' 'unsafe-inline'
img-src 'self' data: blob:
connect-src 'self'
object-src 'none'; base-uri 'none'; frame-ancestors 'none'
```

Conseguenze dirette sulle librerie che puoi usare:

- **niente CDN.** `default-src 'self'` blocca script, fogli di stile, font e immagini da
  qualunque altro host. Tutto va impacchettato — comprese le font, che infatti sono
  `@fontsource` e non Google Fonts.
- **niente `eval` né `new Function`.** Alcune librerie di animazione li usano per le curve:
  vanno verificate prima di adottarle, non dopo.
- gli stili in linea passano (`style-src 'unsafe-inline'`), quindi Motion e GSAP che scrivono
  `element.style` vanno bene.
- se aggiungi uno `<script>` inline, **deve portare il nonce**, che arriva da
  `headers().get("x-nonce")`. C'è già un esempio in `app/layout.tsx`.

**Verifica una libreria nuova con la CSP attiva, non in sviluppo senza.** Una libreria che
funziona in `dev` e viene bloccata in produzione è il difetto più tipico di questo progetto:
ce ne sono undici documentati in `deploy/GUASTI.md`, famiglia B.

---

## 5. Il cancello visivo, che deve restare verde

`pnpm --filter web gate:visivo` — e non è un rapporto, è un **cancello**: esce diverso da
zero al primo difetto.

Per ogni pagina, per ogni larghezza e per **entrambi i temi**: clicca _ogni_ elemento
interattivo enumerato dal DOM (non un campione), verifica che ogni collegamento interno
risponda, attraversa la pagina da tastiera e pretende un anello di focus visibile.

Novanta controlli su novanta erano verdi prima di questa consegna. Un refactoring che li
rompe non è finito.

---

## 6. Cosa ho toccato io, che tocca anche te

| File                                                 | Cosa è cambiato                                                                              |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `app/layout.tsx`                                     | è `async` e legge il nonce dalle intestazioni; lo script del tema lo porta                   |
| `src/middleware.ts`                                  | **nuovo** — CSP e intestazioni. Non modificarlo senza avvisare                               |
| `app/error.tsx`, `global-error.tsx`, `not-found.tsx` | **nuovi** — prima non esistevano. Sono grezzi: **vestili tu**                                |
| `app/invito/[id]/`                                   | **nuovo** — pagina e modulo per accettare un invito. Scritta in fretta, merita il tuo occhio |
| `components/impostazioni/secondo-fattore.tsx`        | **nuovo** — QR, verifica, codici di recupero. Funziona; non è bello                          |
| `components/impostazioni/utenti.tsx`                 | aggiunto il modulo «invita un collega»                                                       |
| `app/(app)/impostazioni/page.tsx`                    | aggiunta la sezione del secondo fattore                                                      |
| `app/varianti/layout.tsx`                            | **nuovo** — fa sparire `/varianti` in produzione. In sviluppo funziona come prima            |

**Le quattro schermate nuove sono il tuo primo lavoro utile.** Sono state scritte per
funzionare, non per essere guardate: `global-error.tsx` ha gli stili in linea perché
sostituisce l'intero documento, e le altre tre usano i componenti base senza cura della
composizione.

---

## 7. Dove il prodotto è davvero migliorabile

Non è un elenco di desideri: sono punti dove il difetto è noto e documentato.

- **La tabella da sessantaquattro righe** è la schermata che regge o affonda il prodotto.
  `docs/04-stato-fasi.md` lo dice: una direzione può funzionare sul cruscotto e crollare lì.
- **Gli undici registri** si costruiscono da una definizione nel motore
  (`packages/engine/src/registri/tipi.ts`): una pagina sola, undici forme. Se la migliori,
  migliorano tutte insieme — ed è anche il posto dove è più facile romperle tutte insieme.
- **Gli stati vuoti.** `DESIGN.md` ha una regola apposta («il segnaposto è parte del design,
  non un ripiego»), e ci sono schermate che non la rispettano.
- **Il dataset dimostrativo del 231 è un muro rosso**: 0 adempimenti completati su 65, otto
  famiglie di reato scoperte su otto. Non è un difetto del calcolo — è il dato del prototipo
  del committente. Chi apre la vetrina non vede il prodotto, vede un allarme. È in
  `docs/05-arretrato.md` §2.1 e **aspetta una decisione del committente**, non una tua.

---

## 8. I file da leggere, in quest'ordine

1. `DESIGN.md` — vincolante. Le ultime sei regole sono datate 2026-08-04 e spiegano il perché
2. `docs/04-stato-fasi.md` §F5d — **come** si è arrivati alla forma, e perché il metodo conta
3. `PRODUCT.md` — cosa fa il prodotto e per chi
4. `docs/05-arretrato.md` — cosa manca e chi lo decide
5. `/varianti` in sviluppo — le alternative già scartate
6. `/design` in sviluppo — il sistema di design su contenuto reale

---

## 9. Una cosa sul metodo, pagata cara

In un giorno questa sessione ha trovato **quindici difetti**. Cinque si vedevano leggendo il
codice. Dieci no: sono usciti solo **facendo** — modificando un file e guardando
`git status`, elencando l'output di una build, avviando un container, lanciando uno script.

Il codice era scritto bene e i commenti spiegavano scelte corrette. Erano invisibili perché
nessuno aveva mai eseguito quei passi.

Per te si traduce così: **una schermata che non hai aperto non è finita**, e un componente
che passa il typecheck non è un componente che si può usare. Il cancello visivo esiste per
questo, ed è l'unica prova che conta.

Il registro è in `deploy/GUASTI.md`: se ne incontri uno nuovo, aggiungilo lì.
