import { inizializzaIstanza } from "./bootstrap";

const esito = await inizializzaIstanza();

switch (esito.stato) {
  case "gia_inizializzata":
    console.log(`Istanza già inizializzata per «${esito.studio}»: nulla da fare.`);
    break;
  case "credenziali_mancanti":
    console.error("ADMIN_EMAIL e ADMIN_PASSWORD non impostate: impossibile creare l'amministratore.");
    console.error("Vedi .env.example. La password deve essere di almeno 12 caratteri.");
    process.exit(1);
    break;
  case "creata":
    console.log(`Istanza inizializzata per «${esito.studio}».`);
    console.log(`Amministratore: ${esito.adminEmail}`);
    console.log("Al primo accesso saranno forzati il cambio password e il secondo fattore.");
    break;
}
process.exit(0);
