"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rotaInicial } from "./sessao";
import { trocaSenhaSchema } from "./schemas-contas";

export type EstadoSenha = { erro: string };

export async function trocarSenhaInicial(_anterior: EstadoSenha, formData: FormData): Promise<EstadoSenha> {
  const cabecalhos = await headers();
  const sessao = await auth.api.getSession({ headers: cabecalhos });
  if (!sessao) redirect("/login");

  const resultado = trocaSenhaSchema.safeParse(Object.fromEntries(formData));
  if (!resultado.success) return { erro: resultado.error.issues[0].message };

  try {
    await auth.api.changePassword({
      body: { currentPassword: resultado.data.senhaAtual, newPassword: resultado.data.novaSenha },
      headers: cabecalhos,
    });
  } catch {
    return { erro: "A senha atual (provisória) está incorreta." };
  }

  await prisma.usuario.update({
    where: { id: Number(sessao.user.id) },
    data: { precisaTrocarSenha: false },
  });

  redirect(rotaInicial[sessao.user.tipo as string] ?? "/painel");
}