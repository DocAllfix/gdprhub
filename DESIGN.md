# DESIGN.md

Registro di design vincolante. I token vivono in `apps/web/src/app/globals.css`.
Origine: [`docs/03-brief-di-forma.md`](docs/03-brief-di-forma.md), confermato dal committente
il 2026-08-02. Vetrina di controllo: `/design`.

**Regola non negoziabile: nessun colore, raggio o ombra scritto a mano nei componenti.**
Se un valore serve e non c'è nei token, si aggiunge ai token.

## Direzione

Uno strumento professionale denso e silenzioso. L'autorevolezza sta nella precisione —
allineamenti, cifre tabellari, formattazione `it-IT` senza eccezioni — mai nella decorazione.

Riferimenti di ancoraggio: **Attio** per la densità e la tabella, **Stripe Dashboard** per il
trattamento delle cifre, **il registro catastale** per il registro tipografico. Il terzo non è
digitale, ed è il punto: tiene il prodotto lontano dal riflesso «strumento tecnico uguale
scuro».

## Gerarchia del colore

Tre livelli, rigidi. Strategia **Restrained**: neutri tinti, accento sotto il 10%.

| Livello                  | Canale                    | Dove                              |
| ------------------------ | ------------------------- | --------------------------------- |
| 1 · Stato della scadenza | rosso · ambra · verde     | **riservato**, mai altrove        |
| 2 · Dominio              | indaco · prugna · acciaio | **solo dove i tre convivono**     |
| 3 · Prodotto             | **oliva, hue 110**        | barra laterale, azioni primarie, selezione, focus |

**Il colore del prodotto è oliva, hue 110, e la scelta è stata fatta guardando.** Fino al
2026-08-03 era un inchiostro blu-navy a hue 262. Il committente lo ha rifiutato, e aveva
ragione per un motivo che vale la pena scrivere: il navy scuro è il riflesso numero uno del
software gestionale — Linear, Vercel, mezzo settore — e soprattutto è `sistemacommercialisti`,
progetto dello stesso studio, che sta a hue 250. Due strumenti dello stesso committente non
devono sembrare lo stesso strumento.

**Perché proprio 110, e non un'altra tinta.** Sei tinte sono già impegnate e significano
qualcosa: rosso 26, ambra 67, verde 153, acciaio 228, indaco 273, prugna 342. Tagliano il
cerchio in sei spicchi, e dentro uno spicchio si può stare solo al centro, perché ai bordi la
colonna comincia a somigliare a un segnale. Gli spicchi utilizzabili sono tre soli:

| Fra       | Centro          | Esito                                                        |
| --------- | --------------- | ------------------------------------------------------------ |
| 67 → 153  | **110, oliva**  | 43° per parte: il più largo del cerchio. **Scelto.**          |
| 273 → 342 | 307, melanzana  | 34° per parte. Valido, scartato dal committente.              |
| 342 → 26  | 4, bordeaux     | 22° per parte: troppo stretto per convivere con «scaduta».    |
| 153 → 228 | 190, ottanio    | è l'accento di `sistemacommercialisti`. Bruciato in partenza. |
| 228 → 273 | 250, navy       | il colore rifiutato.                                          |
| 26 → 67   | 46, arancio     | troppo vicino all'ambra.                                      |

**Il prezzo, e va tenuto d'occhio.** In questo prodotto il verde significa già «regolare», e
lo dice in ogni riga di ogni tabella. Le due tinte non si confondono — la colonna sta a croma
**0,030** e «regolare» a **0,115**, con quaranta gradi di distanza — ma è una convivenza
permanente. **La croma della barra non si alza senza rifare questa verifica**: sopra circa
0,05 comincia a dire qualcosa che non deve dire.

**Un solo inchiostro, non due.** Barra laterale e pulsanti pieni portano la stessa oliva. Sul
tema scuro il primario si inverte in luce, perché una pastiglia scura su fondo notte non
stacca: sono due soluzioni allo stesso problema, e la risposta giusta cambia col fondo.

**Il dominio sparisce dentro il modulo.** Compare nello scadenzario unificato, nel portafoglio
e nella vista dei reati presupposto. Dentro il modulo 81/08 il dominio è già dato dal
contesto: ripeterlo è rumore.

