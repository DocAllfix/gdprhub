# Legisboard — Product Landing Master Plan & Launch Blueprint

*2026-09-24 · piano, nessun codice ancora · da approvare prima dell'esecuzione*

## 0. Contesto

Il committente ha confermato (tramite Social-Studio, poi direttamente) una **direzione nuova**:
una landing di prodotto pubblica su `legisboard.eu`. Nel registro di prodotto oggi la parola
«landing» non compare: la direttiva confermata era distribuzione per istanza dietro Caddy, senza
registrazione pubblica. La landing non contraddice quel modello, gli si affianca: è la vetrina
commerciale, le istanze clienti restano per istanza.

L'esito voluto è un asset commerciale che **porta un DPO o uno studio legale dentro il prodotto
vero in un clic**, e da lì a un appuntamento o a una richiesta d'acquisto — senza un prezzo,
senza una prova sociale inventata, senza un solo numero scritto a mano.

### 0.1 Decisioni prese dal committente

| Data | Decisione |
| --- | --- |
| 2026-09-23 | Nome **Legisboard**, domini `legisboard.eu` e `legisboard.it` (già in `src/lib/brand.ts`, in produzione) |
| 2026-09-24 | Landing su **`legisboard.eu`**. `legisboard.it` e i `www` → redirect permanente al `.eu`. Demo su **`demo.legisboard.eu`** |
| 2026-09-24 | **Nessun prezzo** sulla landing |
| 2026-09-24 | **Blocchi demo confermati**: demo pubblica con un clic, che poi porta a «Fissa un appuntamento» o «Richiedi l'acquisto». È la conferma che `CLAUDE.md` richiedeva |
| 2026-09-24 | Contatto tramite **modulo sulla pagina** |
| 2026-09-24 | Titolare legale: **per ora niente** in footer e dati strutturati |

### 0.2 Premesse del brief corrette dai fatti

1. **`C:\Users\user\Desktop\Social-Studio` non contiene asset di Legisboard.** È una pipeline di
   video e AI: Dune, noir, fotoscarpe, `saas-demo`. Zero SVG, nessun logo, nessuna palette per
   questo prodotto. Gli asset **vanno prodotti** dalla sessione Social-Studio, che ha Recraft. La
   specifica gliel'ho già mandata (§4).
2. **evalisdeck ha un difetto da non copiare.** I contatori animati partono da `useState(0)`, e
   l'HTML servito contiene letteralmente «0 documenti pubblicabili», «0 controlli ISO», «0
   indicatori» (verificato con `curl`). GPTBot, ClaudeBot, PerplexityBot e le anteprime dei link
   non eseguono JavaScript: **leggono zeri**. E `Reveal` usa `transition-all`, cioè anima tutto,
   non solo `transform` e `opacity`.
3. **La «Social Proof» non esiste ancora, e non si inventa.** Non ci sono clienti: la prima
   istanza è la vetrina. Nessuna testimonianza, nessun logo di clienti, nessun contatore di
   utenti. Al posto della prova sociale va la **prova per specificità** (§1.3, sezione S2).
4. **Il modulo ha un vincolo di legge che il «per ora niente» sul titolare non scioglie.**
   Raccogliere nome ed email è un trattamento. L'art. 13 GDPR vuole l'informativa **al momento
   della raccolta**, con il titolare nominato. Il modulo si costruisce ma **resta spento dietro
   un interruttore** finché non esistono titolare, informativa e relay di posta. Su un prodotto
   che vende conformità GDPR, è il primo difetto che un prospect DPO troverebbe.
5. **«Prova la demo» oggi porta a un muro.** `/accedi` non ha alcun ingresso per un visitatore.
   `instance_config.mode` vale `full` e `assertNotDemo` è un no-op. La demo pubblica è quindi
   lavoro **nel prodotto**, non nella landing (§5).

---

## 1. Architecture Overview

### 1.1 Perché un'applicazione separata, e non una rotta dentro `apps/web`

Il vincolo decisivo, verificato:

| | `apps/web` (gdprhub) | evalisdeck |
| --- | --- | --- |
| Layout radice | `export const dynamic = "force-dynamic"` | statico |
| CSP | `middleware.ts` con **nonce per richiesta** | nessun middleware |
| Conseguenza | ogni pagina è resa per richiesta: nessuna cache CDN, TTFB serverless sull'LCP | le pagine di marketing sono statiche |

Una landing dentro `apps/web` sarebbe dinamica per costruzione. Per renderla statica bisognerebbe
toccare `middleware.ts`, che è **fuori perimetro**. Inoltre landing e prodotto stanno su domini
diversi, e smistare per dominio dentro un progetto solo richiederebbe di nuovo il middleware.

