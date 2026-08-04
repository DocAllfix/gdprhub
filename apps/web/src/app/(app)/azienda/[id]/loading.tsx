import { Scheletro, ScheletroFascia, ScheletroTestata } from "@/components/ui/scheletro";

export default function Caricamento() {
  return (
    <div className="mx-auto max-w-[1600px] px-6 py-8">
      <Scheletro className="h-3 w-24" />
      <div className="mt-3">
        <ScheletroTestata />
      </div>
      <div className="mt-5 flex flex-wrap gap-3">
        {[110, 120, 150].map((w, i) => (
          <Scheletro key={i} className="h-9 rounded-md" style={{ width: w }} />
        ))}
      </div>
      <div className="mt-7">
        <ScheletroFascia quanti={3} altezza="h-40" />
      </div>
      <div className="mt-8 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Scheletro key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
