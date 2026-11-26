"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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

type TipoCriavel = "STAFF" | "TECNICO" | "PROF" | "ADM";

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

// RN244: o Administrador cria outros Administradores (o primeiro é promovido no banco, uma única vez).
export async function criarAdm(_anterior: EstadoConta, formData: FormData): Promise<EstadoConta> {
  await exigirPerfil("ADM");
  const resultado = await criarConta("ADM", formData);
  if (!resultado.erro) revalidatePath("/adm/contas");
  return resultado;
}

// RN143: nova senha provisória (Prof para Staff e Técnico; Adm para qualquer conta que não seja a sua).
export async function redefinirSenha(_anterior: EstadoConta, formData: FormData): Promise<EstadoConta> {
  const sessao = await exigirPerfil("PROF", "ADM");
  const usuarioId = z.coerce.number().int().positive().parse(formData.get("usuarioId"));

  const alvo = await prisma.usuario.findUnique({ where: { id: usuarioId } });
  if (!alvo) return { erro: "Conta não encontrada." };

  const meuTipo = sessao.user.tipo as string;
  const permitido =
    (meuTipo === "PROF" && (alvo.tipo === "STAFF" || alvo.tipo === "TECNICO")) ||
    (meuTipo === "ADM" && alvo.id !== Number(sessao.user.id));
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

// RN242-RN243: o Administrador desativa e reativa contas. Desativar derruba os logins abertos e recusa novos;
// o histórico (inscrições, resultados, recursos) permanece. Ninguém desativa a própria conta e sempre resta um ADM ativo.
export async function alternarAtivo(formData: FormData) {
  const sessao = await exigirPerfil("ADM");
  const usuarioId = z.coerce.number().int().positive().parse(formData.get("usuarioId"));
  const ativar = formData.get("ativar") === "1";
  const voltaInformada = String(formData.get("volta") ?? "");
  // Volta para a lista de onde veio (ativas ou desativadas); só esses dois destinos são aceitos.
  const volta = voltaInformada.includes("situacao=desativadas") ? "/adm/contas?situacao=desativadas" : "/adm/contas";
  const sair = (campo: "ok" | "erro", texto: string) =>
    redirect(`${volta}${volta.includes("?") ? "&" : "?"}${campo}=${encodeURIComponent(texto)}`);

  const alvo = await prisma.usuario.findUnique({ where: { id: usuarioId } });
  if (!alvo) return sair("erro", "Conta não encontrada.");
  if (alvo.id === Number(sessao.user.id)) return sair("erro", "Você não pode desativar a sua própria conta.");

  if (!ativar && alvo.tipo === "ADM") {
    const outros = await prisma.usuario.count({ where: { tipo: "ADM", ativo: true, id: { not: alvo.id } } });
    if (outros === 0) return sair("erro", "É preciso manter pelo menos um administrador ativo.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.usuario.update({
      where: { id: alvo.id },
      data: ativar ? { ativo: true, desativadoEm: null } : { ativo: false, desativadoEm: new Date() },
    });
    if (!ativar) await tx.sessao.deleteMany({ where: { userId: alvo.id } });
  });

  revalidatePath("/adm/contas");
  return sair("ok", ativar ? `Conta de ${alvo.nome} reativada.` : `Conta de ${alvo.nome} desativada.`);
}