**Decisione: `apps/landing`**, una seconda applicazione Next nel monorepo, pubblicata come
**secondo progetto Vercel**. Il precedente esiste già sul vostro account: `axialoop-landing` è un
progetto separato.

### 1.2 Topologia

```
                     Hostinger DNS                         Vercel (team docallfixs-projects)
                     ─────────────                         ─────────────────────────────────
legisboard.eu      ─ A     @    ─┐
www.legisboard.eu  ─ CNAME www  ─┤                         legisboard-landing   (NUOVO)
legisboard.it      ─ A     @    ─┼──────────────────────►  apps/landing · SSG · fra1
www.legisboard.it  ─ CNAME www  ─┘                           legisboard.eu        ← primario
                                                             www.legisboard.eu    → 308 → legisboard.eu
                                                             legisboard.it        → 308 → legisboard.eu
                                                             www.legisboard.it    → 308 → legisboard.eu

demo.legisboard.eu ─ CNAME demo ────────────────────────►  gdprhub              (ESISTENTE)
                                                             apps/web · dinamico · nonce CSP · fra1
                                                             demo.legisboard.eu   ← APP_URL
                                                             gdprhub.vercel.app   (resta raggiungibile)

*.legisboard.it    — liberi: istanze clienti per istanza (brand.ts: verdi.legisboard.it)

Neon eu-central-1:  main      = vetrina / demo pubblica
                    sviluppo  = NUOVO ramo per .env.local (vedi §7, prerequisito P1)
```

### 1.3 Scomposizione in sezioni

Il ritmo è preso dal benchmark, depurato dalla copia: fasce chiare e **una fascia oliva**
(`bg-sidebar`) che interrompe per scandire, artefatti veri del prodotto al posto delle
illustrazioni, passi numerati con un esempio concreto in mono.

| # | Sezione | Titolo | Contenuto | Da evalisdeck | Diverso da evalisdeck |
| --- | --- | --- | --- | --- | --- |
| S0 | Intestazione | — | logotipo, 5 ancore, «Entra nella demo», «Richiedi una presentazione» (solo con modulo acceso) | struttura | menu mobile con `<details>`: zero JS |
| S1 | Eroe | `h1` | occhiello «GDPR · D.Lgs 231/2001 · D.Lgs 81/2008», promessa, sottotitolo con i numeri del motore, due CTA, microcopy «Dati fittizi · nessuna registrazione · si entra con un clic». A destra **`EstrattoRegistro`**: 6 righe vere del catalogo, resa server, con una riga «Completata · 23/06/2026 −52gg» | `HeroDeck`: un artefatto vero, non un'illustrazione | LCP = il testo dell'`h1`, **mai** dentro un'animazione |
| S2 | Prova per specificità | fascia oliva | 171 adempimenti · 3 decreti · 42 / 65 / 64 per decreto · 1 registro. **Tutti dal motore**, al valore finale nell'HTML. Uno spazio per una credenziale vera, vuoto finché non esiste | fascia numeri | **nessun contatore animato**: niente zeri per i crawler |
| S3 | Il problema: i due assi | `h2` | tesi di PRODUCT.md §1: «Completata **e** Scaduta». A destra la **matrice 4×4 interattiva** con i conteggi veri della demo: una cella filtra l'elenco sotto. Stato predefinito resto dal server = Completata × Scaduta, così anche senza JS si vede l'essenziale | le schede interattive | è l'**Interactive Preview**: il prodotto, non un mockup |
| S4 | Tre decreti, un registro | `h2` | tre colonne con conteggio, copertura e tre codici veri ciascuna. Un esempio vero di lettura incrociata (`lettoDa`): il codice porta la tinta del modulo proprietario | «14 percorsi, un solo archivio» | il grafo è il **secondo** tema, non il primo |
| S5 | Come funziona | fascia oliva | 01 Assessment per decreto → 02 Scadenzario unificato → 03 Relazione **con la carta intestata dello studio**. Una riga d'esempio in mono per passo | tre passi numerati su fascia scura | il passo 3 porta il white-label, che è un vantaggio vero per uno studio |
| S6 | Il metodo | `h2` | 5-6 principi numerati, **ognuno rintracciato in codice o in PRODUCT.md prima di scriverlo** | «Il metodo incorporato» | nessuna frase che il prodotto non mantiene |
| S7 | Distribuzione | `h2` | un'istanza per studio, dati nel suo perimetro, marchio dello studio, nessuna registrazione pubblica, secondo fattore. **Nessun prezzo.** CTA «Fissa un appuntamento» | sostituisce «Come si acquista» | niente listino, per decisione del committente |
| S8 | Domande | `h2` | 6-8 `<details>` fattuali. Il JSON-LD `FAQPage` si genera **dallo stesso array** | FAQ | fonte unica per testo e dati strutturati |
| S9 | Richiesta | `h2`, `#richiesta` | modulo (§6). Assente finché l'interruttore è spento | — | vincolo art. 13 |
| S10 | Piè di pagina | — | logotipo, ancore, «Entra nella demo», collegamenti legali quando esistono, «© 2026 Legisboard», «Funzioni e database a Francoforte (UE)» | struttura | nessuna ragione sociale finché il committente non la dà |

