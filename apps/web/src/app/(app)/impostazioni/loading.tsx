import { Scheletro, ScheletroElenco, ScheletroTestata } from "@/components/ui/scheletro";

export default function Caricamento() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <ScheletroTestata conCifra={false} />
      <div className="mt-7 space-y-6">
        <Scheletro className="h-32 w-full rounded-xl" />
        <ScheletroElenco righe={4} />
      </div>
    </div>
  );
}
