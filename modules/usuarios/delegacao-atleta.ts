"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { exigirPerfil } from "./sessao";

export type EstadoDelegacaoAtleta = { erro: string; ok?: boolean };

// RN147: o atleta escolhe (ou troca) a própria delegação.
// Ao trocar, ele sai das equipes da delegação antiga.
export async function escolherDelegacao(
  _anterior: EstadoDelegacaoAtleta,
  formData: FormData
): Promise<EstadoDelegacaoAtleta> {
  const sessao = await exigirPerfil("ATLETA");

  const resultado = z.coerce.number().int().positive().safeParse(formData.get("delegacaoId"));
  if (!resultado.success) return { erro: "Escolha a sua delegação." };
  const delegacaoId = resultado.data;

  const delegacao = await prisma.delegacao.findUnique({ where: { id: delegacaoId } });
  if (!delegacao) return { erro: "Delegação não encontrada." };

  const atletaId = Number(sessao.user.id);

  await prisma.$transaction([
    prisma.usuario.update({ where: { id: atletaId }, data: { delegacaoId } }),
    prisma.equipeAtleta.deleteMany({
      where: { atletaId, equipe: { delegacaoId: { not: delegacaoId } } },
    }),
  ]);

  revalidatePath("/atleta");
  revalidatePath("/atleta/delegacao");
  return { erro: "", ok: true };
}