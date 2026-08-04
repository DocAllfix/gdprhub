import { Scheletro, ScheletroTestata } from "@/components/ui/scheletro";

export default function Caricamento() {
  return (
    <div className="mx-auto max-w-[1100px] px-6 py-6">
      <Scheletro className="h-3 w-32" />
      <div className="mt-3">
        <ScheletroTestata conCifra={false} />
      </div>
      <Scheletro className="mt-6 h-40 w-full rounded-xl" />
      <div className="mt-4 space-y-2">
        {[0, 1, 2].map((i) => (
          <Scheletro key={i} className="h-14 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
