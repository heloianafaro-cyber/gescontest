import { prisma } from "@/lib/prisma";
import { podioDoTorneio } from "./podio-db";
import { montarQuadro, type EntradaMedalha, type LinhaQuadro } from "./medalhas";

export type QuadroDoEvento = { linhas: LinhaQuadro[]; torneiosEncerrados: number; torneiosTotal: number };

// RN253: o quadro é calculado na hora, a partir dos pódios completos. Não guarda nada no banco.
export async function quadroDeMedalhas(eventoId: number): Promise<QuadroDoEvento | null> {
  const evento = await prisma.evento.findUnique({
    where: { id: eventoId },
    select: {
      modalidades: {
        select: {
          nome: true,
          mae: { select: { nome: true } },
          torneios: { where: { disputas: { some: { partida: { isNot: null } } } }, select: { id: true, nome: true } },
        },
      },
    },
  });
  if (!evento) return null;

  const entradas: EntradaMedalha[] = [];
  const equipeIds = new Set<number>();
  const brutas: { torneioId: number; torneio: string; modalidade: string; col: { posicao: number; equipeId: number }[] }[] = [];
  let torneiosTotal = 0;
  let torneiosEncerrados = 0;

  for (const m of evento.modalidades) {
    const rotulo = m.mae ? `${m.mae.nome} — ${m.nome}` : m.nome;
    for (const t of m.torneios) {
      torneiosTotal++;
      const podio = await podioDoTorneio(t.id);
      if (!podio?.completo) continue;
      torneiosEncerrados++;
      const col = podio.colocacoes.filter((c) => c.posicao >= 1 && c.posicao <= 3);
      col.forEach((c) => equipeIds.add(c.equipeId));
      brutas.push({ torneioId: t.id, torneio: t.nome, modalidade: rotulo, col });
    }
  }

  const equipes = await prisma.equipe.findMany({
    where: { id: { in: [...equipeIds] } },
    select: { id: true, delegacaoId: true, delegacao: { select: { nome: true } } },
  });
  const delegacaoDaEquipe = new Map(equipes.map((e) => [e.id, e.delegacaoId]));
  const nomes = new Map(equipes.map((e) => [e.delegacaoId, e.delegacao.nome]));

  for (const b of brutas) {
    entradas.push({
      torneioId: b.torneioId,
      torneio: b.torneio,
      modalidade: b.modalidade,
      colocacoes: b.col.flatMap((c) => {
        const d = delegacaoDaEquipe.get(c.equipeId);
        return d === undefined ? [] : [{ posicao: c.posicao, delegacaoId: d }];
      }),
    });
  }
  return { linhas: montarQuadro(entradas, nomes), torneiosEncerrados, torneiosTotal };
}
