import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { NonAutenticato, requireStudio } from "@/features/auth/guards";
import { ModuloPrimoAccesso } from "./modulo";

// Il cambio password forzato, con il suo guard.
//
// Serve in ENTRAMBE le direzioni: chi non ha ancora cambiato la password non esce di qui
// (lo impone il layout dell'applicazione), e chi l'ha già cambiata non ci rientra.
//
// Senza il secondo verso, chi ricarica la pagina dopo aver cambiato la password si ritrova
// davanti lo stesso modulo, prova le credenziali iniziali che non valgono più, e resta
// bloccato senza capire perché. È successo al committente al primo accesso reale.

export const metadata: Metadata = { title: "Cambia la password" };
export const dynamic = "force-dynamic";

export default async function PaginaPrimoAccesso() {
  // Il reindirizzamento sta FUORI dal try: `redirect` funziona lanciando un'eccezione, e
  // dentro un catch generico verrebbe intercettata insieme agli errori veri.
  let deveCambiare: boolean;
  try {
    deveCambiare = (await requireStudio()).mustChangePassword;
  } catch (errore) {
    if (errore instanceof NonAutenticato) redirect("/accedi");
    throw errore;
  }

  if (!deveCambiare) redirect("/portafoglio");
  return <ModuloPrimoAccesso />;
}
