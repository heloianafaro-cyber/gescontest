"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { exigirPerfil } from "@/modules/usuarios/sessao";
import type { EstadoForm } from "@/modules/eventos/acoes";

const nomeSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome da delegação").max(80, "O nome é muito longo"),
});

const TELA = "/coordenador/delegacoes";

export async function criarDelegacao(_anterior: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const sessao = await exigirPerfil("PROF");

  const resultado = nomeSchema.safeParse(Object.fromEntries(formData));
  if (!resultado.success) return { erro: resultado.error.issues[0].message };

  const repetida = await prisma.delegacao.findFirst({
    where: { nome: { equals: resultado.data.nome, mode: "insensitive" } },
  });
  if (repetida) return { erro: "Já existe uma delegação com esse nome." };

  await prisma.delegacao.create({ data: { nome: resultado.data.nome, profId: Number(sessao.user.id) } });
  revalidatePath(TELA);
  return { erro: "" };
}

export async function renomearDelegacao(formData: FormData) {
  await exigirPerfil("PROF");
  const id = z.coerce.number().int().positive().parse(formData.get("delegacaoId"));

  const resultado = nomeSchema.safeParse({ nome: formData.get("nome") });
  if (!resultado.success) return;

  const repetida = await prisma.delegacao.findFirst({
    where: { nome: { equals: resultado.data.nome, mode: "insensitive" }, NOT: { id } },
  });
  if (repetida) return;

  await prisma.delegacao.update({ where: { id }, data: { nome: resultado.data.nome } });
  revalidatePath(TELA);
}

export async function excluirDelegacao(formData: FormData) {
  await exigirPerfil("PROF");
  const id = z.coerce.number().int().positive().parse(formData.get("delegacaoId"));

  const uso = await prisma.delegacao.findUnique({
    where: { id },
    include: { _count: { select: { membros: true, equipes: true, auxiliares: true } } },
  });
  // RN144: só exclui delegação sem membros, equipes ou auxiliares.
  if (!uso || uso._count.membros + uso._count.equipes + uso._count.auxiliares > 0) return;

  await prisma.delegacao.delete({ where: { id } });
  revalidatePath(TELA);
}