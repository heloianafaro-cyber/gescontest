import { prisma } from "@/lib/prisma";
import { avisoMinimo } from "./listas-csv";

export type EquipeAbaixo = {
  equipeId: number;
  equipe: string;
  modalidade: string;
  delegacaoId: number;
  inscritos: number;
  minimo: number;
};

// RN207: equipes do evento com menos atletas que o mínimo da modalidade.
export async function equipesAbaixoDoMinimo(eventoId: number): Promise<EquipeAbaixo[]> {
  const equipes = await prisma.equipe.findMany({
    where: { modalidade: { eventoId } },
    select: {
      id: true,
      nome: true,
      delegacaoId: true,
      modalidade: { select: { nome: true, minAtletas: true } },
      _count: { select: { atletas: true } },
    },
  });
  return equipes
    .filter((e) => avisoMinimo(e._count.atletas, e.modalidade.minAtletas) !== null)
    .map((e) => ({
      equipeId: e.id,
      equipe: e.nome,
      modalidade: e.modalidade.nome,
      delegacaoId: e.delegacaoId,
      inscritos: e._count.atletas,
      minimo: e.modalidade.minAtletas,
    }));
}
