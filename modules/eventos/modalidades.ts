"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { exigirCoordenadorDoEvento } from "./acesso";
import { modalidadeSchema } from "./schemas-estrutura";
import type { EstadoForm } from "./acoes";

type Dados = z.infer<typeof modalidadeSchema>;

function paraBanco(d: Dados) {
  const luta = d.formatoPlacar === "LUTA";
  return {
    nome: d.nome,
    tipo: d.tipo,
    minAtletas: d.minAtletas,
    maxAtletas: d.maxAtletas,
    minEquipes: d.minEquipes,
    formatoPlacar: d.formatoPlacar ?? null,
    criteriosDesempate:
      d.formatoPlacar === "CORRIDO" || d.formatoPlacar === "SETS"
        ? ([d.criterio1, d.criterio2, d.criterio3, d.criterio4, d.criterio5, d.criterio6].filter(Boolean) as string[])
        : [],
    desempateMataMata: d.formatoPlacar === "CORRIDO" ? (d.desempateMataMata ?? null) : null,
    prorrogacaoMin:
      d.formatoPlacar === "CORRIDO" && d.desempateMataMata === "PRORROGACAO_PENALTIS" ? (d.prorrogacaoMin ?? null) : null,
    marcaMenorMelhor: d.formatoPlacar === "MARCA" ? d.sentidoMarca === "menor" : null,
    maeId: d.maeId ?? null,
    // RN157: critérios de categoria só existem em lutas.
    catPeso: luta ? d.catPeso : true,
    catIdade: luta ? d.catIdade : false,
    catFaixa: luta ? d.catFaixa : false,
    faixas: luta && d.catFaixa ? d.faixas : [],
  };
}

function textos(formData: FormData) {
  return Object.fromEntries(formData) as Record<string, string>;
}

function atualizarTelas(eventoId: number) {
  revalidatePath(`/coordenador/eventos/${eventoId}/modalidades`);
  revalidatePath(`/coordenador/eventos/${eventoId}/modalidades-mae`);
}

// RN155: a modalidade-mãe escolhida precisa ser do mesmo evento.
async function maeInvalida(eventoId: number, maeId?: number) {
  if (!maeId) return false;
  const mae = await prisma.modalidadeMae.findFirst({ where: { id: maeId, eventoId } });
  return !mae;
}

export async function criarModalidade(
  eventoId: number,
  _anterior: EstadoForm,
  formData: FormData
): Promise<EstadoForm> {
  await exigirCoordenadorDoEvento(eventoId);

  const resultado = modalidadeSchema.safeParse(Object.fromEntries(formData));
  if (!resultado.success) {
    return { erro: resultado.error.issues[0].message, valores: textos(formData) };
  }

  if (await maeInvalida(eventoId, resultado.data.maeId)) {
    return { erro: "Modalidade não encontrada neste evento.", valores: textos(formData) };
  }

  const repetida = await prisma.modalidade.findFirst({
    where: { eventoId, nome: { equals: resultado.data.nome, mode: "insensitive" } },
  });
  if (repetida) {
    return { erro: "Já existe uma modalidade/prova com esse nome neste evento.", valores: textos(formData) };
  }

  await prisma.modalidade.create({ data: { eventoId, ...paraBanco(resultado.data) } });
  atualizarTelas(eventoId);
  return { erro: "" };
}

export async function editarModalidade(
  eventoId: number,
  modalidadeId: number,
  _anterior: EstadoForm,
  formData: FormData
): Promise<EstadoForm> {
  await exigirCoordenadorDoEvento(eventoId);

  const existe = await prisma.modalidade.findFirst({ where: { id: modalidadeId, eventoId } });
  if (!existe) notFound();

  const resultado = modalidadeSchema.safeParse(Object.fromEntries(formData));
  if (!resultado.success) {
    return { erro: resultado.error.issues[0].message, valores: textos(formData) };
  }

  if (await maeInvalida(eventoId, resultado.data.maeId)) {
    return { erro: "Modalidade não encontrada neste evento.", valores: textos(formData) };
  }

  const repetida = await prisma.modalidade.findFirst({
    where: {
      eventoId,
      nome: { equals: resultado.data.nome, mode: "insensitive" },
      NOT: { id: modalidadeId },
    },
  });
  if (repetida) {
    return { erro: "Já existe uma modalidade/prova com esse nome neste evento.", valores: textos(formData) };
  }

  // RN128: o formato do placar só muda enquanto a modalidade não tem torneios.
  if ((resultado.data.formatoPlacar ?? null) !== existe.formatoPlacar) {
    const torneios = await prisma.torneio.count({ where: { modalidadeId } });
    if (torneios > 0) {
      return {
        erro: "Para mudar o formato do placar, exclua antes os torneios desta modalidade.",
        valores: textos(formData),
      };
    }
  }

  await prisma.modalidade.update({ where: { id: modalidadeId }, data: paraBanco(resultado.data) });
  atualizarTelas(eventoId);
  redirect(`/coordenador/eventos/${eventoId}/modalidades`);
}

export async function excluirModalidade(eventoId: number, formData: FormData) {
  await exigirCoordenadorDoEvento(eventoId);
  const modalidadeId = z.coerce.number().int().positive().parse(formData.get("modalidadeId"));

  // RN119: pode excluir mesmo com torneios ou equipes; o banco apaga tudo em cascata.
  await prisma.modalidade.deleteMany({ where: { id: modalidadeId, eventoId } });
  atualizarTelas(eventoId);
}
