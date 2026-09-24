import type { MetadataRoute } from "next";
import { SITO } from "@/lib/sito";

// Una pagina sola, per ora. `/privacy` e `/cookie` entrano quando esistono, cioè quando c'è un
// titolare. `lastModified` non si dichiara: la pagina si rigenera ogni giorno per le date della
// demo, e dichiarare «cambiata oggi» ogni giorno direbbe a Google una cosa falsa.
export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: `${SITO.url}/` }];
}
