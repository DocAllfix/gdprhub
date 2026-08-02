# Politica di scoring

Ogni numero prodotto dal motore, e ogni scostamento voluto dai tre prototipi di partenza.

Regola: **nessun valore golden si cambia per far passare un test.** Se un numero cambia, prima
si aggiorna questo documento con la ragione, poi si tocca `packages/engine/src/golden.test.ts`.

Riferimenti: [`01-analisi-prototipo.md`](01-analisi-prototipo.md) ·
[`02-addendum-modello-per-istanza.md`](02-addendum-modello-per-istanza.md).

---

## 1. Il modello a due assi

I tre prototipi confondevano due informazioni diverse in un solo campo `stato`. Qui sono separate.

|                          | Chi lo decide                | Valori                                            |
| ------------------------ | ---------------------------- | ------------------------------------------------- |
| **Stato del lavoro**     | una persona, ed è persistito | Da fare · In corso · Completata · Non applicabile |
| **Stato della scadenza** | la data, ed è derivato       | Regolare · In scadenza · Scaduta · Da programmare |

Un adempimento **«Completata» e «Scaduta»** è una situazione reale e frequente: il documento fu
redatto, il ciclo è scaduto. Nessuno dei tre prototipi sapeva esprimerla, e questo produceva dati
impossibili: nel GDPR T14, R04 e D04 erano marcati «In ritardo» con scadenza futura; nel 231 la
stessa cosa con cinque «Scaduto» e tre «In ritardo» sovrapposti.

## 2. Ricorrenza: la scadenza si deriva, non si scrive

Semantica presa dal prototipo 81/08, l'unico dei tre che modellasse davvero la ricorrenza, ed
estesa a tutti i domini.

```
periodica    scadenza = ultimaEsecuzione + N mesi      (mai eseguito ⇒ nessuna scadenza)
evento       scadenza = quella esplicita
una tantum   scadenza = quella esplicita
continua     nessuna scadenza: è un presidio permanente, si sorveglia
```

Conseguenze volute:

- Il campo `frequenza` del GDPR, che nel prototipo esisteva senza produrre nulla, ora governa
  davvero le scadenze.
- Le date assolute del 231 (ottobre 2025 – maggio 2026) sono diventate scostamenti: il cliente
  dimostrativo non invecchia più. Test dedicato in `catalog.test.ts`.
- **`piuMesi` arretra al giorno valido** quando il mese di arrivo è più corto: il 31 gennaio più
  un mese scade il 28 febbraio, non il 3 marzo. L'aritmetica ingenua di JavaScript sposterebbe la
  scadenza _in avanti_, cioè nella direzione sbagliata per uno strumento di compliance.
- **Nessun calcolo su millisecondi.** Si confrontano date di calendario, quindi le due notti del
  cambio d'ora non entrano mai in gioco. Tutti e tre i prototipi dividevano per 86.400.000.

## 3. Tre metriche di conformità, tre nomi

I prototipi usavano due formule diverse chiamandole entrambe «compliance»: l'81/08 contava i
regolari, GDPR e 231 i completati. Nella stessa relazione avrebbero significato cose diverse.

| Funzione              | Numeratore                | Risponde a                                              |
| --------------------- | ------------------------- | ------------------------------------------------------- |
| `conformitaLavoro`    | Completata                | «di quello che c'è da fare, quanto è fatto?»            |
| `conformitaScadenze`  | Regolare                  | «di quello che c'è da presidiare, quanto è aggiornato?» |
| `conformitaEffettiva` | Completata **e** Regolare | «cosa regge davanti a un ispettore?»                    |

`conformitaEffettiva` è la metrica di riferimento del prodotto. I presidi continui, che per natura
non hanno scadenza, contano se completati.

**Denominatore**: gli applicabili, cioè tutti tranne i «Non applicabile». Senza questa esclusione
un'azienda senza cantieri risulterebbe inadempiente sul PSC. Nei prototipi l'esclusione non era
possibile e ogni percentuale era falsata verso il basso.

**Con zero applicabili la percentuale è `null`, non 100.** Un 100% su un assessment vuoto è
esattamente il genere di numero che finisce in una relazione per il CdA senza che nessuno lo guardi.

## 4. Rischio

- Solo il catalogo GDPR esprime un rischio 1-10. Nel 231 e nell'81/08 **si deduce dalla priorità**
  (Critica 9 · Alta 7 · Media 5 · Bassa 3). Trattarlo come zero renderebbe quei due domini
  artificialmente innocui rispetto al GDPR.
