import { redirect } from "next/navigation";
import { NonAutenticato, NonAutorizzato, requireStudio } from "@/features/auth/guards";
import { tourVisti } from "@/features/tour/azioni";
import { Shell } from "@/components/shell/shell";

// Il layout protetto. Tutte le schermate operative stanno sotto questo gruppo di rotte, e
// il guard sta QUI e non in un middleware: il middleware gira sull'edge, dove non c'è il
// database, quindi potrebbe verificare l'esistenza di un cookie ma non l'appartenenza allo
// studio. Un controllo che verifica meno di quello che sembra è peggio di nessun controllo.

export const dynamic = "force-dynamic";

export default async function LayoutApplicazione({ children }: { children: React.ReactNode }) {
  let ctx;
  try {
    ctx = await requireStudio();
  } catch (errore) {
    if (errore instanceof NonAutenticato) redirect("/accedi");
    if (errore instanceof NonAutorizzato) redirect("/accedi?motivo=non-autorizzato");
    throw errore;
  }

  // Finché la password iniziale è in vigore non si accede a nulla: è scritta in chiaro nel
  // file d'ambiente dell'istanza.
  if (ctx.mustChangePassword) redirect("/primo-accesso");

  // La barra è un binario fisso: non c'è più niente da aprire o chiudere, quindi non c'è
  // più una preferenza da leggere dal cookie né un sommario da caricare. Sono due cose in
  // meno per disegnare ogni pagina protetta.
  // Quali guide ha già visto: si legge qui perché la barra c'è su ogni schermata protetta,
  // ed è una lettura sola per pagina invece di una per componente.
  const visti = await tourVisti();

  return (
    <Shell studio={ctx.studioNome} utente={ctx.nome || ctx.email} ruolo={ctx.ruolo} tourVisti={visti}>
      {children}
    </Shell>
  );
}
