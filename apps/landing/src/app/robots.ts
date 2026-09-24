import type { MetadataRoute } from "next";
import { INDICIZZABILE, SITO } from "@/lib/sito";

// Crawler di ricerca e di risposta ammessi per nome: le risposte degli assistenti citano chi si
// fa leggere. `Google-Extended` — addestramento, non ricerca — resta fuori finché il committente
// non decide: è una scelta commerciale, non tecnica (docs/07 §3.3).
//
// Finché la pagina non è indicizzabile (anteprime, dati legali mancanti) il divieto è totale.
export default function robots(): MetadataRoute.Robots {
  if (!INDICIZZABILE) return { rules: [{ userAgent: "*", disallow: "/" }] };
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: "/api/" },
      { userAgent: ["GPTBot", "OAI-SearchBot", "ClaudeBot", "PerplexityBot"], allow: "/", disallow: "/api/" },
    ],
    sitemap: `${SITO.url}/sitemap.xml`,
  };
}
