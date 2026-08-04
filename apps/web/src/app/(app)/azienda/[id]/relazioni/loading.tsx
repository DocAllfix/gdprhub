import { Scheletro, ScheletroElenco, ScheletroTestata } from "@/components/ui/scheletro";

export default function Caricamento() {
  return (
    <div className="mx-auto max-w-[1100px] px-6 py-6">
      <Scheletro className="h-3 w-32" />
      <div className="mt-3">
        <ScheletroTestata conCifra={false} />
      </div>
      <Scheletro className="mt-6 h-28 w-full rounded-xl" />
      <div className="mt-4">
        <ScheletroElenco righe={4} altezza="h-16" />
      </div>
    </div>
  );
}
