import { prisma } from "@/lib/prisma";
import { aplicarAcao } from "@/modules/torneios/avanco";

// RN196, RN198, RN199: efeitos de uma inscrição indeferida ou de um atleta bloqueado, em qualquer momento.
// Devolve avisos para o coordenador. Os jogos já encerrados nunca são alterados.
export async function aplicarEfeitosIndeferimento(eventoId: number, atletaId: number): Promise<string[]> {
  const notas: string[] = [];

  const atleta = await prisma.usuario.findUnique({ where: { id: atletaId }, select: { nome: true } });
  const nome = atleta?.nome ?? "Atleta";

  const vinculos = await prisma.equipeAtleta.findMany({
    where: { atletaId, equipe: { modalidade: { eventoId } } },
    include: {
      equipe: {
        include: {
          modalidade: { select: { nome: true, tipo: true } },
          torneios: { include: { torneio: { select: { id: true, nome: true, sorteioEm: true } } } },
        },
      },
    },
  });

  for (const v of vinculos) {
    const equipe = v.equipe;

    // Modalidade coletiva: o atleta sai da equipe; a equipe continua na competição.
    if (equipe.modalidade.tipo === "COLETIVA") {
      await prisma.equipeAtleta.delete({
        where: { atletaId_equipeId: { atletaId, equipeId: equipe.id } },
      });
      notas.push(`${nome} saiu da equipe ${equipe.nome} (${equipe.modalidade.nome}).`);
      continue;
    }

    // Modalidade individual: a "equipe" é só o atleta.
    const jogos = await prisma.partida.count({
      where: { OR: [{ equipeAId: equipe.id }, { equipeBId: equipe.id }] },
    });

    if (jogos === 0) {
      // Ainda sem jogos: a inscrição é cancelada. Se o torneio já tinha sido sorteado, o sorteio é desfeito.
      const sorteados = equipe.torneios.filter((t) => t.torneio.sorteioEm !== null);
      for (const t of sorteados) {
        await prisma.$transaction([
          prisma.disputa.deleteMany({ where: { torneioId: t.torneio.id, status: "AGENDADA" } }),
          prisma.torneioEquipe.updateMany({
            where: { torneioId: t.torneio.id },
            data: { grupo: null, posicao: null },
          }),
          prisma.torneio.update({ where: { id: t.torneio.id }, data: { sorteioEm: null } }),
        ]);
        notas.push(`O sorteio do torneio ${t.torneio.nome} foi desfeito. Refaça o sorteio.`);
      }
      await prisma.torneioEquipe.deleteMany({ where: { equipeId: equipe.id } });
      await prisma.equipe.delete({ where: { id: equipe.id } });
      notas.push(`A inscrição de ${nome} em ${equipe.modalidade.nome} foi cancelada.`);
      continue;
    }

    // Já tem jogos: a chave não é refeita. Os jogos pendentes viram W.O. contra o atleta (RN199).
    let aplicados = 0;
    for (let tentativa = 0; tentativa < 60; tentativa++) {
      const proximo = await prisma.disputa.findFirst({
        where: {
          status: { in: ["AGENDADA", "EM_ANDAMENTO"] },
          partida: {
            AND: [
              { equipeAId: { not: null } },
              { equipeBId: { not: null } },
              { OR: [{ equipeAId: equipe.id }, { equipeBId: equipe.id }] },
            ],
          },
        },
        orderBy: { numero: "asc" },
        include: { partida: { select: { equipeAId: true } } },
      });
      if (!proximo || !proximo.partida) break;

      const dados = new FormData();
      dados.set("acao", "wo");
      dados.set("woLado", proximo.partida.equipeAId === equipe.id ? "A" : "B");
      const r = await aplicarAcao(proximo.id, "COORDENADOR", dados);
      if (r.erro) {
        notas.push(`Não foi possível dar W.O. no jogo ${proximo.numero} de ${nome}: ${r.erro}`);
        break;
      }
      aplicados++;
    }
    notas.push(
      `${nome} (${equipe.modalidade.nome}): ${aplicados} jogo(s) pendente(s) decidido(s) por W.O. contra ele(a); os já encerrados foram mantidos.`
    );
  }

  return notas;
}