**La priorità non usa colore.** Userebbe rosso per «Critica» e competerebbe con «Scaduta». Si
distingue per peso tipografico e per punti di ampiezza crescente, leggibili anche in bianco e
nero.

Neutri tinti verso l'oliva (hue 110) con croma **sotto 0.01**: oltre, il grigio inizia a
leggersi come colore. Mai `#fff`, mai `#000`. La carta che ne esce è **avorio**, non
bianco-azzurro d'ufficio, ed è deliberato: se si cambia la tinta della colonna e si lasciano i
grigi dov'erano, la colonna sembra incollata sopra la pagina di qualcun altro.

## Forma: «quieto»

Scelta dal committente confrontando tre schemi sulle stesse otto schermate. La domanda era
**come si stacca un pannello dal fondo**, e le risposte possibili erano tre: il filetto, la
superficie, la fascia di testata.

**Il pannello si stacca per superficie, non per filetto.** La classe `.pannello` non ha bordo.
Sul buio la scala a quattro gradini fa il lavoro da sola e un'ombra non si vedrebbe — non c'è
luce da bloccare; sul chiaro serve un'ombra minima, perché carta su carta senza un accenno di
rilievo si appiattisce. Le due cose sono la stessa dichiarazione: `--shadow-sm` vale zero sul
tema scuro.

**Raggi larghi** (`--radius-xl: 1.125rem` sui pannelli). Un riquadro senza bordo con angoli
stretti sembra una macchia: l'angolo è ciò che dice «questa è una cosa» quando la linea non
c'è più.

**Il rilievo si fa salendo di un gradino**, non marcando il bordo. Una scheda che deve pesare
di più usa `bg-surface-raised`, non `border-border-strong`.

**Chi ha bisogno del filetto se lo mette da sé**: campi, pastiglie, comandi. `.pannello` è per
i contenitori, che sono quelli che bordati tutti facevano reticolo.

**Il costo, dichiarato.** Quieto è lo schema più calmo dei tre e il più adatto a una sessione
lunga, ma l'aria costa righe: nella tabella densa se ne vedono circa quattordici in 900px
contro le ventuno di uno schema a zebratura. È il compromesso scelto consapevolmente.

## Tema

**Chiaro predefinito, scuro disponibile.** La scena che lo forza: _un DPO in studio alle dieci
del mattino, luce da finestra, due finestre affiancate su un monitor da 24 pollici, che legge
testo legale denso per sei ore e alla fine stampa una relazione su carta._

Meccanica: `:root` porta i token chiari, `:root[data-theme="dark"]` quelli scuri, e uno script
sincrono in `layout.tsx` stampa l'attributo **prima del disegno**. La scelta esplicita
dell'utente vince sempre sulla preferenza di sistema, in entrambe le direzioni.

**Non usare `light-dark()`**: Lightning CSS lo trasforma in un valore non valido quando sta
dentro una variabile personalizzata, e il risultato è un fondo trasparente. Trovato dal
cancello visivo, documentato qui perché non si ritenti.

## Tipografia

**Geist** per l'interfaccia, **Geist Mono** per codici, date e cifre grandi. Scelti dal
committente confrontando tre registri tipografici sulle stesse schermate.

Geist è un neo-grottesco stretto e neutro che regge la tabella da sessantaquattro righe senza
impastarsi. **IBM Plex è uscito** perché è il carattere di IBM e si riconosce: chi l'ha già
visto altrove non lo legge come nostro.

**Il mono non è decorazione, ed è la firma.** Ci vanno tre cose e solo quelle:

1. i codici degli adempimenti (`T01`, `M47`, `S16`), dove distingue l'identificatore dal testo;
2. date e giorni residui, che sono colonne di numeri;
3. **le cifre grandi** al centro di ogni scheda (`.cifra`, `.titolo`).

Il terzo punto è la scelta che si nota: un numero grande in mono dice «dato misurato» invece
di «titolo di marketing», e le larghezze fisse allineano una colonna di numeri da sole, senza
che un valore che cambia faccia ballare la riga accanto.

**Il serif editoriale è uscito dall'interfaccia.** Newsreader su `.titolo` e `.cifra` legava
bene alla perizia stampata, ma portava un terzo carattere e un registro che con Geist litiga.
Resta nel PDF, dove è al suo posto.

