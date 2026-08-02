# PRODUCT.md

Fonte di verità su utenti, scopo e personalità del prodotto. Le skill di design leggono
questo file. Non contiene decisioni visive: quelle vivono in `DESIGN.md`.

## Register

product

## Users

**Chi compra e chi usa ogni giorno** è la stessa persona: un professionista italiano della
compliance che gestisce un portafoglio di aziende clienti.

- **Consulente privacy e DPO esterno** — 35-65 anni, formazione giuridica. Segue da 10 a 80
  aziende. Conosce il GDPR meglio di qualsiasi software, non conosce il software.
- **Studio legale con dipartimento compliance** — più consulenti sulla stessa istanza, un
  socio che firma le relazioni.
- **Organismo di Vigilanza (OdV)** — monocratico o collegiale. Ragiona per **reati
  presupposto**, non per attività: la sua domanda è «il rischio 25-septies è presidiato?».
- **RSPP e HSE manager** — ragiona per **scadenze e nomine**. Il suo mondo sono documenti che
  hanno una data di rinnovo.

**Come lavorano davvero.** Desktop, spesso due finestre affiancate. Sei ore al giorno.
Non esplorano: **scansionano**. Aprono lo strumento per rispondere a una domanda precisa
(«cosa scade questa settimana per Rossi Srl»), non per scoprire cosa c'è dentro. Il cliente
finale — l'azienda assistita — oggi non entra: riceve la relazione che il professionista
produce.

## Product Purpose

Suite di compliance integrata su **tre decreti insieme**: GDPR, D.Lgs 231/01 (responsabilità
amministrativa degli enti), D.Lgs 81/08 (salute e sicurezza sul lavoro). **171 adempimenti**
in un catalogo unico, con i collegamenti reali fra i tre corpi normativi.

Nasce da tre prototipi HTML del committente, che erano tre strumenti separati. Il salto non è
metterli nella stessa finestra: è **rappresentare che sono un grafo**. L'art. 30 D.Lgs 81/08
richiede un sistema di gestione della sicurezza come esimente 231; l'art. 25-septies rende
l'infortunio grave un reato presupposto; l'art. 24-bis tocca le misure dell'art. 32 GDPR. Il
DVR si censisce una volta nel modulo sicurezza e il modulo 231 lo **legge**.

**La catena di valore**, ereditata dai prototipi e resa difendibile:

> adempimenti con stato → indicatori derivati → **una relazione che il consulente consegna al
> CdA del cliente e fattura**

**Il momento che definisce il prodotto** non è la routine quotidiana: è l'ispezione. Il
Garante, l'Ispettorato del Lavoro, un pubblico ministero. In quel momento il professionista
deve dimostrare, seduta stante, che ogni obbligo è stato adempiuto **ed è ancora valido**.
Tutto il resto dell'interfaccia esiste per rendere possibile quel momento.

**Successo** = il consulente smette di tenere tre file Excel e un calendario, perché qui vede
in una lista sola cosa scade, su quale cliente, per quale decreto.

## Brand Personality

**Sobrio, preciso, inflessibile sui numeri.**

La voce è quella del collega esperto che ti dice come stanno le cose senza addolcirle. Non
rassicura: informa. Se la conformità effettiva è 44%, dice 44% e spiega perché, non mostra un
grafico che sembra buono.

**In italiano professionale corretto**, con la terminologia esatta di ciascun decreto — mai
un termine inglese gratuito. Il DPO parla di _controlli_, l'OdV di _flussi informativi_ e
_vigilanza_, l'RSPP di _scadenze_ e _nomine_: il modello dati è uno, il lessico è quello di
chi legge.

**L'autorevolezza sta nella precisione**, non nella decorazione: allineamenti, cifre
tabellari, date formattate `it-IT` senza eccezioni. Una virgola sbagliata in una relazione al
CdA costa più di qualsiasi effetto grafico.

## Anti-references

- **I tre prototipi di partenza.** Sono un riferimento funzionale, mai estetico: gradienti
  viola e ciano in blur, glassmorphism su ogni scheda, badge «LIVE» pulsante, `hover:scale`.
  Il prodotto finale deve distanziarsene visibilmente.
