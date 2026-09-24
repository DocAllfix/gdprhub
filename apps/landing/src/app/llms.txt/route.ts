import { PER_DOMINIO, TOTALE } from "@/lib/dati";
import { INGRESSO_DEMO, SITO } from "@/lib/sito";

// `llms.txt` generato e non scritto: i numeri vengono dal motore come nel resto della pagina.
// La prima versione era un file statico con 171, 42, 65 e 64 battuti a mano — esattamente ciò
// che questa landing esiste per non fare.
export const dynamic = "force-static";

export function GET() {
  const perDecreto = PER_DOMINIO.map((d) => `${d.quanti} ${d.etichetta.norma}`).join(", ");
  const testo = `# ${SITO.nome}

> Registro unico degli adempimenti GDPR (Reg. UE 2016/679), D.Lgs 231/2001 e D.Lgs 81/2008, per DPO, studi legali, organismi di vigilanza e RSPP. Ogni adempimento ha due stati distinti: lo stato del lavoro, deciso da una persona, e lo stato della scadenza, deciso dalla data.

Il caso che il prodotto esiste per mostrare è «Completata e scaduta»: il documento fu redatto, il ciclo è scaduto. Gli strumenti che tengono un campo solo lo registrano come «completata».

- Catalogo: ${TOTALE} adempimenti in un catalogo solo, con un'etichetta di versione (${perDecreto}).
- Scadenzario unico per i tre decreti; le scadenze si calcolano da periodicità e ultima esecuzione.
- Fascicolo ispettivo in PDF per organo: Garante privacy, Ispettorato Nazionale del Lavoro, ASL, Organismo di Vigilanza.
- Distribuzione: un'installazione dedicata per studio, nessuna registrazione pubblica, secondo fattore di autenticazione.
- Nessun listino online: l'acquisto si concorda.

## Collegamenti

- [Pagina del prodotto](${SITO.url}/)
- [Demo pubblica, ingresso con un clic](${INGRESSO_DEMO})
`;
  return new Response(testo, { headers: { "content-type": "text/plain; charset=utf-8" } });
}
