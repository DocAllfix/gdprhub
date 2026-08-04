import { Scheletro, ScheletroFascia, ScheletroTestata } from "@/components/ui/scheletro";

// Il segnaposto del cruscotto: quattro pannelli in fascia, poi tre riquadri bassi.
//
// Ha la STESSA impaginazione della pagina che arriva. Un rettangolo grigio generico dice
// «sto caricando»; questo dice «sto caricando IL CRUSCOTTO», e quando il contenuto arriva
// si posa dove l'occhio lo stava già aspettando, senza salti.
export default function Caricamento() {
  return (
    <div className="mx-auto max-w-[1600px] px-6 py-7">
      <ScheletroTestata conCifra={false} />
      <div className="mt-6">
        <ScheletroFascia quanti={4} />
      </div>
      <div className="mt-3 grid gap-3 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="pannello h-64 p-5">
            <Scheletro className="h-4 w-32" />
            <Scheletro className="mt-2 h-3 w-48 max-w-full" />
            <Scheletro className="mt-5 h-32 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
