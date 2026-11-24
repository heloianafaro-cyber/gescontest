"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { exigirCoordenadorDoEvento } from "./acesso";
import { torneioSchema } from "./schemas-estrutura";
import { montarDados } from "./regras-torneio";
import type { EstadoForm } from "./acoes";
import { incluirEquipesCompativeis } from "@/modules/torneios/participantes";

function textos(formData: FormData) {
  return Object.fromEntries(formData) as Record<string, string>;
}

function atualizarTelas(eventoId: number, modalidadeId: number) {
  revalidatePath(`/coordenador/eventos/${eventoId}/modalidades/${modalidadeId}/torneios`);
  revalidatePath(`/coordenador/eventos/${eventoId}/modalidades`);
}

export async function criarTorneio(
  eventoId: number,
  modalidadeId: number,
  _anterior: EstadoForm,
  formData: FormData
): Promise<EstadoForm> {
  await exigirCoordenadorDoEvento(eventoId);

  const modalidade = await prisma.modalidade.findFirst({ where: { id: modalidadeId, eventoId } });
  if (!modalidade) notFound();

  const resultado = torneioSchema.safeParse(Object.fromEntries(formData));
  if (!resultado.success) {
    return { erro: resultado.error.issues[0].message, valores: textos(formData) };
  }

  const montado = montarDados(modalidade.formatoPlacar, resultado.data, modalidade)
  if (montado.erro !== undefined) return { erro: montado.erro, valores: textos(formData) };

  const repetido = await prisma.torneio.findFirst({
    where: { modalidadeId, nome: { equals: resultado.data.nome, mode: "insensitive" } },
  });
  if (repetido) {
    return { erro: "Já existe um torneio com esse nome nesta modalidade.", valores: textos(formData) };
  }

  await prisma.torneio.create({ data: { modalidadeId, ...montado.dados } });
  await incluirEquipesCompativeis(modalidadeId); // RN165: já coloca as equipes compatíveis
  atualizarTelas(eventoId, modalidadeId);
  return { erro: "" };
}

export async function editarTorneio(
  eventoId: number,
  modalidadeId: number,
  torneioId: number,
  _anterior: EstadoForm,
  formData: FormData
): Promise<EstadoForm> {
  await exigirCoordenadorDoEvento(eventoId);

  const modalidade = await prisma.modalidade.findFirst({ where: { id: modalidadeId, eventoId } });
  if (!modalidade) notFound();
  const torneio = await prisma.torneio.findFirst({ where: { id: torneioId, modalidadeId } });
  if (!torneio) notFound();

  const resultado = torneioSchema.safeParse(Object.fromEntries(formData));
  if (!resultado.success) {
    return { erro: resultado.error.issues[0].message, valores: textos(formData) };
  }

  const montado = montarDados(modalidade.formatoPlacar, resultado.data, modalidade)
  if (montado.erro !== undefined) return { erro: montado.erro, valores: textos(formData) };

  const repetido = await prisma.torneio.findFirst({
    where: {
      modalidadeId,
      nome: { equals: resultado.data.nome, mode: "insensitive" },
      NOT: { id: torneioId },
    },
  });
  if (repetido) {
    return { erro: "Já existe um torneio com esse nome nesta modalidade.", valores: textos(formData) };
  }

  await prisma.torneio.update({ where: { id: torneioId }, data: montado.dados });
  atualizarTelas(eventoId, modalidadeId);
  redirect(`/coordenador/eventos/${eventoId}/modalidades/${modalidadeId}/torneios`);
}

export async function excluirTorneio(eventoId: number, modalidadeId: number, formData: FormData) {
  await exigirCoordenadorDoEvento(eventoId);
  const torneioId = z.coerce.number().int().positive().parse(formData.get("torneioId"));

  // RN127: apaga também os jogos do torneio (cascata no banco).
  await prisma.torneio.deleteMany({
    where: { id: torneioId, modalidadeId, modalidade: { eventoId } },
  });
  atualizarTelas(eventoId, modalidadeId);
}
