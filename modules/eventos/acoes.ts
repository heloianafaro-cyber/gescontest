"use server";

import type { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { exigirPerfil } from "@/modules/usuarios/sessao";
import { exigirCoordenadorDoEvento } from "./acesso";
import { eventoSchema } from "./schemas";

// "valores" devolve o que a pessoa digitou, para o formulário não esvaziar quando há erro.
export type EstadoForm = { erro: string; valores?: Record<string, string> };

type DadosEvento = z.infer<typeof eventoSchema>;

function paraBanco(d: DadosEvento) {
  return {
    nome: d.nome,
    dataInicio: new Date(d.dataInicio),
    dataFim: new Date(d.dataFim),
    idadeLimite: d.idadeLimite ?? null,
    maxModTotal: d.maxModTotal ?? null,
    maxModInd: d.maxModInd ?? null,
    maxModCol: d.maxModCol ?? null,
  };
}

function textos(formData: FormData) {
  return Object.fromEntries(formData) as Record<string, string>;
}

export async function criarEvento(_anterior: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const sessao = await exigirPerfil("PROF");

  const resultado = eventoSchema.safeParse(Object.fromEntries(formData));
  if (!resultado.success) {
    return { erro: resultado.error.issues[0].message, valores: textos(formData) };
  }

  // Quem cria o evento passa a ser coordenador dele (RN111).
  await prisma.evento.create({
    data: {
      ...paraBanco(resultado.data),
      coordenadores: { create: { usuarioId: Number(sessao.user.id) } },
    },
  });

  revalidatePath("/coordenador/eventos");
  redirect("/coordenador/eventos");
}

export async function editarEvento(
  eventoId: number,
  _anterior: EstadoForm,
  formData: FormData
): Promise<EstadoForm> {
  await exigirCoordenadorDoEvento(eventoId);

  const resultado = eventoSchema.safeParse(Object.fromEntries(formData));
  if (!resultado.success) {
    return { erro: resultado.error.issues[0].message, valores: textos(formData) };
  }

  await prisma.evento.update({ where: { id: eventoId }, data: paraBanco(resultado.data) });

  revalidatePath("/coordenador/eventos");
  redirect("/coordenador/eventos");
}

export async function excluirEvento(
  eventoId: number,
  _anterior: EstadoForm,
  formData: FormData
): Promise<EstadoForm> {
  const { evento } = await exigirCoordenadorDoEvento(eventoId);

  // Com mais de um coordenador, a exclusão passa pelo pedido de aprovação (RN116).
  const total = await prisma.eventoCoordenador.count({ where: { eventoId } });
  if (total > 1) {
    return { erro: "Este evento tem mais de um coordenador: a exclusão precisa da aprovação de todos." };
  }

  const confirmacao = String(formData.get("confirmacao") ?? "").trim();
  if (confirmacao !== evento.nome) {
    return { erro: "O nome digitado não confere com o nome do evento." };
  }

  await prisma.evento.delete({ where: { id: eventoId } });

  revalidatePath("/coordenador/eventos");
  redirect("/coordenador/eventos");
}