import { Scheletro, ScheletroTestata } from "@/components/ui/scheletro";

export default function Caricamento() {
  return (
    <div className="mx-auto max-w-[1100px] px-6 py-6">
      <Scheletro className="h-3 w-32" />
      <div className="mt-3">
        <ScheletroTestata />
      </div>
      <div className="mt-5 space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Scheletro key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
