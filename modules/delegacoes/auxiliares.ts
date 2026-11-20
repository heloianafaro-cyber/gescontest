"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { exigirPerfil } from "@/modules/usuarios/sessao";
import type { EstadoForm } from "@/modules/eventos/acoes";

const auxiliarSchema = z.object({
  nome: z.string().trim().min(3, "Informe o nome completo").max(100, "O nome é muito longo"),
  celular: z.preprocess((v) => (v === "" || v == null ? undefined : v), z.string().trim().max(20).optional()),
});

const TELA = "/tecnico/auxiliares";

async function delegacaoDoChefe(usuarioId: number) {
  const u = await prisma.usuario.findUnique({ where: { id: usuarioId }, select: { delegacaoId: true } });
  return u?.delegacaoId ?? null;
}

// RN145: o chefe de delegação cadastra técnicos/assistentes (sem acesso ao sistema) da própria delegação.
export async function criarAuxiliar(_anterior: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const sessao = await exigirPerfil("TECNICO");
  const delegacaoId = await delegacaoDoChefe(Number(sessao.user.id));
  if (!delegacaoId) return { erro: "Sua conta ainda não tem delegação. Fale com o coordenador." };

  const resultado = auxiliarSchema.safeParse(Object.fromEntries(formData));
  if (!resultado.success) return { erro: resultado.error.issues[0].message };

  const repetido = await prisma.auxiliar.findFirst({
    where: { delegacaoId, nome: { equals: resultado.data.nome, mode: "insensitive" } },
  });
  if (repetido) return { erro: "Já existe um técnico/assistente com esse nome na sua delegação." };

  await prisma.auxiliar.create({
    data: { nome: resultado.data.nome, celular: resultado.data.celular ?? null, delegacaoId },
  });
  revalidatePath(TELA);
  return { erro: "" };
}

export async function excluirAuxiliar(formData: FormData) {
  const sessao = await exigirPerfil("TECNICO");
  const delegacaoId = await delegacaoDoChefe(Number(sessao.user.id));
  if (!delegacaoId) return;

  const id = z.coerce.number().int().positive().parse(formData.get("auxiliarId"));
  // O filtro por delegação impede o chefe de apagar auxiliares de outra delegação (RN107).
  await prisma.auxiliar.deleteMany({ where: { id, delegacaoId } });
  revalidatePath(TELA);
}