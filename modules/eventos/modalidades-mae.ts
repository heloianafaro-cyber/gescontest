"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { exigirCoordenadorDoEvento } from "./acesso";
import { maeSchema } from "./schemas-estrutura";
import type { EstadoForm } from "./acoes";

function atualizarTelas(eventoId: number) {
  revalidatePath(`/coordenador/eventos/${eventoId}/modalidades-mae`);
  revalidatePath(`/coordenador/eventos/${eventoId}/modalidades`);
}

export async function criarMae(
  eventoId: number,
  _anterior: EstadoForm,
  formData: FormData
): Promise<EstadoForm> {
  await exigirCoordenadorDoEvento(eventoId);

  const valores = Object.fromEntries(formData) as Record<string, string>;
  const resultado = maeSchema.safeParse(valores);
  if (!resultado.success) return { erro: resultado.error.issues[0].message, valores };

  const repetida = await prisma.modalidadeMae.findFirst({
    where: { eventoId, nome: { equals: resultado.data.nome, mode: "insensitive" } },
  });
  if (repetida) return { erro: "Já existe uma modalidade com esse nome neste evento.", valores };

  await prisma.modalidadeMae.create({ data: { eventoId, ...resultado.data } });
  atualizarTelas(eventoId);
  return { erro: "" };
}

export async function editarMae(eventoId: number, formData: FormData) {
  await exigirCoordenadorDoEvento(eventoId);
  const maeId = z.coerce.number().int().positive().parse(formData.get("maeId"));

  const resultado = maeSchema.safeParse(Object.fromEntries(formData));
  if (!resultado.success) return;

  const repetida = await prisma.modalidadeMae.findFirst({
    where: { eventoId, nome: { equals: resultado.data.nome, mode: "insensitive" }, NOT: { id: maeId } },
  });
  if (repetida) return;

  await prisma.modalidadeMae.updateMany({ where: { id: maeId, eventoId }, data: resultado.data });
  atualizarTelas(eventoId);
}

export async function excluirMae(eventoId: number, formData: FormData) {
  await exigirCoordenadorDoEvento(eventoId);
  const maeId = z.coerce.number().int().positive().parse(formData.get("maeId"));

  // Só exclui modalidade-mãe sem provas: antes, mova ou exclua as provas.
  const provas = await prisma.modalidade.count({ where: { maeId, eventoId } });
  if (provas > 0) return;

  await prisma.modalidadeMae.deleteMany({ where: { id: maeId, eventoId } });
  atualizarTelas(eventoId);
}