- Scala 1.2, fissa in rem, mai fluida. Nessun font display nell'interfaccia.
- `font-variant-numeric: tabular-nums` sul `body`, non solo nelle tabelle.
- **Intestazioni di colonna in tondo**, 12px, peso 500, nessuna spaziatura. Il maiuscoletto
  spaziato è il registro dello schema «filetto»: in una pagina senza linee e con tanta aria è
  l'unica cosa che alza la voce, e si sente.
- Testo lungo entro 70ch. Tabelle e dati possono andare oltre.

**Il documento PDF è l'altro registro**: serif editoriale (Newsreader), margini ampi,
copertina. Il contrasto fra i due è deliberato ed è il lusso del prodotto. Il PDF **non** ha
seguito il cambio a Geist: se un giorno deve farlo, è una passata di `incorpora-font.mjs` e i
quattro prototipi da riapprovare.

## Il documento

Registro editoriale, in `src/lib/documenti/`. Prototipi su `/design`, cancello
`pnpm prototipi`. **Il documento è sempre chiaro: è carta, non esiste un PDF in tema scuro.**

Tre gesti che la schermata non ha, e che tengono i due registri separati:

1. **Colonna di marginalia.** Numero di sezione e riferimento normativo fuori dalla colonna
   di testo. È il fascicolo istruttorio, e nell'applicazione non c'è.
2. **Impaginazione nostra, non del browser.** Ogni pagina è un blocco 210×297 mm: nessuna
   intestazione di categoria orfana, nessuna riga spezzata, «Pagina 3 di 12» esatta. Su un
   atto consegnato a un'autorità la numerazione è una garanzia di integrità.
3. **Il colore è il secondo canale, mai il primo.** Ogni scadenza porta la parola oltre alla
   data colorata: il consulente stampa in bianco e nero, e l'ispettore legge quello.

**Font incorporati, sempre.** Sei tagli latini in `font-incorporati.ts`, generati da
`pnpm font:incorpora` e verificati in CI. Il Chromium serverless non ha caratteri di
sistema: un documento che si fida della macchina si stampa diverso su ogni computer, e
quello del cliente è il computer su cui non abbiamo alcun controllo.

**Ogni nuova rotta che genera PDF va aggiunta a `outputFileTracingIncludes`** in
`next.config.ts`, con una chiave **glob** (`/prototipi/**`, non `/prototipi/[documento]`:
le parentesi quadre valgono come classe di caratteri). `pnpm pdf:traccia` lo verifica dopo
la build: senza, la build resta verde e la rotta risponde 500 solo in produzione.

## Densità

**22 righe visibili a 1440×900** nell'assessment. Se ne entrano otto è una dashboard, se ne
entrano ventidue è uno strumento. Altezza di riga in `--riga-h` (2.25rem): se cambia, si
rimisura la tabella.

Separazione fra le righe con `--border-subtle`, che nello schema «quieto» è un filetto appena
percettibile e non un reticolo. **Nessuna zebratura**: è stata valutata come alternativa
(recupera un terzo dello schermo) e scartata perché è un espediente vecchio e si vede.

Il ritmo varia fra le schermate: il portafoglio respira, il cruscotto si stringe verso lo
scadenzario, l'assessment è compatto e continuo.

## I due assi

Il momento firmato. Componenti in `src/components/stato.tsx`.

**Lo stato del lavoro è un'etichetta. Lo stato della scadenza è la data stessa.**

```
LAVORO        SCADENZA
Completata    23/06/2026  −40gg
Da fare       20/01/2027  +159gg
In corso      09/09/2026  +26gg
Da fare       —
```

La scadenza non porta una pastiglia: porta la data, colorata, con i giorni residui accanto in
cifre tabellari. Il colore vive sul dato reale, non su un'etichetta che lo descrive.

Funziona senza legenda perché i due assi hanno **forma diversa oltre che posizione diversa**:
una parola contro un numero. `—` significa nessuna scadenza da rispettare, e la colonna del
lavoro distingue fra presidio continuo e mai programmato.

**Provenienza**: un adempimento letto da un altro modulo porta il codice del proprietario con
la tinta del dominio d'origine. Il codice stesso dice da dove viene, senza icone da
interpretare.

## Forma, elevazione, movimento

- Raggi larghi, perché lo schema è «quieto» e il pannello non ha bordo: `--radius-sm` 8px,
  `--radius` 10px, `--radius-lg` 14px, `--radius-xl` 18px. Un riquadro senza filetto con
  angoli stretti sembra una macchia.
