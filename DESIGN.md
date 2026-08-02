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
| 3 · Prodotto             | inchiostro                | azioni primarie, selezione, focus |

**L'accento primario è inchiostro, non blu.** Lascia libero il canale cromatico per stato e
dominio, evita il riflesso «pulsante primario blu», e appartiene al registro dell'inchiostro
su carta. Nessun pulsante blu in tutto il prodotto.

**Il dominio sparisce dentro il modulo.** Compare nello scadenzario unificato, nel portafoglio
e nella vista dei reati presupposto. Dentro il modulo 81/08 il dominio è già dato dal
contesto: ripeterlo è rumore.

**La priorità non usa colore.** Userebbe rosso per «Critica» e competerebbe con «Scaduta». Si
distingue per peso tipografico e per punti di ampiezza crescente, leggibili anche in bianco e
nero.

Neutri tinti verso l'inchiostro (hue 262) con croma **sotto 0.01**: oltre, il grigio inizia a
leggersi come azzurro. Mai `#fff`, mai `#000`.

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

**IBM Plex Sans** per l'interfaccia, **IBM Plex Mono** per i codici degli adempimenti.

Plex ha cifre tabellari eccellenti, regge le dimensioni piccole senza impastarsi, e porta un
carattere istituzionale: legge come documento, non come app. Il mono sui codici (`T01`, `M47`,
`S16`) distingue l'identificatore dal testo e allinea le colonne.

- Scala 1.2, fissa in rem, mai fluida. Nessun font display nell'interfaccia.
- `font-variant-numeric: tabular-nums` sul `body`, non solo nelle tabelle.
- Intestazioni di colonna: 11px, 600, `letter-spacing 0.07em`, maiuscolo. È il segnale del
  registro catastale e costa zero in altezza.
- Testo lungo entro 70ch. Tabelle e dati possono andare oltre.

**Il documento PDF è l'altro registro**: serif editoriale (Newsreader), margini ampi,
copertina. Il contrasto fra i due è deliberato ed è il lusso del prodotto.

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

Filetti sottili fra le righe (`--border-subtle`), **nessuna zebratura**, filetto forte solo
sotto le intestazioni. Il ritmo varia fra le schermate: il portafoglio respira, il cruscotto
si stringe verso lo scadenzario, l'assessment è compatto e continuo.

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

- Raggi contenuti: `--radius-sm` 4px, `--radius` 6px, `--radius-lg` 8px. Il registro è il
  documento, non la carta di credito.
- Ombre fredde e discrete. **Mai bagliori colorati.**
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

- Nessun **pulsante primario blu**: l'accento è inchiostro.
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
