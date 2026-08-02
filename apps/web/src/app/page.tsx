import { redirect } from "next/navigation";
import { sessioneCorrente } from "@/features/auth/guards";

// La radice non ha contenuto proprio: chi entra o è dentro, e va al portafoglio, o è fuori,
// e va all'accesso. Una pagina di benvenuto in un prodotto venduto per istanza sarebbe solo
// un clic in più fra il consulente e il suo lavoro.
//
// Sostituisce il segnaposto della Fase 1, che elencava i tre cataloghi per dimostrare che
// l'impalcatura reggeva.

export const dynamic = "force-dynamic";

export default async function Radice() {
  const sessione = await sessioneCorrente();
  redirect(sessione?.user ? "/portafoglio" : "/accedi");
}
