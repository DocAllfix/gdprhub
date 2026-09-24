import { assicuraUtenteDemo, ripristinaDemo } from "./demo";

// Riporta l'azienda di esempio allo stato iniziale, e ripara l'utente della demo pubblica.
//
// Serve DOPO il cancello visivo. Il cancello clicca ogni elemento azionabile, e fra questi
// ci sono i pulsanti che attivano e disattivano i moduli: è giusto che li clicchi — sono
// bottoni veri e devono funzionare — ma alla fine i dati dimostrativi vanno rimessi a posto,
// altrimenti il committente aprirebbe la vetrina e troverebbe moduli spenti a caso.
//
// La stessa logica la usa il cron notturno della demo pubblica: sta in `./demo.ts`.
//
// Uso:  pnpm --filter web db:demo-reset

const esito = await ripristinaDemo();
if (esito.stato === "ripristinata") console.log(`Azienda di esempio ripristinata: ${esito.campi} campi riportati ai valori iniziali.`);
else if (esito.stato === "creata") console.log(`Azienda di esempio creata: ${esito.adempimenti} adempimenti.`);
else {
  console.error(`Ripristino non riuscito: ${esito.stato}`);
  process.exit(1);
}

const utente = await assicuraUtenteDemo();
if (utente !== "non_configurato") console.log(`Utente della demo: ${utente}.`);
process.exit(0);
