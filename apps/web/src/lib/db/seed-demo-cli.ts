import { seminaAziendaDimostrativa } from "./seed-demo";

const esito = await seminaAziendaDimostrativa();

switch (esito.stato) {
  case "istanza_non_inizializzata":
    console.error("Nessuno studio configurato: esegui prima `pnpm db:bootstrap`.");
    process.exit(1);
    break;
  case "catalogo_mancante":
    console.error("Nessuna versione di catalogo attiva: esegui prima `pnpm db:seed`.");
    process.exit(1);
    break;
  case "gia_presente":
    console.log(`Azienda di esempio già presente (${esito.id}): nulla da fare.`);
    break;
  case "creata":
    console.log(`Azienda di esempio creata: ${esito.adempimenti} adempimenti sui tre moduli.`);
    console.log(`Scheda: /azienda/${esito.id}`);
    break;
}
process.exit(0);