- **Il cruscotto SaaS di serie.** Grandi numeri eroici, griglie di schede tutte uguali, testo
  in gradiente, emoji, «Bentornato». Se un template generico potesse produrlo, è sbagliato.
- **I gestionali italiani anni 2000.** Griglie grigie, form infiniti, ribbon, densità caotica
  senza gerarchia. Densi sì, illeggibili no.
- **Il registro «analytics».** Molti grafici che raccontano un andamento. Questo prodotto non
  racconta andamenti: dice cosa non regge adesso.
- **La famiglia visiva di EvalisDeck** (progetto gemello ESG dello stesso committente):
  stesso metodo, identità deliberatamente diversa.

## Design Principles

1. **Due assi, sempre distinti.** Ogni adempimento ha uno stato del _lavoro_ (lo decide una
   persona) e uno stato della _scadenza_ (lo decide la data). «Completata **e** Scaduta» è la
   situazione più frequente e più pericolosa: il documento fu redatto, il ciclo è scaduto.
   Renderla leggibile a colpo d'occhio, senza legenda, è il problema di design centrale.
   Nessun concorrente lo rappresenta: tutti collassano i due assi in un campo solo, e mentono.

2. **Il colore è dato, non decorazione.** Rosso, ambra e verde sono **riservati** allo stato
   della scadenza. I tre accenti di dominio non possono somigliarvi, o un adempimento 81/08
   in scadenza diventa invisibile sul colore del proprio modulo. Accento ≤10% della pagina.

3. **Densità professionale.** Chi guarda 40 clienti non vuole 4 schede. Righe compatte,
   scansione verticale rapida, filtri sempre visibili e persistenti nell'URL, scorciatoie da
   tastiera. Se in una schermata entrano 8 righe è una dashboard; se ne entrano 22 è uno
   strumento.

4. **Ogni numero sa spiegarsi.** L'indice di esposizione restituisce le sue componenti, la
   stima sanzionatoria stampa metodo e assunzioni, la conformità dichiara il denominatore.
   Un numero che non sa da dove viene non è difendibile davanti a un'autorità, e questo
   prodotto esiste per essere difendibile.

5. **Due registri, e il contrasto è il lusso.** L'_applicazione_ è densa, neutra, silenziosa:
   uno strumento. Il _documento generato_ è editoriale, con serif, margini ampi, copertina:
   una perizia. Sono due cose diverse e devono sembrarlo.

6. **Niente dati inventati.** Se lo storico non c'è, l'andamento non si mostra: si mostra un
   empty state onesto. I prototipi generavano il trend con `Math.random()` e una stima
   sanzionatoria da coefficienti senza fonte. È il difetto che questo prodotto esiste per
   correggere, e vale anche per l'interfaccia.

## Accessibility & Inclusion

WCAG 2.1 AA: contrasto minimo 4.5:1 sul testo, focus visibile su ogni controllo, navigazione
completa da tastiera, `prefers-reduced-motion` rispettato.

**Il colore non è mai l'unico canale**: ogni stato porta sempre anche un'etichetta testuale.
I tre accenti di dominio devono restare distinguibili in **deuteranopia** — la forma più
comune di daltonismo, che in un pubblico di professionisti maschi 35-65 non è un caso di
scuola.

Numeri, valute e date formattati `it-IT`. Cifre tabellari obbligatorie in tabelle e
indicatori: le colonne di numeri devono allinearsi.

## Constraints

- **Next.js 16 · React 19 · TypeScript · Tailwind v4 · shadcn/ui.** Token semantici in
  `globals.css`: nessun colore, raggio o ombra scritto a mano nei componenti.
- **Tabelle su TanStack Table**, con stato dei filtri nell'URL.
- **Nessun componente a pagamento.** Fonti libere: blocchi ufficiali shadcn, Tremor per i
  grafici, Origin UI. Riferimenti strutturali dal template MIT `next-shadcn-admin-dashboard`.
- **Tema chiaro e scuro, entrambi verificati** a ogni cancello di fase.
- **Distribuzione per istanza** dietro Caddy: branding per studio (logo, colore, intestazione
  delle relazioni) previsto dal primo giorno.
