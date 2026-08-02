# Brief di forma — shell e tre schermate

Prodotto da `/impeccable shape`. Registro: **product**. Contesto: [`PRODUCT.md`](../PRODUCT.md).
`DESIGN.md` non esisteva: questo brief è ciò da cui nascerà.

Probe visivi saltati: questo harness non ha generazione di immagini nativa. La direzione si
fissa a parole e si verifica sulla pagina `/design`.

**Stato: confermato dal committente il 2026-08-02.** Da qui è nato `DESIGN.md`.

---

## 1. Cosa stiamo progettando

La shell dell'applicazione e le tre schermate su cui si regge il lavoro quotidiano di un
consulente della compliance: il **portafoglio** delle aziende assistite, il **cruscotto** di
una singola azienda sui tre decreti, e l'**assessment**, la tabella densa dei suoi
adempimenti. Da qui escono i token, il vocabolario di stato e il pattern di tabella che
valgono per tutto il resto del prodotto.

Un solo set di decisioni per tre moduli: è ciò che impedisce che GDPR, 231 e 81/08 sembrino
tre prodotti cuciti insieme.

## 2. L'azione primaria

**Capire in tre secondi cosa non regge.**

Non «esplorare i dati», non «gestire le attività». L'utente apre lo strumento con una domanda
già formata e vuole la risposta senza cercarla. Ogni decisione di layout si giudica su questo:
accorcia o allunga il tempo fra l'apertura della schermata e la risposta?

## 3. Direzione visiva

### Strategia di colore: Restrained

Neutri tinti, un accento sotto il 10% della pagina. È il default del registro product ed è
anche l'unica scelta compatibile con il vincolo di dominio: se il colore decora, non può più
segnalare.

**L'accento primario è inchiostro, non blu.** Le azioni primarie, la selezione e il focus
usano un grafite molto scuro a bassa croma, non un blu di servizio. Tre ragioni: lascia
completamente libero il canale cromatico per stato e dominio; evita il riflesso «pulsante
primario blu» che marca ogni SaaS; e appartiene al registro dell'inchiostro su carta, che è
il terzo riferimento di ancoraggio.

**Tre livelli di colore, con gerarchia rigida:**

| Livello                  | Canale                    | Dove                              |
| ------------------------ | ------------------------- | --------------------------------- |
| **Stato della scadenza** | rosso · ambra · verde     | riservato, mai altrove            |
| **Dominio**              | indaco · prugna · acciaio | **solo dove i tre convivono**     |
| **Prodotto**             | inchiostro                | azioni primarie, selezione, focus |

Il dominio compare nello scadenzario unificato, nel portafoglio e nella vista dei reati
presupposto. **Dentro il singolo modulo sparisce**: là il dominio è già dato dal contesto, e
ripeterlo è rumore che consuma attenzione.

Le tre tinte si separano anche in **luminosità**, non solo in tinta: è ciò che le tiene
distinguibili in deuteranopia, dove indaco, prugna e acciaio tenderebbero a collassare se
avessero lo stesso valore. Verifica obbligatoria al cancello della fase.

### Tema: chiaro, con scuro disponibile

Scena che lo forza: _un DPO in studio alle dieci del mattino, luce da finestra, due finestre
affiancate su un monitor da 24 pollici, che legge testo legale denso per sei ore e alla fine
stampa una relazione su carta._

Sei ore di lettura di testo denso e un documento finale su carta bianca: il chiaro non è
prudenza, è la conseguenza della scena. Lo scuro resta disponibile e va verificato a ogni
cancello, ma non è il predefinito. Il riflesso «strumento tecnico uguale scuro» qui è proprio
la trappola da evitare.

### Riferimenti di ancoraggio

- **Attio** — densità reale e tabella che regge centinaia di righe senza diventare illeggibile
- **Stripe Dashboard** — trattamento delle cifre e degli stati, sobrietà
- **Il registro catastale o di cancelleria** — non digitale, ed è il punto: intestazioni in
  maiuscoletto spaziato, filetti sottili, cifre allineate, nessuna ombra. È la fonte del
  registro tipografico e ciò che tiene il prodotto lontano dall'estetica «strumento tecnico»

### Tipografia

**IBM Plex Sans** per l'interfaccia, **IBM Plex Mono** per i codici degli adempimenti.

