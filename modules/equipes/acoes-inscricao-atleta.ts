"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { exigirPerfil } from "@/modules/usuarios/sessao";
import type { EstadoForm } from "@/modules/eventos/acoes";
import { inscreverAtleta, cancelarInscricaoAtleta } from "./regras-inscricao";

// Avisa o(s) chefe(s) da delegação do atleta no sistema (o e-mail virá com o Resend).
async function avisarChefes(atletaId: number, motivo: string): Promise<number> {
  const atleta = await prisma.usuario.findUnique({
    where: { id: atletaId },
    select: { nome: true, delegacaoId: true },
  });
  if (!atleta?.delegacaoId) return 0;
  const chefes = await prisma.usuario.findMany({
    where: { tipo: "TECNICO", delegacaoId: atleta.delegacaoId },
    select: { id: true },
  });
  if (chefes.length === 0) return 0;
  await prisma.notificacao.createMany({
    data: chefes.map((c) => ({
      usuarioId: c.id,
      mensagem: `O atleta ${atleta.nome} tentou se inscrever e foi bloqueado. ${motivo}`,
    })),
  });
  return chefes.length;
}

// RN152: o próprio atleta se inscreve (opcao: "M:<modalidadeId>" individual ou "E:<equipeId>" coletiva).
export async function inscreverMe(_anterior: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const sessao = await exigirPerfil("ATLETA");
  const atletaId = Number(sessao.user.id);

  const opcao = String(formData.get("opcao") ?? "");
  const m = /^([ME]):(\d+)$/.exec(opcao);
  if (!m) return { erro: "Escolha a modalidade ou a equipe." };
  const alvo = m[1] === "M" ? { modalidadeId: Number(m[2]) } : { equipeId: Number(m[2]) };

  const textoPeso = String(formData.get("peso") ?? "").trim().replace(",", ".");
  const pesoKg = textoPeso ? Number(textoPeso) : null;
  if (pesoKg !== null && !Number.isFinite(pesoKg)) return { erro: "Peso inválido." };

  const naipe = String(formData.get("naipe") ?? "") || null;
  const faixa = String(formData.get("faixa") ?? "") || null;

  const r = await inscreverAtleta({ atletaId, quemId: atletaId, alvo, pesoKg, naipe, faixa });

  if (r.erro && r.bloqueio) {
    const avisados = await avisarChefes(atletaId, r.erro);
    if (avisados > 0) return { erro: `${r.erro} O chefe da sua delegação foi avisado.` };
  }
  if (!r.erro) revalidatePath("/atleta/inscricoes");
  return { erro: r.erro };
}

export async function cancelarMinhaInscricao(formData: FormData) {
  const sessao = await exigirPerfil("ATLETA");
  const atletaId = Number(sessao.user.id);
  const equipeId = z.coerce.number().int().positive().parse(formData.get("equipeId"));

  await cancelarInscricaoAtleta({ atletaId, equipeId });
  revalidatePath("/atleta/inscricoes");
}