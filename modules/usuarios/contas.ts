"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { hashPassword } from "better-auth/crypto";
import { prisma } from "@/lib/prisma";
import { gerarSenhaProvisoria } from "@/lib/senha";
import { exigirPerfil } from "./sessao";
import { contaSchema } from "./schemas-contas";

export type EstadoConta = {
  erro: string;
  valores?: Record<string, string>;
  criada?: { nome: string; email: string; senha: string };
};

type TipoCriavel = "STAFF" | "TECNICO" | "PROF";

async function criarConta(tipo: TipoCriavel, formData: FormData): Promise<EstadoConta> {
  const valores = Object.fromEntries(formData) as Record<string, string>;
  const resultado = contaSchema.safeParse(valores);
  if (!resultado.success) return { erro: resultado.error.issues[0].message, valores };
  const d = resultado.data;

  if (tipo === "TECNICO") {
    if (!d.delegacaoId) return { erro: "Escolha a delegação do técnico.", valores };
    const delegacao = await prisma.delegacao.findUnique({ where: { id: d.delegacaoId } });
    if (!delegacao) return { erro: "Delegação não encontrada.", valores };
  }

  const existe = await prisma.usuario.findUnique({ where: { email: d.email } });
  if (existe) return { erro: "Já existe uma conta com esse e-mail.", valores };

  const senha = gerarSenhaProvisoria();
  const hash = await hashPassword(senha); // mesmo formato que o login usa

  await prisma.$transaction(async (tx) => {
    const usuario = await tx.usuario.create({
      data: {
        tipo,
        nome: d.nome,
        email: d.email,
        celular: d.celular ?? null,
        emailVerificado: true,
        delegacaoId: tipo === "TECNICO" ? (d.delegacaoId ?? null) : null,
        precisaTrocarSenha: true,
      },
    });
    await tx.conta.create({
      data: {
        userId: usuario.id,
        accountId: String(usuario.id),
        providerId: "credential",
        password: hash,
      },
    });
  });

  return { erro: "", criada: { nome: d.nome, email: d.email, senha } };
}

// RN140: o Prof/Coordenador cria Staff e Técnico.
export async function criarStaff(_anterior: EstadoConta, formData: FormData): Promise<EstadoConta> {
  await exigirPerfil("PROF");
  const resultado = await criarConta("STAFF", formData);
  if (!resultado.erro) revalidatePath("/coordenador/contas");
  return resultado;
}

export async function criarChefe(_anterior: EstadoConta, formData: FormData): Promise<EstadoConta> {
  await exigirPerfil("PROF");
  const resultado = await criarConta("TECNICO", formData);
  if (!resultado.erro) revalidatePath("/coordenador/contas");
  return resultado;
}

// RN141: só o Administrador cria Prof/Coordenador.
export async function criarProf(_anterior: EstadoConta, formData: FormData): Promise<EstadoConta> {
  await exigirPerfil("ADM");
  const resultado = await criarConta("PROF", formData);
  if (!resultado.erro) revalidatePath("/adm/contas");
  return resultado;
}

// RN143: nova senha provisória (Prof para Staff e Técnico; Adm para Prof).
export async function redefinirSenha(_anterior: EstadoConta, formData: FormData): Promise<EstadoConta> {
  const sessao = await exigirPerfil("PROF", "ADM");
  const usuarioId = z.coerce.number().int().positive().parse(formData.get("usuarioId"));

  const alvo = await prisma.usuario.findUnique({ where: { id: usuarioId } });
  if (!alvo) return { erro: "Conta não encontrada." };

  const meuTipo = sessao.user.tipo as string;
  const permitido =
    (meuTipo === "PROF" && (alvo.tipo === "STAFF" || alvo.tipo === "TECNICO")) ||
    (meuTipo === "ADM" && alvo.tipo === "PROF");
  if (!permitido) return { erro: "Você não pode redefinir a senha desta conta." };

  const senha = gerarSenhaProvisoria();
  const hash = await hashPassword(senha);

  await prisma.$transaction([
    prisma.conta.updateMany({
      where: { userId: alvo.id, providerId: "credential" },
      data: { password: hash },
    }),
    prisma.usuario.update({ where: { id: alvo.id }, data: { precisaTrocarSenha: true } }),
    prisma.sessao.deleteMany({ where: { userId: alvo.id } }), // derruba os logins abertos
  ]);

  revalidatePath("/coordenador/contas");
  revalidatePath("/adm/contas");
  return { erro: "", criada: { nome: alvo.nome, email: alvo.email, senha } };
}