Plex ha cifre tabellari eccellenti, regge le dimensioni piccole senza impastarsi, e porta un
carattere istituzionale che Inter non ha: legge come documento, non come app. Il mono sui
codici (`T01`, `M47`, `S16`) non è vezzo, è un segnale: distingue l'identificatore dal testo
e allinea le colonne.

_Nota:_ `advisorhub`, altro progetto dello stesso committente, usa IBM Plex. La sovrapposizione
è accettata e dichiarata: palette, densità e registro sono diversi, e il font da solo non fa
identità. L'anti-riferimento esplicito in `PRODUCT.md` è EvalisDeck, che usa Geist.

Scala 1.2, fissa in rem, non fluida. Nessun font display nell'interfaccia.

**Il documento PDF è l'altro registro**: serif editoriale (**Newsreader**), margini ampi,
copertina. Il contrasto fra i due è deliberato, ed è il lusso del prodotto.

## 4. Perimetro di questo giro

- **Fedeltà:** pronto per la produzione
- **Ampiezza:** shell + tre schermate
- **Interattività:** componenti veri, non mockup
- **Intento:** si rifinisce finché non è spedibile, perché la Fase 6 costruisce direttamente
  sopra questi token

## 5. Strategia di layout

**Shell.** Sidebar sinistra collassabile e persistita, contenuto a piena larghezza fino a
1600px. La sidebar è il secondo livello di neutro (leggermente più freddo del contenuto),
non un pannello scuro: il tema è chiaro e la shell non fa eccezione.

**Portafoglio** — struttura da CRM. Una riga per azienda, tre colonne di modulo, ciascuna con
la sua conformità e il segnale di scadenza. La riga è interamente cliccabile. Nessuna griglia
di schede: 40 clienti in schede sono 40 schede da scorrere.

**Cruscotto azienda** — struttura da monitoraggio infrastrutturale, non da analytics. Tre
riquadri di stato affiancati, uno per modulo attivo, poi lo **scadenzario unificato** come
elemento dominante della pagina. Non è una pagina di grafici: è una pagina che dice cosa non
regge adesso. Gli indicatori stanno in una banda compatta in alto, mai come schede eroiche.

**Assessment** — tabella densa. **22 righe visibili** a 1440×900 senza scorrere: se ne
entrano otto è una dashboard, se ne entrano ventidue è uno strumento. Filtri sempre visibili
sopra la tabella, mai in un pannello modale, e persistiti nell'URL. Intestazioni di colonna
in maiuscoletto spaziato, filetti sottili fra le righe, nessuna zebratura.

**Il ritmo varia fra le tre.** Il portafoglio respira, il cruscotto si stringe verso lo
scadenzario, l'assessment è compatto e continuo. Stessa spaziatura ovunque sarebbe monotonia.

## 6. Il momento firmato: i due assi

È il pezzo su cui il prodotto si distingue, e la soluzione è questa.

**Lo stato del lavoro è un'etichetta. Lo stato della scadenza è la data stessa.**

```
CODICE  ADEMPIMENTO                    LAVORO        SCADENZA
T12     Nomina DPO art. 37             Completata    23/06/2026   -52gg
S01     DVR                            Completata    31/01/2027  +170gg
M47     Audit sicurezza art. 30        Da fare       20/01/2027  +159gg
S47     Visite Mediche Periodiche      Completata    09/09/2026   +26gg
T01     Registro trattamenti art. 30.1 Da fare       --
```

La scadenza **non ha una pastiglia**: ha una data, colorata secondo il suo stato, con i
giorni residui accanto in cifre tabellari. Il colore vive sul dato reale, non su un'etichetta
che lo descrive.

Perché funziona senza legenda: i due assi hanno **forma diversa oltre che posizione diversa**.
Una parola contro un numero. Impossibile confonderli, impossibile leggerne uno per l'altro.
E la riga `T12` dice a colpo d'occhio la cosa che nessun concorrente sa dire: _l'atto è stato
fatto, ed è scaduto da 52 giorni._

`--` significa nessuna scadenza da rispettare: presidio continuo, o mai programmato. Sono due
cose diverse e la colonna «Lavoro» le distingue.

**Provenienza.** Un adempimento letto da un altro modulo porta il codice del proprietario al
posto del proprio, in mono e con la tinta del dominio d'origine. Non un'icona da interpretare:
il codice stesso dice da dove viene, e il modulo lettore non lo può modificare.