- Ombre discrete e **solo sul tema chiaro**: sul buio valgono zero, perché non c'è luce da
  bloccare e un'ombra su fondo scuro produce l'alone sporco del tema chiaro riverniciato.
  **Mai bagliori colorati.**
- Le schede si usano solo dove sono l'affordance giusta. **Mai schede annidate.** Per elenchi
  di clienti o adempimenti si usa la tabella: quaranta clienti in quaranta schede sono
  quaranta schede da scorrere.
- Movimento 150-250 ms, solo per cambio di stato. Nessuna coreografia in ingresso.
  `prefers-reduced-motion` rispettato a livello di `@layer base`.

## Accessibilità

- WCAG 2.1 AA: contrasto minimo 4.5:1 sul testo, in **entrambi** i temi.
- **Focus sempre visibile**: `outline` 2px su `--ring`, `outline-offset` 2px. Non negoziabile.
- **Il colore non è mai l'unico canale**: ogni stato porta sempre un'etichetta testuale, anche
  quando è solo per lettori di schermo (`sr-only` sullo stato della scadenza).
- I tre accenti di dominio si separano in **tinta e in luminosità**: in deuteranopia le tinte
  collassano verso il blu, e resta il valore a distinguerli.
- Numeri, valute e date `it-IT`.

## Divieti

Oltre a quelli generali della skill `impeccable`:

- Nessun **pulsante primario blu**: l'accento è oliva, hue 110. Il navy è il colore che il
  committente ha rifiutato, ed è anche quello del progetto gemello: non ci si torna.
- Nessun **bordo laterale colorato** come accento su schede, righe o avvisi.
- Nessun **testo in gradiente**, nessun **glassmorphism**, nessuna **emoji**.
- Nessun **grande numero eroico** in scheda: gli indicatori stanno in una banda compatta.
- Nessuna **griglia di schede identiche** dove serve una tabella.
- Nessun **dato inventato**: se lo storico non c'è, si mostra un empty state onesto. Mai un
  andamento generato.
- Nessun **colore di dominio** dentro il modulo che gli appartiene.

## Verifica

Ogni schermata nuova entra in `apps/web/scripts/pagine.mjs` **nella stessa fase in cui viene
scritta**, e passa `node scripts/gate-visivo.mjs`: clic su ogni elemento azionabile, console e
rete sorvegliate, collegamenti interni verificati, focus visibile, 3 larghezze × 2 temi.

Il cancello confronta anche **il fondo dei due temi**: se coincidono, il tema scuro non è
applicato e boccia. Al primo giro passava verde su una pagina in cui il tema scuro non
esisteva.

Le pagine protette si dichiarano `autenticata: true` e il cancello apre **una sola** sessione
riusandone i cookie: l'autenticazione ha un limitatore di frequenza, e ventiquattro accessi in
fila lo fanno scattare. Fra i pulsanti cliccati c'è anche «Esci», che deve funzionare: il
cancello se ne accorge, rimette i cookie e prosegue.

Dopo il cancello si esegue **`pnpm db:demo-reset`**: cliccare ogni pulsante significa anche
attivare e disattivare moduli, e i dati della vetrina vanno rimessi come li troverà il
committente.

## Regole imparate sul campo

Nessuna di queste è teoria: ognuna corrisponde a un difetto che è passato per la build verde.

- **Un modulo azzerato da un errore di validazione è un difetto.** React resetta il form
  quando l'azione ritorna, anche con un errore: i valori vanno rimandati indietro dall'azione
  e riletti come `defaultValue`. Senza, chi sbaglia una cifra della partita IVA riscrive tutto.
- **«In regola» in verde si dice solo quando è vero.** Un'azienda appena creata ha zero
  scadenze mancate perché non ha ancora nulla di programmato: quella non è conformità, è un
  presidio mai avviato, e va detto con parole e colore neutri.
- **L'origine dell'autenticazione va dichiarata.** `APP_URL` deve coincidere con l'origine da
  cui il browser raggiunge l'istanza, altrimenti la risposta è 403 «Invalid origin». Su Vercel
  il dominio di produzione non è quello del singolo deploy: entrambi vanno fra le origini
  attendibili.

Attributi `data-tour` sugli elementi che i tour guidati indicheranno: **si scrivono insieme al
componente**, non dopo.