- Pesi di priorità: Critica 1.5 · Alta 1.2 · Media 1.0 · **Bassa 0.8**. I primi tre vengono dal
  prototipo GDPR; «Bassa» non esisteva lì e il valore è nostro.
- `rischioPesato` somma su **ciò che va presidiato**, che include i completati ma scaduti o in
  scadenza. Il prototipo sommava sui soli non completati e perdeva proprio ciò che va rifatto.

### Matrice rischio × priorità

Nel prototipo GDPR l'intensità di colore era `(riga + colonna) / 6`: dipendeva dalla **posizione**,
non dai dati. La colonna 4 era strutturalmente sempre vuota (i pesi di priorità arrivavano a 3) e
la riga 0 pure (il rischio minimo nel catalogo è 4): restava una griglia 3×3 utile su 16 celle.

Qui: righe = fasce di rischio (1-3 · 4-6 · 7-8 · 9-10), colonne = le quattro priorità, tutte
raggiungibili. L'intensità è il peso della cella rapportato alla più carica.

**Non è una matrice probabilità × impatto**, e la relazione non deve chiamarla così: i dati non
contengono una stima di probabilità, e inventare quell'asse sarebbe un falso.

## 5. Indice di esposizione, al posto della cifra inventata

Il prototipo calcolava `ritardi × 12.500 € + critici × 22.000 € + rischio × 850 €` e presentava il
risultato come «esposizione sanzionatoria» in un documento destinato al CdA e all'OdV. Nessuno dei
tre coefficienti ha una fonte. Sul dataset di esempio produceva **636.515 €**, con un «range
prudenziale» ottenuto moltiplicando per 0,6 e 1,8.

L'indice che lo sostituisce è **0-100, relativo, e non pretende di essere denaro**:

```
indice = 100 × (0,55 · rischioScoperto + 0,25 · ritardo + 0,20 · criticità)
```

Ogni componente è una quota fra 0 e 1, i pesi sono espliciti e sommano a 1, e la funzione
restituisce **sempre** componenti e numeri grezzi. Un numero che non sa spiegarsi non è difendibile.

Fasce di giudizio: Contenuta < 25 · Moderata < 50 · Elevata < 75 · Critica ≥ 75.

## 6. Prontezza ispettiva

Formula del prototipo: `max(20, 100 − ritardi × 8 − (100 − compliance) / 2)`. Sul suo stesso dataset
dava **−8**, schiacciato dal pavimento a 20: il numero mostrato non aveva più rapporto con i dati.

```
prontezza = 100 × (0,4 · conformitaEffettiva + 0,4 · presidiChiave + 0,2 · puntualità)
```

Tutte quote fra 0 e 1: il risultato sta naturalmente fra 0 e 100 e non ha bisogno di essere tosato.
`presidiChiave` sono gli adempimenti che un ispettore chiede per primi, dichiarati per dominio in
`PRESIDI_CHIAVE`. La funzione restituisce anche **quali** presidi chiave non reggerebbero.

## 7. Sanzioni: tre metodologie, mai sommabili

| Dominio | Metodo                                                                                                                                              | Chi risponde           |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| GDPR    | **EDPB Guidelines 04/2022**: massimo edittale → punto di partenza per gravità → riduzione dimensionale → circostanze art. 83.2 → verifica del tetto | l'ente                 |
| 231     | **artt. 10-12 D.Lgs 231/2001**: numero di quote × valore della quota, riduzioni art. 12 con tetto di 103.291 €                                      | l'ente                 |
| 81/08   | **Titolo XII**: contravvenzioni, arresto o ammenda                                                                                                  | le **persone fisiche** |

Tre regole comuni:

1. **Senza i dati non si calcola.** GDPR e 231 pretendono il fatturato: senza, la metodologia non è
   applicabile e la funzione solleva un errore invece di inventare un numero.
2. **Ogni stima stampa metodo, passi e assunzioni**, perché finiscano nella relazione accanto alla cifra.
3. **Le tre cifre non si sommano.** Quelle dell'81/08 colpiscono persone fisiche, non l'azienda:
   presentarle insieme come «esposizione totale» sarebbe fuorviante.

Il 231 avverte sempre delle **sanzioni interdittive** dell'art. 9 comma 2, che non sono
monetizzabili e per molte imprese pesano più della sanzione pecuniaria.

L'81/08 segnala le violazioni rilevanti ex **art. 25-septies**: da esse può discendere la
responsabilità dell'ente, ed è il collegamento cross-dominio più pesante della suite.

## 8. Scadenzario unificato

- Attraversa i tre decreti in una lista sola, ordinata per giorni residui; a parità di giorni
  decide la priorità, poi dominio e codice solo per determinismo.
