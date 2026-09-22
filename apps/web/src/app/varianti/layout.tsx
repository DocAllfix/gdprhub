import { soloFuoriProduzione } from "@/lib/solo-sviluppo";

// LE ANTEPRIME DI FORMA NON ESISTONO SU UN'ISTANZA CLIENTE.
//
// Sotto `/varianti` vivono tredici pagine costruite per far scegliere la forma al
// committente su contenuto reale — terminale contro schede, Geist contro Plex, oliva contro
// melanzana. Hanno fatto il loro lavoro: la scelta è fatta e sta in `DESIGN.md`.
//
// Restano online perché servono ancora a noi come riferimento, ma su una macchina venduta a
// uno studio legale sono superficie senza scopo: nessun guard le protegge, e regalano a
// chiunque conosca l'indirizzo il catalogo del prodotto e il sistema di design.
//
// IL CONTROLLO STA NEL LAYOUT e non nelle singole pagine: un layout copre ogni rotta
// annidata, comprese quelle che qualcuno aggiungerà domani senza ricordarsi di proteggerle.
// Tredici controlli ripetuti sono dodici occasioni di dimenticarne uno.
export default function LayoutVarianti({ children }: { children: React.ReactNode }) {
  soloFuoriProduzione();
  return <>{children}</>;
}
