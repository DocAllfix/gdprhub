import { PER_DOMINIO, TOTALE } from "./dati";

// Le domande della sezione S8 e del JSON-LD `FAQPage`: UNA fonte sola.
//
// Ogni risposta dice solo ciò che il prodotto mantiene oggi, o ciò che è deciso. Dove una cosa
// è ancora aperta — dove gira un'istanza, quanto costa — la risposta lo dice invece di coprirlo.

const conteggi = PER_DOMINIO.map((d) => `${d.quanti} per ${d.etichetta.norma}`).join(", ");

export const DOMANDE: readonly { readonly domanda: string; readonly risposta: string }[] = [
  {
    domanda: "Serve registrarsi per provare la demo?",
    risposta:
      "No. Si entra con un clic, senza credenziali, in un'installazione con i dati di un'azienda d'esempio inventata. " +
      "Potete cambiare gli stati degli adempimenti e vedere come si muovono le scadenze; ogni notte i dati tornano come prima.",
  },
  {
    domanda: "Quali norme copre?",
    risposta:
      `Il Regolamento UE 2016/679, il D.Lgs 231/2001 e il D.Lgs 81/2008, in un catalogo solo di ${TOTALE} adempimenti: ${conteggi}. ` +
      "Il catalogo ha una versione, e ogni installazione dichiara su quale sta lavorando.",
  },
  {
    domanda: "Che differenza c'è fra lo stato del lavoro e la scadenza?",
    risposta:
      "Sono due misure indipendenti. Lo stato del lavoro lo decide una persona: da fare, in corso, completata, non applicabile. " +
      "La scadenza la decide la data. Un documento redatto a marzo può essere completato e scaduto a settembre: " +
      "Legisboard lo mostra così, invece di chiamarlo «a posto».",
  },
  // VERIFICATO SUL CODICE, non sul commento di `brand.ts`: oggi il marchio dello studio è il
  // NOME. `aggiornaMarchio` salva `brandNome` e basta; `logoUrl` e `colore` esistono nel
  // tipo ma nessuno li scrive né li legge. Promettere logo e colore sarebbe stato falso.
  {
    domanda: "Le relazioni portano il nome del mio studio?",
    risposta:
      "Sì. Il nome dello studio sta in grande nella barra laterale, in copertina, a piè di pagina e nella chiusura di ogni relazione. " +
      "Legisboard resta una riga in piccolo.",
  },
  {
    domanda: "Dove stanno i dati dei miei clienti?",
    risposta:
      "In un'installazione dedicata al vostro studio, che non condivide il database con nessun altro. " +
      "Su quale macchina gira, un nostro server o uno vostro, si decide insieme prima di cominciare.",
  },
  {
    domanda: "L'accesso è protetto con il secondo fattore?",
    risposta:
      "Sì: codice a sei cifre da un'app di autenticazione, più codici di recupero da conservare. " +
      "Le utenze non si registrano da sole: le crea lo studio, per invito.",
  },
  {
    domanda: "Come si acquista?",
    risposta:
      "Non c'è un listino online e non c'è un pagamento dal sito: ogni installazione si concorda. " +
      "Entrate nella demo e, quando avete visto abbastanza, fissate un appuntamento.",
  },
];