**Pagine al lancio:** solo `/`. `/privacy` e `/cookie` nascono con il titolare.

---

## 2. Design System e cura anti-slop

### 2.1 Una fonte sola per i token: `packages/ui` (`@legisboard/ui`)

Se l'oliva della landing deriva da quella del prodotto, il marchio si divide in due. Quindi:

- **si spostano** in `packages/ui/tokens.css` i blocchi `:root` (riga 46), `:root[data-theme="dark"]`
  (241), `@custom-variant dark` (22) e `@theme inline` (465) di `apps/web/src/app/globals.css`;
- **si sposta** `apps/web/src/components/stato.tsx` in `packages/ui/src/stato.tsx`. Il vecchio
  percorso resta come `export * from "@legisboard/ui/stato"`: **zero import da cambiare** in `apps/web`;
- in entrambe le app, `@source` verso `packages/ui/src`, perché Tailwind v4 scansiona solo la
  cartella dell'app.

È l'unica modifica strutturale ad `apps/web`. È uno spostamento, non una riscrittura, e si
verifica con la tabella delle rotte identica e il cancello verde.

### 2.2 Scelte

| Asse | Scelta | Motivo |
| --- | --- | --- |
| Carattere | Geist e Geist Mono dal pacchetto npm **`geist`** (`next/font/local`) | nessuna richiesta a Google in fase di build: toglie la fragilità già in `docs/05` |
| Tema | **solo chiaro** | DESIGN.md: chiaro predefinito, scrivania e foglio. Niente script inline del tema: CSP più stretta |
| Scala | token del prodotto più due soli token di landing, `--text-display` e `--text-display-sm`, con `clamp()` | l'`h1` di una landing non sta in `--text-titolo` (1.7rem) |
| Griglia | spaziature di layout **solo multipli di 8 px**; 4 px ammessi solo per lo spazio interno di riga | guardia: si estende `token-puri.test.ts` ad `apps/landing` |
| Colore | oliva per marchio, CTA e fasce. **Rosso, ambra e verde compaiono solo dentro gli estratti veri del prodotto**, dove significano ciò che significano | DESIGN.md: il colore è dato, non decorazione |
| Contrasto | AA misurato con la sonda a pixel su canvas | `getComputedStyle` restituisce `lab()` e fa leggere LAB come RGB: trappola già caduta |
| Terzo livello | `--faint-foreground` **solo su icone** | regola già adottata: non passa 4,5:1 sul testo |
| Icone | `lucide-react`, come il prodotto | nessun set nuovo |

### 2.3 Movimento

- **Rivelazione allo scorrimento in CSS puro**: `animation-timeline: view()`, solo `opacity` e
  `transform`, dentro `@media (prefers-reduced-motion: no-preference)`. Contenuto **visibile per
  impostazione**: dove la funzione non è supportata, semplicemente è già lì. Zero JavaScript.
- **L'eroe non si anima mai**: un `h1` a opacità zero ritarda l'LCP.
- **Matrice interattiva**: transizioni solo su `opacity` e `transform`, 150-250 ms, uscita morbida.
- **Nessun contatore animato**, nessuna parallasse, nessun gradiente, nessun vetro smerigliato.

### 2.4 Divieti espliciti

Scudi, lucchetti, spunte verdi · illustrazioni di persone o 3D · gradienti viola e ciano ·
«trusted by» senza clienti · numeri eroici animati · testimonianze · badge «LIVE» ·
`hover:scale` · schede identiche in griglia · cookie banner (non ne serve uno: §3.5).

---

## 3. SEO e Metadata Matrix

### 3.1 Metadati

| Campo | Valore | Note |
| --- | --- | --- |
| `<html lang>` | `it` | un'unica lingua: **niente hreflang**. Il `.it` è un redirect, non un'alternativa |
| `title` | «Legisboard · adempimenti GDPR, 231 e 81/08 in un registro» | ≤ 60 caratteri, da confermare sulla copia |
| `description` | una frase con i numeri presi dal motore | ≤ 155 caratteri |
| `metadataBase` / canonical | `https://legisboard.eu/` | un solo host canonico |
| `robots` | `index,follow` **solo se** `VERCEL_ENV=production` e `LANDING_INDICIZZABILE=1`, altrimenti `noindex,nofollow` | anteprime mai indicizzate |
| `og:type` · `og:site_name` · `og:locale` | `website` · `Legisboard` · `it_IT` | |
| `og:image` | `app/opengraph-image.tsx` con `next/og`, 1200×630, più `alt` | generata, mai statica (§4.3) |
| `twitter:card` | `summary_large_image`, stessa immagine | |
| `themeColor` | oliva del token `--sidebar` | nell'export `viewport` |
| Icone | `app/icon.svg` dal simbolo, `app/apple-icon.tsx` 180×180 generata | |

