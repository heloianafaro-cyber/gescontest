"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { exigirPerfil } from "@/modules/usuarios/sessao";
import { situacaoInscricao } from "@/modules/eventos/inscricoes";
import type { EstadoForm } from "@/modules/eventos/acoes";
import { incluirEquipeNosTorneios } from "@/modules/torneios/participantes";

const equipeSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome da equipe").max(60, "O nome é muito longo"),
  naipe: z.enum(["MASCULINO", "FEMININO", "MISTO"], { message: "Escolha o naipe" }),
});

// Chefe de delegação logado, com a delegação dele.
async function chefeLogado() {
  const sessao = await exigirPerfil("TECNICO");
  const id = Number(sessao.user.id);
  const u = await prisma.usuario.findUnique({ where: { id }, select: { delegacaoId: true } });
  return { id, delegacaoId: u?.delegacaoId ?? null };
}

// RN146: o chefe cria equipes da própria delegação, em modalidades coletivas.
export async function criarEquipe(
  modalidadeId: number,
  _anterior: EstadoForm,
  formData: FormData
): Promise<EstadoForm> {
  const chefe = await chefeLogado();
  if (!chefe.delegacaoId) return { erro: "Sua conta ainda não tem delegação. Fale com o coordenador." };

  const valores = Object.fromEntries(formData) as Record<string, string>;
  const resultado = equipeSchema.safeParse(valores);
  if (!resultado.success) return { erro: resultado.error.issues[0].message, valores };

  const modalidade = await prisma.modalidade.findUnique({
    where: { id: modalidadeId },
    include: { evento: true },
  });
  if (!modalidade) return { erro: "Modalidade não encontrada.", valores };
  if (modalidade.tipo !== "COLETIVA") {
    return { erro: "Em modalidade individual a equipe é criada na inscrição do atleta.", valores };
  }

  const prazo = situacaoInscricao(modalidade.evento);
  if (!prazo.aberta) return { erro: prazo.motivo, valores };

  const repetida = await prisma.equipe.findFirst({
    where: {
      modalidadeId,
      delegacaoId: chefe.delegacaoId,
      nome: { equals: resultado.data.nome, mode: "insensitive" },
    },
  });
  if (repetida) return { erro: "Sua delegação já tem uma equipe com esse nome nesta modalidade." };

  const nova = await prisma.equipe.create({
    data: {
      nome: resultado.data.nome,
      naipe: resultado.data.naipe,
      modalidadeId,
      delegacaoId: chefe.delegacaoId,
      criadorId: chefe.id,
    },
  });
  await incluirEquipeNosTorneios(nova.id); // RN165: já entra nos torneios do mesmo naipe

  revalidatePath(`/tecnico/equipes/${modalidade.eventoId}`);
  return { erro: "" };
}

export async function excluirEquipe(formData: FormData) {
  const chefe = await chefeLogado();
  if (!chefe.delegacaoId) return;
  const equipeId = z.coerce.number().int().positive().parse(formData.get("equipeId"));

  const equipe = await prisma.equipe.findFirst({
    where: { id: equipeId, delegacaoId: chefe.delegacaoId }, // só equipes da própria delegação (RN107)
    include: { modalidade: { include: { evento: true } }, _count: { select: { partidasA: true, partidasB: true } } },
  });
  if (!equipe) return;
  if (!situacaoInscricao(equipe.modalidade.evento).aberta) return;
  if (equipe._count.partidasA + equipe._count.partidasB > 0) return; // já tem jogos

  await prisma.equipe.delete({ where: { id: equipe.id } });
  revalidatePath(`/tecnico/equipes/${equipe.modalidade.eventoId}`);
}

// RN146: o chefe indica os técnicos/assistentes responsáveis por cada equipe.
export async function definirResponsaveis(formData: FormData) {
  const chefe = await chefeLogado();
  if (!chefe.delegacaoId) return;
  const equipeId = z.coerce.number().int().positive().parse(formData.get("equipeId"));
  const ids = formData.getAll("auxiliarIds").map(Number).filter((n) => Number.isInteger(n) && n > 0);

  const equipe = await prisma.equipe.findFirst({
    where: { id: equipeId, delegacaoId: chefe.delegacaoId },
    include: { modalidade: true },
  });
  if (!equipe) return;

  // Só auxiliares da própria delegação.
  const validos = await prisma.auxiliar.findMany({
    where: { id: { in: ids }, delegacaoId: chefe.delegacaoId },
    select: { id: true },
  });

  await prisma.$transaction([
    prisma.equipeAuxiliar.deleteMany({ where: { equipeId: equipe.id } }),
    prisma.equipeAuxiliar.createMany({
      data: validos.map((a) => ({ auxiliarId: a.id, equipeId: equipe.id })),
    }),
  ]);
  revalidatePath(`/tecnico/equipes/${equipe.modalidade.eventoId}`);
}
