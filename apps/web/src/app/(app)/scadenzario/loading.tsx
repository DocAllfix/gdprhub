import { Scheletro, ScheletroTabella, ScheletroTestata } from "@/components/ui/scheletro";

export default function Caricamento() {
  return (
    <div className="mx-auto max-w-[1600px] px-6 py-8">
      <ScheletroTestata />
      {/* La fascia temporale: è la prima cosa che si guarda, e deve avere il suo posto
          fin dal segnaposto — altrimenti la pagina "cresce" sotto gli occhi. */}
      <Scheletro className="mt-5 h-14 w-full rounded-xl" />
      <div className="mt-4 flex flex-wrap gap-2">
        {[64, 80, 72, 96].map((w, i) => (
          <Scheletro key={i} className="h-8 rounded-md" style={{ width: w }} />
        ))}
      </div>
      <div className="mt-4">
        <ScheletroTabella righe={12} />
      </div>
    </div>
  );
}