### 3.2 Dati strutturati (JSON-LD, un solo `@graph`)

| Tipo | Campi | Stato |
| --- | --- | --- |
| `WebSite` | `name`, `url`, `inLanguage: "it"` | al lancio |
| `SoftwareApplication` | `name`, `applicationCategory: "BusinessApplication"`, `operatingSystem: "Web"`, `inLanguage`, `description`, `url`, `featureList` | al lancio, **senza `offers`** |
| `FAQPage` | generata dallo stesso array delle domande in S8 | al lancio |
| `Organization` | nome legale, indirizzo, P.IVA | **rinviata**: decisione del committente sul titolare |

Due limiti, detti prima di scoprirli:

- **Google non mostra rich result per `SoftwareApplication` senza prezzo né valutazioni.** Senza
  prezzi quel risultato arricchito non arriva. Il markup resta valido e serve a far capire
  l'entità a motori e assistenti.
- **I rich result `FAQPage` Google li mostra solo a siti istituzionali e sanitari.** Il markup
  resta utile per le risposte degli assistenti AI.

### 3.3 `robots.txt`, `sitemap.xml`, `llms.txt`

- `app/robots.ts`: `Allow: /`, `Disallow: /api/`, crawler di ricerca e risposta ammessi
  esplicitamente (`GPTBot`, `OAI-SearchBot`, `ClaudeBot`, `PerplexityBot`), riga `Sitemap`. Con
  l'indicizzazione spenta: `Disallow: /` per tutti. **Da decidere** se ammettere anche i crawler
  di addestramento (`Google-Extended`): evalisdeck li ammette, ed è una scelta commerciale.
- `app/sitemap.ts`: `/`, più `/privacy` e `/cookie` quando esistono. `lastModified` solo dove la
  data è vera — la regola di evalisdeck, che è giusta.
- `public/llms.txt`: cosa è Legisboard, per chi, i tre decreti, i numeri dal motore, gli indirizzi.

### 3.4 Semantica

Un solo `h1` in S1. Ogni sezione è `<section aria-labelledby>` con il suo `h2` e un `id` che è
anche l'ancora del menu. `h3` per le voci interne. Punti di riferimento: `header`, `nav`,
`main`, `footer`. FAQ in `<details>`/`<summary>`. **`<article>` non si usa**: sulla landing non
esiste un'unità autonoma e ripubblicabile, e un'etichetta messa per riempire una lista di
controllo è semantica falsa.

### 3.5 Core Web Vitals: bersagli e strumenti

| Metrica | Bersaglio (mobile, Slow 4G) | Mezzo |
| --- | --- | --- |
| LCP | < 1,8 s | l'elemento LCP è testo; font con fallback regolato da `next/font` |
| CLS | < 0,05 | dimensioni esplicite ovunque; font senza spostamento |
| INP | < 100 ms | un solo componente client (la matrice), stato locale |
| JS al primo carico | < 90 KB gzip | tutto il resto è componente server |

Misura: **Lighthouse CI** con asserzioni sui bersagli, la sonda CLS del cancello già falsificata,
e un controllo **senza JavaScript**: `curl` dell'HTML deve contenere l'`h1`, i numeri 171 · 42 ·
65 · 64, il JSON-LD valido e il testo delle domande.

**Misurato il 2026-09-24 sulla landing vera** (`legisboard-landing.vercel.app`, servita dalla CDN,
Lighthouse mobile in simulazione 4G lenta, due giri): **Prestazioni 88–89 · Accessibilità 100 ·
Best Practices 100 · CLS 0** · LCP 2,8–2,9 s · TBT 230–260 ms. Il SEO a 66 è il `noindex` voluto
sull'indirizzo provvisorio.

Due bersagli di questa tabella erano sbagliati, e lo scrivo invece di fingere di averli
raggiunti:
- **JS < 90 KB** non è raggiungibile con l'App Router: il runtime di React e del router pesa
  circa 143 KB anche con **zero** componenti client nostri, che è il caso di questa pagina.
- **LCP < 1,8 s** in quella simulazione non è stato raggiunto. Non precaricare il carattere mono
  non ha cambiato niente (misurato e annullato): il mono è sopra la piega, nel mazzo. La leva
  rimasta è il peso dei caratteri variabili; da misurare con PageSpeed Insights, oggi fuori
  quota.