- I **presidi continui restano fuori**: riempirebbero l'agenda di righe che nessuno può chiudere
  entro una data. Vivono in un elenco separato (`senzaScadenza`).
- Il **complessivo di un'azienda si calcola sull'insieme unito**, non come media delle percentuali
  dei tre moduli: una media pesarebbe allo stesso modo un dominio da 42 adempimenti e uno da 65, e
  basterebbe disattivare un modulo per far salire il numero.

---

## 9. I golden, con il conto che li spiega

Data di riferimento fissa: **2026-08-14**. Test in `packages/engine/src/golden.test.ts`.

### GDPR — coincide col prototipo

| Valore                | Numero                                                |
| --------------------- | ----------------------------------------------------- |
| Conformità del lavoro | **21%** (9/42)                                        |
| Per ruolo             | Titolare **20%** · Responsabile **30%** · DPO **17%** |
| Stati di lavoro       | Da fare 23 · In corso 10 · Completata 9               |

### GDPR — scostamenti, con il conto

| Valore                | Prototipo          | Motore                     | Perché                                                                                                                    |
| --------------------- | ------------------ | -------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Scadute               | 9 «In ritardo»     | **4** (T11, T12, D01, D09) | T14, R04, D04 avevano scadenza futura (dato impossibile); T01, T04, R01 sono presidi **continui**, che non hanno scadenza |
| Rischio pesato        | 305,9              | **325,1**                  | 305,9 + 12,0 (T12: completato ma scaduto) + 7,2 (T16: completato ma in scadenza)                                          |
| Critici da presidiare | 12                 | **13**                     | i 12 aperti, più T12 completato con scadenza mancata                                                                      |
| Esposizione           | 636.515 €          | **72/100, Elevata**        | rischio scoperto 0,90 · ritardo 0,10 · criticità 1,00                                                                     |
| Prontezza             | 20 (da −8, tosato) | **25**                     | 8 presidi chiave su 8 scoperti                                                                                            |
| Conformità effettiva  | non esisteva       | **17%**                    | richiede fatto **e** aggiornato                                                                                           |

### 231

| Valore                | Numero                                    | Nota                                                                                                                                                       |
| --------------------- | ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Conformità del lavoro | **0%** (0/65)                             | Il prototipo sembrava averne uno completato: quella corrispondenza stava **fuori** dall'array dei dati, nello stato iniziale della finestra di inserimento |
| Stati di lavoro       | Da fare 56 · In corso 9                   | I cinque stati del prototipo si normalizzano su quattro                                                                                                    |
| Stati di scadenza     | Regolare 26 · In scadenza 19 · Scaduta 20 | Da date assolute a scostamenti                                                                                                                             |
| Esposizione           | **83/100, Critica**                       | rischio scoperto 1,00: nessun presidio in piedi                                                                                                            |
| Presidi chiave pronti | **0 su 6**                                |                                                                                                                                                            |

### 81/08

| Valore                | Numero                                                        | Nota                                                                                                      |
| --------------------- | ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Conformità del lavoro | **84%** (54/64)                                               |                                                                                                           |
| Conformità effettiva  | **44%**                                                       | **Qui si vede il valore dei due assi**: 12 documenti redatti sono scaduti e 10 non sono mai stati avviati |
| Stati di scadenza     | Regolare 28 · In scadenza 14 · Scaduta 12 · Da programmare 10 | Tutti e quattro coperti                                                                                   |
| Critici               | **0**                                                         | Il catalogo 81/08 si ferma ad Alta: non è un difetto                                                      |
| Rischio pesato        | **252,2**                                                     | Dedotto dalla priorità, il catalogo non esprime il rischio                                                |
| Esposizione           | **35/100, Moderata**                                          |                                                                                                           |

### Suite

171 adempimenti · agenda unificata di **114** voci con scadenza · conformità complessiva **20%**.

---

## 10. Debiti noti

| Cosa                                                                                                                                                  | Dove si chiude      |
| ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| I ruoli dell'81/08 sono 29 stringhe libere del prototipo («Datore di Lavoro / RSPP», «VVF / Formatore»): vanno normalizzati su una tassonomia         | F3, con il seed     |
| Le fattispecie sanzionatorie 81/08 coprono tre adempimenti cardine, non tutto il Titolo XII                                                           | F15                 |
| Gli importi delle ammende 81/08 sono soggetti a rivalutazione con decreto direttoriale: vanno versionati come i parametri delle altre due metodologie | F3                  |
| Il catalogo `reato_presupposto` e i collegamenti `obligation_link` non esistono ancora                                                                | F2-bis, prima di F8 |
