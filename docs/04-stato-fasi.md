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
| **F5d** | **Rifacimento della forma**: oliva hue 110, Geist, schema «quieto»           | scelto dal committente su anteprime navigabili, non su descrizioni          |

## F5d — come si è arrivati alla forma

Vale la pena scriverlo, perché il metodo era sbagliato e cambiarlo è ciò che ha sbloccato.

Per quattro giri ho descritto modifiche ai token e il committente ha risposto «fa cagare»,
che è un giudizio corretto e inutilizzabile. Il metodo giusto si è rivelato un altro:
**costruire le alternative e farle guardare**, sullo stesso contenuto reale, in entrambi i
temi, su tutte le schermate insieme — perché una direzione può reggere sul cruscotto e
crollare sulla tabella da sessantaquattro righe, e accorgersene alla terza schermata
significa averne due da riscrivere.

Le anteprime vivono sotto `/varianti` e sono ancora online. La sequenza delle scelte:

| Passo | Alternative mostrate                          | Scelta                     |
| ----- | --------------------------------------------- | -------------------------- |
| 1     | Terminale · Schede · Editoriale               | **Schede**                 |
| 2     | Perizia (Plex+serif) · Console (Geist) · Gazzetta | **Console → Geist**    |
| 3     | Filetto · Piano · Fascia                      | **Piano**                  |
| 4     | Quieto · Steso · Inciso                       | **Quieto**                 |
| 5     | Notte 288 · Carta · Terra 78                  | tutte scartate             |
| 6     | Grafite · Oliva 110 · Melanzana 307           | **Oliva**                  |
| 7     | Binario · Contesto · Testata (barra laterale) | **Contesto** _(assunto)_   |

Il passo 7 è l'unico dedotto e non dichiarato: la risposta è stata «mi piace più oliva
barra», che corregge il colore rispetto alla mia raccomandazione e non nomina la barra. Ho
applicato la disposizione che avevo raccomandato — colonna di contesto — e l'ho dichiarato.
**Se era un'altra, si cambia in un file.**

Il ragionamento su ciascuna scelta, con i costi, sta in `DESIGN.md`.

## Difetti trovati dalla verifica, non dalla lettura del codice

Sono elencati perché ognuno è passato per una build verde.

| Fase | Difetto                                                          | Dove si sarebbe visto                             |
| ---- | ---------------------------------------------------------------- | ------------------------------------------------- |
| F0   | Chromium fuori dal bundle serverless                             | primo PDF generato dal cliente                    |
| F5b  | Tema scuro identico al chiaro, cancello verde                    | subito, ma nessuno guardava                       |
| F5b  | `light-dark()` distrutto da Lightning CSS: fondo trasparente     | in produzione                                     |
| F5c  | Pagine riempite al 62% per una calibrazione a occhio             | mai: non è un errore, è sciatteria                |
| F5c  | Chiave glob `/prototipi/[documento]` che non corrisponde a nulla | 500 in produzione, 200 in locale                  |
| F6   | `APP_URL` diverso dall'origine reale: 403 «Invalid origin»       | all'accesso del committente sulla vetrina         |
| F6   | Il modulo «nuova azienda» si azzera se la validazione fallisce   | alla prima partita IVA sbagliata                  |
| F6   | Un'azienda appena creata si presentava «in regola» in verde      | mai, ed è il problema: era una bugia rassicurante |
| F5d  | `<title>` dentro un `<svg>`: React 19 lo solleva nella testa e rompe l'idratazione | in produzione, come errore #418 minificato |
| F5d  | `overflow: hidden` su un antenato annulla `position: sticky`     | la barra spariva scorrendo, e io avevo scritto che restava |
| F5d  | Il cancello chiedeva `/azienda/<id>/d81/d81`: nove 404           | il difetto era **nel cancello**, causato dal nuovo collegamento in barra |
| F5d  | Cancello bocciato tre volte per 401, non per il limitatore       | un giro di collaudo aveva cambiato le password in banca dati |

## Dove gira il calcolo

`vercel.json` fissa le funzioni a **`fra1` (Francoforte)**. Non è un dettaglio di
prestazioni: il database Neon è in `eu-central-1`, e con le funzioni nella regione
predefinita di Vercel — `iad1`, Washington — **ogni query attraversava l'Atlantico**. Il
portafoglio impiegava 2,8 secondi a produrre nove kilobyte di HTML: non rendering, latenza
moltiplicata per una decina di viaggi.

E prima ancora è una questione di sostanza: in un prodotto che vende conformità al GDPR il
**calcolo** deve stare in Unione Europea, non solo l'archivio. Avere scelto Neon in Europa e
lasciato le funzioni negli Stati Uniti era un errore che nessun cliente avrebbe accettato.

## Prossime

- **F7** — assessment: la vista parametrica sul dominio, stato del lavoro modificabile,
  `non_applicabile` con motivazione, ultima esecuzione con scadenza ricalcolata, storico
  append-only. 171 righe senza degrado.
- **F8** — scadenzario unificato e collegamenti fra domini: il momento firmato. Chiudere il
  DVR nell'81/08 aggiorna la lettura del 231 senza duplicare la riga.
- **F9** — evidenze documentali. **F10** — cruscotti e simulatore. **F11** — tour di
  onboarding sui `data-tour` già scritti. **F12** — relazioni e PDF veri.

## Questioni ancora aperte

1. **Nome e dominio**: `compliancedesk.it` è libero ed è la raccomandazione. Va registrato
   subito: la verifica non lo prenota.
2. **Chi possiede il server** nella vendita reale: cambia DPA, ripristino e chi paga.
3. **Valore della quota 231**: lo determina il consulente o una tabella predefinita?
4. **Licenza**: solo contratto, o file con scadenza e banner?
5. **Blocchi demo**: predisposti (`instance_config.mode`), da attivare solo su conferma.
