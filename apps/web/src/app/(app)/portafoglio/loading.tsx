import { ScheletroElenco, ScheletroTestata } from "@/components/ui/scheletro";

export default function Caricamento() {
  return (
    <div className="mx-auto max-w-[1600px] px-6 py-8">
      <ScheletroTestata />
      <div className="mt-6">
        <ScheletroElenco righe={8} altezza="h-16" />
      </div>
    </div>
  );
}
