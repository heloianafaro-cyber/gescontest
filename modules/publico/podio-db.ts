import { prisma } from "@/lib/prisma";
import { tabelasDoTorneio } from "@/modules/torneios/classificacao-db";
import { calcularPodio, type ResultadoPodio } from "./podio";

export type PodioDoTorneio = ResultadoPodio & { nomes: Map<number, string> };

// RN218: pódio de um torneio, só com nomes de equipes.
export async function podioDoTorneio(torneioId: number): Promise<PodioDoTorneio | null> {
  const dados = await tabelasDoTorneio(prisma, torneioId);
  if (!dados) return null;
  const t = dados.torneio;
  const r = calcularPodio({
    sistema: t.sistemaDisputa,
    terceiroLugar: t.terceiroLugar,
    tabela: t.sistemaDisputa === "RODIZIO" && dados.tabelas[0] ? dados.tabelas[0].linhas : null,
    jogos: t.disputas
      .filter((d) => d.partida)
      .map((d) => ({
        id: d.id,
        fase: d.fase,
        status: d.status,
        serie: d.serie,
        a: d.partida!.equipeAId,
        b: d.partida!.equipeBId,
        placarA: d.partida!.placarA,
        placarB: d.partida!.placarB,
        penaltisA: d.partida!.penaltisA,
        penaltisB: d.partida!.penaltisB,
        vencedorId: d.partida!.vencedorId,
        woEquipeId: d.partida!.woEquipeId,
      })),
  });
  return { ...r, nomes: dados.nomes };
}
