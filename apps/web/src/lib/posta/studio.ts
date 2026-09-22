import { cache } from "react";
import { db } from "@/lib/db";

// IL NOME DELLO STUDIO, preso da dove è vero.
//
// Le mail lo mettono nell'oggetto e nella firma. La prima versione lo leggeva da
// `env.STUDIO_NOME`, ed era sbagliato per due ragioni che si sono viste solo provando:
//
//   1. il compose passa quella variabile al servizio `preparazione`, che la usa per creare
//      l'organizzazione al primo avvio, e NON al servizio `app`. Le mail uscivano quindi
//      firmate «Studio», il valore predefinito dello schema, mentre nel database
//      l'organizzazione si chiamava correttamente col suo nome;
//
//   2. anche passandola, sarebbe stata la fonte sbagliata. Dopo l'installazione il nome lo
//      cambia il cliente dalle impostazioni, e finisce in `instance_config.brand_nome`: una
//      variabile d'ambiente resterebbe ferma al giorno dell'installazione e le mail
//      direbbero un nome che nell'applicazione non compare più.
//
// Si legge quindi la stessa fonte che `requireStudio()` restituisce come `studioNome`:
// prima il marchio configurato, poi il nome dell'organizzazione.
//
// SENZA SESSIONE, di proposito: queste funzioni girano dentro i gestori di Better Auth —
// recupero password, inviti — dove una sessione non c'è ancora o non c'è più. L'istanza
// contiene una sola organizzazione, quindi non c'è niente da disambiguare.

export const nomeStudio = cache(async (): Promise<string> => {
  try {
    const riga = await db.query.organization.findFirst({ columns: { name: true } });
    const config = await db.query.instanceConfig.findFirst({ columns: { brandNome: true } });
    return config?.brandNome ?? riga?.name ?? "Studio";
  } catch {
    // Una mail con un nome generico è meglio di una mail non partita: questo valore finisce
    // in un oggetto, non in un controllo di sicurezza.
    return "Studio";
  }
});
