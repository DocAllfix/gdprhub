import { portafoglio } from "@/features/portafoglio/dati";
import { scadenzario } from "@/features/scadenzario/dati";

// IL SOMMARIO CHE VIVE NELLA BARRA LATERALE.
//
// La barra prende il sedici per cento dello schermo. Se dentro ci sono solo cinque
// collegamenti, quei pixel sono un costo e basta: qui se li guadagna portando le due cose
// che un consulente cerca più spesso di ogni altra.
//
//   IL CAMBIO CLIENTE. È il comando più usato del prodotto — un consulente passa da
//   un'azienda all'altra decine di volte al giorno — e in quasi tutti gli strumenti del
//   settore sta sepolto in un menù. Qui sta in cima alla colonna, con la conformità
//   accanto a ogni nome, così la scelta si fa guardando invece che ricordando.
//
//   COSA SCADE ADESSO. Tre voci, le più urgenti dell'intero portafoglio. Non sostituisce
//   lo scadenzario: dice se c'è da correre prima ancora di aprirlo.
//
// NESSUNA QUERY IN PIÙ. Riusa `portafoglio()` e `scadenzario()`, che sono già in cache con
// la stessa chiave usata dalle rispettive schermate: quando si apre il portafoglio la
// barra non paga niente, e quando si apre un'altra pagina paga una lettura sola che poi
// serve anche alle successive.

export type SommarioBarra = {
  readonly aziende: readonly {
    readonly id: string;
    readonly nome: string;
    readonly conformita: number | null;
    readonly scadute: number;
  }[];
  readonly quanteAziende: number;
  readonly prossime: readonly {
    readonly istanzaId: string;
    readonly aziendaId: string;
    readonly azienda: string;
    readonly titolo: string;
    readonly dominio: string;
    readonly giorni: number;
  }[];
};

export async function sommarioBarra(): Promise<SommarioBarra> {
  const [{ righe }, sc] = await Promise.all([portafoglio(), scadenzario()]);

  // Ordinate per urgenza e non per nome: chi apre la tendina cerca quasi sempre l'azienda
  // che ha un problema, non la prima in ordine alfabetico.
  const aziende = [...righe]
    .sort((a, b) => b.scadute - a.scadute || a.nome.localeCompare(b.nome, "it"))
    .slice(0, 8)
    .map((r) => ({
      id: r.id,
      nome: r.nome,
      conformita: r.conformita?.percentuale ?? null,
      scadute: r.scadute,
    }));

  return {
    aziende,
    quanteAziende: righe.length,
    prossime: sc.voci.slice(0, 3).map((v) => ({
      istanzaId: v.istanzaId,
      aziendaId: v.aziendaId,
      azienda: v.azienda,
      titolo: v.titolo,
      dominio: v.dominio,
      giorni: v.giorni,
    })),
  };
}
