"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { exigirPerfil } from "@/modules/usuarios/sessao";
import type { EstadoForm } from "@/modules/eventos/acoes";
import { inscreverAtleta, cancelarInscricaoAtleta } from "./regras-inscricao";
import { redirect } from "next/navigation";

async function chefeLogado() {
  const sessao = await exigirPerfil("TECNICO");
  const id = Number(sessao.user.id);
  const u = await prisma.usuario.findUnique({ where: { id }, select: { delegacaoId: true } });
  return { id, delegacaoId: u?.delegacaoId ?? null };
}

// RN147/RN153: o chefe inclui na própria delegação um atleta já cadastrado, buscando por e-mail ou matrícula.
export async function incluirAtleta(_anterior: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const chefe = await chefeLogado();
  if (!chefe.delegacaoId) return { erro: "Sua conta ainda não tem delegação. Fale com o coordenador." };

  const busca = String(formData.get("busca") ?? "").trim();
  if (busca.length < 3) return { erro: "Informe o e-mail ou a matrícula do atleta." };

  const atleta = await prisma.usuario.findFirst({
    where: {
      tipo: "ATLETA",
      OR: [{ email: busca.toLowerCase() }, { matricula: busca }],
    },
    select: { id: true, delegacaoId: true },
  });
  if (!atleta) return { erro: "Nenhum atleta cadastrado com esse e-mail ou matrícula.", valores: { busca } };

  if (atleta.delegacaoId === chefe.delegacaoId) return { erro: "Este atleta já está na sua delegação.", valores: { busca }};
  if (atleta.delegacaoId) {
    // Só o próprio atleta troca de delegação.
    return { erro: "Este atleta já pertence a outra delegação. Só ele mesmo pode trocar de delegação.", valores: { busca }};
  }

  await prisma.usuario.update({ where: { id: atleta.id }, data: { delegacaoId: chefe.delegacaoId } });
  revalidatePath("/tecnico/atletas");
  return { erro: "" };
}

// RN153: o chefe inscreve o atleta (opcao: "M:<modalidadeId>" individual ou "E:<equipeId>" coletiva).
export async function inscreverNaModalidade(
  atletaId: number,
  _anterior: EstadoForm,
  formData: FormData
): Promise<EstadoForm> {
  const chefe = await chefeLogado();
  if (!chefe.delegacaoId) return { erro: "Sua conta ainda não tem delegação." };

  const opcao = String(formData.get("opcao") ?? "");
  const m = /^([ME]):(\d+)$/.exec(opcao);
  if (!m) return { erro: "Escolha a modalidade ou a equipe." };
  const alvo = m[1] === "M" ? { modalidadeId: Number(m[2]) } : { equipeId: Number(m[2]) };

  const textoPeso = String(formData.get("peso") ?? "").trim().replace(",", ".");
  const pesoKg = textoPeso ? Number(textoPeso) : null;
  if (pesoKg !== null && !Number.isFinite(pesoKg)) return { erro: "Peso inválido." };

  const naipe = String(formData.get("naipe") ?? "") || null;
  const faixa = String(formData.get("faixa") ?? "") || null;

  const r = await inscreverAtleta({
    atletaId,
    quemId: chefe.id,
    alvo,
    pesoKg,
    naipe,
    faixa,
    delegacaoDoChefe: chefe.delegacaoId,
  });
  if (!r.erro) revalidatePath(`/tecnico/atletas/${atletaId}`);
  return r;
}

export async function cancelarInscricao(formData: FormData) {
  const chefe = await chefeLogado();
  if (!chefe.delegacaoId) return;
  const atletaId = z.coerce.number().int().positive().parse(formData.get("atletaId"));
  const equipeId = z.coerce.number().int().positive().parse(formData.get("equipeId"));

  const r = await cancelarInscricaoAtleta({ atletaId, equipeId, delegacaoDoChefe: chefe.delegacaoId });
  if (r.erro) redirect(`/tecnico/atletas/${atletaId}?erro=${encodeURIComponent(r.erro)}`);
  revalidatePath(`/tecnico/atletas/${atletaId}`);
}