## 7. Stati necessari

| Stato                         | Cosa deve vedere e sentire l'utente                                                      |
| ----------------------------- | ---------------------------------------------------------------------------------------- |
| **Predefinito**               | Le 22 righe, l'ordine per urgenza, i filtri già visibili                                 |
| **Vuoto, primo uso**          | «Nessuna azienda in portafoglio» con l'azione di creazione, non un vuoto grigio          |
| **Vuoto, filtro senza esiti** | Dice quale filtro sta escludendo tutto, e offre di toglierlo                             |
| **Trend senza storico**       | Un empty state onesto: «Lo storico parte da oggi». **Mai** un andamento inventato        |
| **Caricamento**               | Scheletro della tabella con le colonne al loro posto, mai una rotella al centro          |
| **Errore**                    | Cosa è fallito e cosa fare, in italiano, senza codici di sistema                         |
| **Modulo non attivo**         | Dice che il modulo esiste e non è attivo per questa azienda, con chi può attivarlo       |
| **Sola lettura (viewer)**     | I comandi non ci sono, non sono grigi: un pulsante disabilitato invita a cercare il modo |
| **Adempimento delegato**      | Visibile ma non modificabile, con l'origine dichiarata e il collegamento al proprietario |

## 8. Modello di interazione

- **Filtri persistenti nell'URL.** Un consulente manda a un collega il link di «tutto lo
  scaduto sul cliente Verdi» e arriva la stessa vista.
- **La riga è il bersaglio.** Clic sulla riga apre il pannello di dettaglio laterale, non una
  pagina nuova: si perde il contesto della lista.
- **Impostare l'ultima esecuzione ricalcola la scadenza sotto gli occhi**, prima di salvare.
  È il gesto centrale del prodotto e deve mostrare il suo effetto.
- **⌘K** per saltare a un cliente, un adempimento o un articolo di norma.
- Movimento 150-250 ms, solo per cambio di stato. Nessuna coreografia in ingresso.

## 9. Contenuti e microcopy

Italiano professionale, terminologia esatta di ciascun decreto, formattazione `it-IT`.

Il **lessico è per dominio**, il modello dati no: il DPO legge «controlli», l'OdV «flussi
informativi», l'RSPP «scadenze e nomine». Vive in `lessico.ts` insieme alle etichette dei due
profili di istanza.

Nessun termine inglese gratuito. Nessuna emoji. Nessun «Bentornato».

## 10. Da dove prendiamo il materiale

| Fonte                                 | Cosa                                                                                  | Licenza |
| ------------------------------------- | ------------------------------------------------------------------------------------- | ------- |
| **shadcn/ui blocks**                  | base dei componenti, già nello stack                                                  | gratis  |
| **TanStack Table**                    | filtri a faccette, visibilità colonne, stato URL                                      | gratis  |
| **Tremor**                            | grafici del cruscotto, in Fase 10                                                     | gratis  |
| **Origin UI**                         | componenti puntuali dove shadcn è scarno                                              | gratis  |
| **next-shadcn-admin-dashboard** (MIT) | **solo struttura**: CRM → portafoglio, Infrastructure → cruscotto, Tasks → assessment | MIT     |

Del template si prendono la configurazione di TanStack Table e l'impianto della shell.
**Nient'altro**: le sue dashboard sono demo impaginate per lo screenshot, e il nostro valore
sta nei due assi e nei tre domini, che nessuna di quelle schermate ha.

## 11. Riferimenti impeccable utili in costruzione

`spatial-design.md` per il ritmo fra le tre schermate · `typography.md` per la scala e le
cifre tabellari · `color-and-contrast.md` per la terna in deuteranopia · `interaction-design.md`
per i filtri e il pannello di dettaglio · `onboard.md` per gli empty state.

## 12. Questioni aperte per la costruzione

1. I **valori OKLCH esatti** della terna: si fissano provando il contrasto, non a tavolino.
2. **Altezza di riga** per arrivare a 22 righe senza comprimere il testo: si misura sulla
   pagina `/design`.
3. **Pannello di dettaglio**: laterale a scomparsa o colonna fissa a destra sugli schermi larghi.
4. Il **filetto sotto le intestazioni** in stile registro rischia di diventare rumore a 22
   righe: da provare con e senza.
