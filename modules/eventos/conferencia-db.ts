import { prisma } from "@/lib/prisma";
import { avisosDoAtleta } from "./conferencia";
import { estaPendente, type StatusImpugnacao } from "./impugnacao";

export type ResumoImpugnacao = {
  status: StatusImpugnacao;
  bloqueio: boolean;
  motivo: string;
  recursoTexto: string | null;
  nomeArquivo: string | null;
  recursoEm: Date | null;
  decisaoTexto: string | null;
  decididoEm: Date | null;
};

export type InscritoConferencia = {
  id: number;
  nome: string;
  delegacao: string;
  inscricoes: string[];
  avisos: string[];
  impugnacao: ResumoImpugnacao | null;
};

// Atletas inscritos no evento (um por pessoa, com todas as inscrições), com os avisos do sistema
// e a situação de impugnação/recurso.
export async function listarInscritos(
  evento: { id: number; idadeLimite: number | null; dataInicio: Date },
  filtros: { delegacaoId?: number; modalidadeId?: number } = {}
): Promise<InscritoConferencia[]> {
  const [vinculos, impugnacoes] = await Promise.all([
    prisma.equipeAtleta.findMany({
      where: {
        equipe: {
          modalidade: {
            eventoId: evento.id,
            ...(filtros.modalidadeId ? { id: filtros.modalidadeId } : {}),
          },
          ...(filtros.delegacaoId ? { delegacaoId: filtros.delegacaoId } : {}),
        },
      },
      include: {
        atleta: { select: { id: true, nome: true, fichaStatus: true, dataNascimento: true } },
        equipe: {
          select: {
            nome: true,
            delegacao: { select: { nome: true } },
            modalidade: { select: { nome: true, tipo: true } },
          },
        },
      },
      orderBy: { atleta: { nome: "asc" } },
    }),
    prisma.impugnacao.findMany({ where: { eventoId: evento.id } }),
  ]);

  const porAtletaImp = new Map(impugnacoes.map((i) => [i.atletaId, i]));

  const porAtleta = new Map<number, InscritoConferencia>();
  for (const v of vinculos) {
    const rotulo =
      v.equipe.modalidade.tipo === "COLETIVA"
        ? `${v.equipe.modalidade.nome} — ${v.equipe.nome}`
        : v.equipe.modalidade.nome;
    const existente = porAtleta.get(v.atleta.id);
    if (existente) {
      existente.inscricoes.push(rotulo);
    } else {
      const imp = porAtletaImp.get(v.atleta.id);
      porAtleta.set(v.atleta.id, {
        id: v.atleta.id,
        nome: v.atleta.nome,
        delegacao: v.equipe.delegacao.nome,
        inscricoes: [rotulo],
        avisos: avisosDoAtleta(v.atleta, evento),
        impugnacao: imp
          ? {
              status: imp.status as StatusImpugnacao,
              bloqueio: imp.bloqueio,
              motivo: imp.motivo,
              recursoTexto: imp.recursoTexto,
              nomeArquivo: imp.recursoNomeArquivo,
              recursoEm: imp.recursoEm,
              decisaoTexto: imp.decisaoTexto,
              decididoEm: imp.decididoEm,
            }
          : null,
      });
    }
  }
  return [...porAtleta.values()];
}

// Usado pelo sorteio (RN197): quantas impugnações ainda esperam decisão.
export async function contarPendentes(eventoId: number): Promise<number> {
  const todas = await prisma.impugnacao.findMany({ where: { eventoId }, select: { status: true } });
  return todas.filter((i) => estaPendente(i.status as StatusImpugnacao)).length;
}
