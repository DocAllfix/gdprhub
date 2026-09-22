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
    // NON si promette il secondo fattore, perche' non e' attivabile.
    //
    // Questa riga diceva «al primo accesso saranno forzati il cambio password e il
    // secondo fattore». Il plugin `twoFactor` e' configurato e la schermata di accesso sa
    // verificare un TOTP, ma NON ESISTE alcuna pagina per accenderlo: niente codice QR,
    // niente conferma, niente codici di recupero. Nessuno puo' attivarlo.
    //
    // Era quindi un'affermazione falsa stampata al cliente a ogni installazione, su un
    // prodotto che custodisce le evidenze di conformita' di aziende terze. Torna quando
    // la schermata esiste, non prima.
    console.log("Al primo accesso e' forzato il cambio della password.");
    break;
}
process.exit(0);
