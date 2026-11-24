import { prisma } from "@/lib/prisma";

export const selecaoRecurso = {
  id: true,
  assunto: true,
  texto: true,
  linkProvas: true,
  status: true,
  criadoEm: true,
  decisaoTexto: true,
  decididoEm: true,
  equipe: { select: { id: true, nome: true, delegacao: { select: { nome: true } } } },
  abertoPor: { select: { nome: true } },
  decididoPor: { select: { nome: true } },
  disputa: {
    select: {
      id: true,
      numero: true,
      fase: true,
      dataHora: true,
      torneioId: true,
      partida: { select: { equipeA: { select: { nome: true } }, equipeB: { select: { nome: true } } } },
      torneio: {
        select: {
          nome: true,
          modalidadeId: true,
          modalidade: { select: { nome: true, eventoId: true, evento: { select: { nome: true } } } },
        },
      },
    },
  },
} as const;

// RN235, RN236: lista de recursos para o coordenador (de um evento) e para o Staff (de todos os eventos).
// Abertos primeiro, depois os mais novos.
export async function listarRecursos(filtro: { eventoId?: number; status?: "ABERTO" | "DEFERIDO" | "INDEFERIDO" }) {
  const recursos = await prisma.recursoDisputa.findMany({
    where: {
      status: filtro.status,
      disputa: filtro.eventoId !== undefined ? { torneio: { modalidade: { eventoId: filtro.eventoId } } } : undefined,
    },
    orderBy: { id: "desc" },
    select: selecaoRecurso,
  });
  return recursos.sort((a, b) => Number(b.status === "ABERTO") - Number(a.status === "ABERTO"));
}

export type RecursoCompleto = Awaited<ReturnType<typeof listarRecursos>>[number];
