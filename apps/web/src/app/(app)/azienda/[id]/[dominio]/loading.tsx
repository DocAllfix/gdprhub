import { Scheletro, ScheletroTabella, ScheletroTestata } from "@/components/ui/scheletro";

// L'assessment è la pagina più pesante del prodotto: 171 righe. È anche quella in cui
// l'assenza di un segnaposto si nota di più, perché il server ci mette di più.
export default function Caricamento() {
  return (
    <div className="mx-auto max-w-[1600px] px-6 py-8">
      <Scheletro className="h-3 w-24" />
      <div className="mt-3">
        <ScheletroTestata />
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        {[220, 90, 90, 90, 70].map((w, i) => (
          <Scheletro key={i} className="h-9 rounded-md" style={{ width: w }} />
        ))}
      </div>
      <div className="mt-4">
        <ScheletroTabella righe={14} />
      </div>
    </div>
  );
}
