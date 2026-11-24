"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { exigirCoordenadorDoEvento } from "@/modules/eventos/acesso";
import { notificar } from "@/modules/eventos/notificar";
import type { EstadoForm } from "@/modules/eventos/acoes";
import { equipesDoJogo, rotuloDoJogo } from "./consultas-db";

const decisaoSchema = z.object({
  decisao: z.enum(["DEFERIDO", "INDEFERIDO"], { message: "Escolha deferir ou indeferir" }),
  texto: z.string().trim().min(5, "Escreva a justificativa da decisão (mínimo de 5 caracteres)").max(1000, "Justificativa longa demais"),
});

// RN235, RN236: só o coordenador do evento decide. Deferido só registra a decisão e avisa:
// se o resultado precisar mudar, o coordenador corrige ou anula o jogo à mão.
export async function decidirRecurso(
  eventoId: number,
  recursoId: number,
  _anterior: EstadoForm,
  formData: FormData
): Promise<EstadoForm> {
  const { sessao } = await exigirCoordenadorDoEvento(eventoId);

  const bruto = Object.fromEntries(formData) as Record<string, string>;
  const dados = decisaoSchema.safeParse(bruto);
  if (!dados.success) return { erro: dados.error.issues[0].message, valores: bruto };

  const recurso = await prisma.recursoDisputa.findFirst({
    where: { id: recursoId, disputa: { torneio: { modalidade: { eventoId } } } },
    select: {
      id: true,
      status: true,
      abertoPorId: true,
      equipe: { select: { delegacaoId: true, delegacao: { select: { nome: true } } } },
      disputa: { select: { id: true, numero: true, fase: true, dataHora: true, partida: { select: { equipeA: { select: { nome: true } }, equipeB: { select: { nome: true } } } } } },
    },
  });
  if (!recurso) return { erro: "Recurso não encontrado neste evento." };
  if (recurso.status !== "ABERTO") return { erro: "Este recurso já foi decidido." };

  const { decisao, texto } = dados.data;
  // Só atualiza se ainda estiver aberto (evita decisão duplicada se dois coordenadores decidirem juntos).
  const { count } = await prisma.recursoDisputa.updateMany({
    where: { id: recursoId, status: "ABERTO" },
    data: { status: decisao, decisaoTexto: texto, decididoPorId: Number(sessao.user.id), decididoEm: new Date() },
  });
  if (count === 0) return { erro: "Este recurso já foi decidido." };

  const jogo = rotuloDoJogo(recurso.disputa);
  const resultado = decisao === "DEFERIDO" ? "deferido" : "indeferido";

  // Quem abriu recebe a decisão com a justificativa.
  await notificar([recurso.abertoPorId], `Seu recurso sobre ${jogo} foi ${resultado}. Decisão: ${texto}`);

  // O chefe da outra equipe do jogo recebe só a decisão (RN236), sem o texto do recurso.
  const outras = (await equipesDoJogo(recurso.disputa.id)).filter((e) => e.delegacaoId !== recurso.equipe.delegacaoId);
  if (outras.length > 0) {
    const chefes = await prisma.usuario.findMany({
      where: { tipo: "TECNICO", delegacaoId: { in: outras.map((e) => e.delegacaoId) } },
      select: { id: true },
    });
    await notificar(
      chefes.map((c) => c.id),
      `Houve um recurso de ${recurso.equipe.delegacao.nome} sobre ${jogo}. O recurso foi ${resultado}. Decisão: ${texto}`
    );
  }

  revalidatePath(`/coordenador/eventos/${eventoId}/recursos`);
  revalidatePath("/tecnico/recursos");
  revalidatePath("/staff/recursos");
  redirect(`/coordenador/eventos/${eventoId}/recursos?ok=1`);
}