**Analitiche: nessuna al lancio.** Anche un'analitica senza cookie è un trattamento da scrivere
nell'informativa, e l'informativa non c'è ancora. Senza cookie non tecnici **non serve un banner**.

### 3.6 CSP della landing

Una pagina statica **non può avere un nonce**, perché il nonce nasce per richiesta. Le pagine
di Next contengono script inline, che portano il payload RSC.

- **Prova tecnica (spike) come primo passo della Fase C**: verificare se le pagine prerese
  permettono una CSP a hash (`'sha256-…'`) calcolata in build.
- **Se no**: `script-src 'self' 'unsafe-inline'` e **tutto il resto stretto**: `default-src
  'self'`, `object-src 'none'`, `base-uri 'self'`, `frame-ancestors 'none'`, `form-action
  'self'`. Più HSTS, `nosniff`, `Referrer-Policy`, `Permissions-Policy`. Il rischio residuo va
  scritto: nessun contenuto utente viene reso, nessuna sessione, nessun cookie.

---

## 4. Brand Integration Plan

### 4.1 Cosa chiedo a Social-Studio (specifica già inviata il 2026-09-24)

| File | Cosa | Formato | Ingombri |
| --- | --- | --- | --- |
| `legisboard-simbolo.svg` | il simbolo da solo | `viewBox` quadrato `0 0 64 64`; solo `<path>` e `<g>`; `fill="currentColor"`; **vietati** `<text>`, `<style>`, `<script>`, `<image>`, riferimenti esterni, gradienti, filtri | leggibile a **16 px**; provato a 16 · 24 · 32 · 48 |
| `legisboard-logotipo.svg` | simbolo più «Legisboard» affiancati | testo **convertito in tracciati** (un font nell'SVG è una richiesta esterna, bloccata dalla CSP); `currentColor`; `viewBox` stretto sull'inchiostro | altezza di riferimento **24 px** nell'intestazione, larghezza dichiarata; spazio di rispetto dichiarato |
| `legisboard-simbolo-16.svg` *(facoltativo)* | variante ottica per la favicon | come sopra; qui un `<style>` interno con `prefers-color-scheme` è ammesso | 16 px |

**Tre candidati, non uno.** Consegna in `C:\Users\user\Desktop\Social-Studio\workspace\output\legisboard\`.

Vincoli di forma già comunicati: nessuno scudo, lucchetto o spunta; il simbolo **non deve aver
bisogno del colore** per funzionare, perché nel prodotto sta in monocromia accanto al logo dello
studio; rosso, ambra e verde vietati. L'idea su cui lavora è quella giusta: **due assi
indipendenti** — non una scala, non una croce da mirino.

### 4.2 Cosa non chiedo, e perché

| Non serve | Perché |
| --- | --- |
| PNG di favicon e apple-icon | si rasterizzano in build dall'SVG |
| varianti di colore | `currentColor`: oliva sull'avorio, inchiostro dove serve |
| immagine Open Graph | generata nel codice (§4.3) |
| illustrazioni per l'eroe | l'eroe mostra il prodotto vero |
| set di icone | resta `lucide-react` |

### 4.3 Come si integra

- **Scelta con il metodo vincolante**: i tre candidati si montano sotto `/varianti/marchio` in
  `apps/web` — archivio escluso dalla produzione da `soloFuoriProduzione()` — sulla barra
  laterale vera e sull'intestazione vera della landing, in entrambi i temi. **Il committente
  sceglie guardando.**
- **Fino alla scelta**: la scritta «Legisboard» in Geist. **Nessun logo inventato da me.**
- Dopo la scelta:
  - `packages/ui/src/marchio.tsx`: SVG in linea con `currentColor`. In linea è sicuro sotto CSP,
    perché non contiene script.
  - `apps/landing/src/app/icon.svg` e `apple-icon.tsx`.
  - `opengraph-image.tsx`: fondo avorio, simbolo, «Legisboard», la promessa dell'`h1`, una riga
    in Geist Mono «Completata · 23/06/2026 −52gg» con la data nella tinta della scadenza
    (l'unico punto in cui il colore di stato compare fuori da un dato vero, ed è un dato vero
    della demo), e `legisboard.eu`. I font si caricano dai file del pacchetto `geist`, senza rete.
  - Nel prodotto, **a scelta fatta**: il simbolo accanto a `PRODOTTO.nome` nella barra laterale,
    e nell'intestazione delle relazioni senza marchio di studio.

---

## 5. Demo pubblica (in `apps/web`) — confermata il 2026-09-24

### 5.1 Percorso

```
legisboard.eu  «Entra nella demo»
   │
   ▼
demo.legisboard.eu/demo         ── mode ≠ demo ──► 404
   │  limite di frequenza per IP (Better Auth customRules)
   ▼
sessione aperta sull'utente dimostrativo (credenziali solo in env, mai mostrate)
   │
   ▼
/cruscotto?giro=1   ──► giro guidato driver.js (data-tour già previsti)
   │
   ▼
fascia fissa nella shell: «Stai guardando una demo · dati fittizi · ripristinati ogni notte»
                          [Fissa un appuntamento]  [Richiedi l'acquisto]
   │
   ▼
legisboard.eu/?motivo=appuntamento#richiesta     (modulo acceso)
legisboard.eu/?motivo=appuntamento               (modulo spento → CTA verso la demo e la pagina)
```

### 5.2 Blocchi lato server (`assertNotDemo`)

**Bloccato**: inviti (già), creazione utenti, cambio di ruolo, reimpostazione password, cambio
password, secondo fattore, marchio dello studio, **interruttori dei moduli**. Quest'ultimo
perché un clic su un interruttore spegneva un intero decreto e il visitatore successivo vedeva
«il modulo non è attivo»: è documentato in `scripts/pagine.mjs`.

**Permesso**: cambiare stati del lavoro e scadenze, che è il motivo per cui si prova.

Ogni blocco risponde con un messaggio che lo spiega, mai con un errore muto.
**Un test per ogni capacità bloccata.**

### 5.3 Ripristino e indicizzazione

- **Vercel Cron** ogni notte → `/api/cron/demo-reset`, protetto da `CRON_SECRET`. Riusa la
  logica di `demo-reset-cli.ts` (`seminaAziendaDimostrativa`), non la duplica.
- **`demo.legisboard.eu` fuori dagli indici**: `app/robots.ts` con `Disallow: /` e metadati
  `robots: { index: false }` quando l'istanza è in modalità demo.

### 5.4 Il login si rompe cambiando dominio, se non si fa in ordine

`lib/auth/index.ts` costruisce `trustedOrigins` da `env.APP_URL`, e Better Auth risponde 403
«Invalid origin» a ogni altra origine. Anche i link degli inviti usano `APP_URL`.
**`APP_URL` del progetto `gdprhub` passa a `https://demo.legisboard.eu` nello stesso passo in cui
il dominio diventa attivo** (G5), poi si rifà il deploy e si prova l'accesso sul nuovo host.

---

## 6. Modulo delle richieste

| Aspetto | Scelta |
| --- | --- |
| Campi | nome, email, studio od organizzazione, ruolo (DPO · avvocato · OdV · RSPP · consulente · altro), motivo (presentazione · appuntamento · richiesta d'acquisto, preselezionato da `?motivo=`), messaggio facoltativo |
| Base giuridica | misure precontrattuali (art. 6.1.b): **nessuna casella di consenso**. Nessun consenso marketing raccolto |
| Informativa | breve informativa art. 13 accanto al pulsante, più il collegamento a `/privacy` |
| Invio | route handler `POST /api/richieste` → validazione zod → SMTP con la **stessa convenzione `SMTP_*` del prodotto**: un relay solo per inviti e richieste |
| Antispam | campo trappola, tempo minimo di compilazione, rifiuto di collegamenti nel messaggio, regola di limite del firewall Vercel se il piano la consente (verificato in esecuzione). **Niente reCAPTCHA**: cookie e trasferimento verso gli USA, su un prodotto che vende GDPR |
| Senza relay | risposta 503 e messaggio onesto. Non si finge mai l'invio |
| Interruttore | `RICHIESTE_ATTIVE=1` solo quando esistono **titolare, informativa e SMTP**. Da spento, la sezione S9 e la CTA secondaria non esistono |
| Calendario | nessun calendario incorporato (cookie di terzi, buchi nella CSP). Se il committente fornisce un collegamento di prenotazione, diventa un collegamento esterno |

---

## 7. Pipeline di rilascio

### 7.0 Prerequisiti e permessi — da leggere prima

- **P0 · Permessi.** Oggi il classificatore dell'auto mode ha negato tre tipi di scrittura:
  API Vercel (regione, collegamento), API Hostinger non ancora provata, `UPDATE` sul database di
  produzione. I passi **F1, F3, G1, G3, G5, D7** sono scritture di quel tipo. **Non le aggiro.**
  Serve una regola di permesso, oppure approvi le singole chiamate. Per ciascuna ti mostro prima
  la chiamata esatta.
- **P1 · Separare il database di sviluppo.** Oggi `.env.local` punta al database di produzione
  (memoria `database-sviluppo-e-produzione`). Con `mode=demo` scritto lì, **anche lo sviluppo
  locale diventerebbe demo** e si bloccherebbe da solo. Serve un ramo Neon `sviluppo` e il suo
  indirizzo in `.env.local`. Un minuto dalla console Neon, oppure una chiave API Neon, che oggi
  non ho. Risolve anche il vecchio problema del cancello che sporca la vetrina.
- **P2 · Token.** Quello Vercel nuovo va in `~/.config/flotta/vercel.env` (`VERCEL_TOKEN`, 600),
  come Hostinger. In memoria **il percorso, mai il valore**. I due token Vercel e quello
  Hostinger sono passati in chat: **da revocare e riemettere** a lavoro finito.

### 7.1 Flusso CI/CD

```
git push main ─► GitHub DocAllfix/gdprhub ─► Vercel
                                              ├─ legisboard-landing  root apps/landing
                                              │    costruisce solo se cambiano apps/landing/ o packages/
                                              └─ gdprhub             root apps/web
                                                   costruisce solo se cambiano apps/web/ o packages/
```

«Ignored Build Step» su entrambi i progetti: senza, ogni commit della landing ricostruisce il
prodotto, e viceversa.

### 7.2 Checklist

**Fase A — Registro**
- [ ] A1 `docs/07-landing-e-demo.md` = questo piano; `PRODUCT.md` registra landing e demo pubblica come direzione nuova, con data e fonte; `CLAUDE.md`: blocchi demo confermati il 2026-09-24; `docs/05` aggiornato
- [ ] A2 P1 fatto (ramo Neon `sviluppo`); P2 fatto

**Fase B — Sistema condiviso**
- [ ] B1 `packages/ui` con `tokens.css` e `stato.tsx`; re-export in `apps/web`; `@source`
- [ ] B2 `token-puri.test.ts` legge `tokens.css` e scansiona anche `apps/landing`
- [ ] B3 build di `apps/web` con **tabella delle rotte identica**, cancello verde

**Fase C — Landing**
- [ ] C0 spike CSP a hash → decisione scritta
- [ ] C1 impalcatura `apps/landing`: Next 16.3.5 come `web`, Tailwind v4, `geist`, `@legisboard/engine`, `@legisboard/ui`, `lucide-react`, `vercel.json` con `fra1`
- [ ] C2 sezioni S0–S10, modulo dietro interruttore
- [ ] C3 metadati, JSON-LD, robots, sitemap, llms.txt, OG, icone
- [ ] C4 intestazione con la scritta in Geist, in attesa del marchio

**Fase D — Demo pubblica (`apps/web`)**
- [ ] D1 utente dimostrativo nel seme; `DEMO_EMAIL` e `DEMO_PASSWORD` in env
- [ ] D2 ingresso `/demo` con limite di frequenza
- [ ] D3 copertura `assertNotDemo` (§5.2) e un test per capacità
- [ ] D4 fascia demo nella shell con le due CTA e i `data-tour`
- [ ] D5 cron di ripristino con `CRON_SECRET`
- [ ] D6 `noindex` sulla demo
- [ ] D7 `instance_config.mode = 'demo'` sulla vetrina — **solo dopo P1**

**Fase E — Build e verifica di Core Web Vitals (in locale)**
- [ ] E1 typecheck, lint e test di `web` e `landing`
- [ ] E2 `next build` della landing: tutte le rotte `○` statiche tranne `/api/richieste` `ƒ`
- [ ] E3 controllo senza JS con `curl`: `h1`, 171 · 42 · 65 · 64, JSON-LD valido, testo delle domande
- [ ] E4 Lighthouse CI mobile con i bersagli di §3.5
- [ ] E5 cancello Playwright sulla landing: 3 larghezze, interattività, sonda CLS, sonda di contrasto
- [ ] E6 percorso demo completo: clic → sessione → azione bloccata con messaggio → CTA → modulo con motivo preselezionato
- [ ] E7 cancello di `apps/web` verde **anche in modalità demo**

**Fase F — Deploy Vercel**
- [ ] F1 progetto `legisboard-landing`: root `apps/landing`, collegamento `DocAllfix/gdprhub`, env, Ignored Build Step (e lo stesso su `gdprhub`)
- [ ] F2 push → build automatica → verifica sull'indirizzo `*.vercel.app` (noindex)
- [ ] F3 `gdprhub`: cron, `DEMO_*`, `CRON_SECRET`

**Fase G — Domini e DNS**
- [ ] G1 su Vercel: `legisboard.eu` (primario), `www.legisboard.eu`, `legisboard.it`, `www.legisboard.it` (redirect 308) su `legisboard-landing`; `demo.legisboard.eu` su `gdprhub`
- [ ] G2 valori DNS letti da Vercel (`GET /v6/domains/{dominio}/config`), **non scritti a mano**
- [ ] G3 Hostinger: TTL a 300, poi **aggiornamento per singolo record, mai `overwrite: true` sulla zona** (su `axialoop.com` cancellerebbe MX, SPF, DKIM e DMARC)
- [ ] G4 verifica: certificati emessi, `curl -I` su ogni host, redirect 308 corretti
- [ ] G5 `APP_URL` di `gdprhub` = `https://demo.legisboard.eu`, deploy, accesso provato sul nuovo host; aggiornati cancello e memoria

| Host | Tipo | Oggi | Dopo |
| --- | --- | --- | --- |
| `legisboard.eu` | A | `2.57.91.91` (parcheggio) | valore Vercel (atteso `216.198.79.1`, lo stesso di `axialoop.com`) |
| `www.legisboard.eu` | CNAME | `legisboard.eu.` | valore Vercel |
| `demo.legisboard.eu` | CNAME | — | valore Vercel |
| `legisboard.it` | A | `2.57.91.91` | valore Vercel |
| `www.legisboard.it` | CNAME | `legisboard.it.` | valore Vercel |

**Fase H — Dopo il cambio**
- [ ] H1 cancello contro `https://legisboard.eu` e `https://demo.legisboard.eu`, poi ripristino della demo
- [ ] H2 Search Console: verifica di dominio con record TXT via Hostinger. Serve il tuo account Google, quindi è un passo tuo
- [ ] H3 `LANDING_INDICIZZABILE=1` quando il footer ha i dati legali. In Italia la partita IVA va sulla home del sito d'impresa (art. 35 DPR 633/1972): **da confermare con il vostro consulente**. Poi invio della sitemap
- [ ] H4 `RICHIESTE_ATTIVE=1` quando esistono titolare, informativa e SMTP

---

## 8. Riuso

| Cosa | Dove |
| --- | --- |
| Catalogo e conteggi 42 / 65 / 64 | `CATALOGHI` in `packages/engine/src/index.ts` |
| Dati della demo per estratto e matrice | `CLIENTI_DIMOSTRATIVI`, `lettoDa`, `ETICHETTE_DOMINIO`, `formattaIt` (`@legisboard/engine`) |
| I due assi resi come nel prodotto | `Scadenza`, `StatoLavoroEtichetta`, `PastigliaDominio`, `Codice` da `components/stato.tsx` → `@legisboard/ui` |
| Nome e dominio | `PRODOTTO` in `apps/web/src/lib/brand.ts` |
| Blocchi demo | `assertNotDemo` in `features/auth/guards.ts`, `instance_config.mode` in `lib/db/schema/tenancy.ts` |
| Ripristino | `lib/db/demo-reset-cli.ts`, `seed-demo.ts` |
| Relay di posta | `lib/posta` (convenzione `SMTP_*`) |
| Cancello, sonde CLS e contrasto | `apps/web/scripts/gate-visivo.mjs` |
| Schemi da evalisdeck, metodo e non aspetto | `robots.ts`, `sitemap.ts`, `opengraph-image.tsx`, `components/seo/dati-strutturati.tsx` |

## 9. Verifica end-to-end

1. **Senza JavaScript** (`curl`): la landing dice tutto il suo messaggio, numeri compresi.
2. **Cancello Playwright** su landing, demo e prodotto: pagine interattive, nessun errore di
   console o di rete, focus visibile, CLS misurato, contrasto AA misurato col pixel.
3. **Lighthouse CI** mobile entro i bersagli; poi PageSpeed Insights sul dominio vero.
4. **Percorso commerciale completo** da un browser pulito: landing → demo con un clic → azione
   bloccata spiegata → CTA → modulo con motivo preselezionato → (con SMTP) mail ricevuta.
5. **Sicurezza**: intestazioni con `curl -I`; demo `noindex`; redirect 308 su tutti gli host.
6. **Dati strutturati**: validatore Schema.org e Rich Results Test, sapendo in anticipo quali
   rich result non arriveranno (§3.2).

## 10. Mancano, e li dà il committente

1. Titolare legale e partita IVA → footer, `/privacy`, `Organization`, indicizzazione, modulo
2. Relay SMTP → modulo e inviti del prodotto
3. Scelta del marchio fra i tre candidati di Social-Studio
4. Approvazione della copia di S1–S8 (la scrivo io, voce di PRODUCT.md: informa, non rassicura)
5. Crawler di addestramento ammessi sì o no (§3.3)
6. Eventuale collegamento di prenotazione per «Fissa un appuntamento»

## 11. Cosa questo piano non fa

- Non inventa loghi, icone o immagini: arrivano da Social-Studio.
- Non mette prezzi, testimonianze o loghi di clienti.
- Non tocca `middleware.ts`, `deploy/`, `controllo/`, `.github/`.
- Non accende il modulo senza titolare e informativa.
- Non cambia la direzione visiva del prodotto: oliva 110, Geist, «quieto».
