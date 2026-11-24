"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { exigirPerfil } from "@/modules/usuarios/sessao";
import { notificar } from "@/modules/eventos/notificar";
import type { EstadoForm } from "@/modules/eventos/acoes";
import { prazoEncerrado, validarLink } from "./regras";
import { equipesDoJogo, rotuloDoJogo, selecaoDoJogo } from "./consultas-db";

const recursoSchema = z.object({
  assunto: z.enum(["ARBITRAGEM", "ORGANIZACAO", "OUTRO"], { message: "Escolha o assunto do recurso" }),
  texto: z.string().trim().min(20, "Explique o recurso com pelo menos 20 caracteres").max(2000, "Texto longo demais (máximo 2000 caracteres)"),
  link: z.string().optional().default(""),
});

// RN232-RN234: o chefe abre recurso sobre um jogo em que uma equipe da própria delegação participa.
export async function abrirRecurso(disputaId: number, _anterior: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const sessao = await exigirPerfil("TECNICO");
  const chefeId = Number(sessao.user.id);
  const chefe = await prisma.usuario.findUnique({
    where: { id: chefeId },
    select: { delegacaoId: true, delegacao: { select: { nome: true } } },
  });
  if (!chefe?.delegacaoId) return { erro: "Sua conta ainda não tem delegação." };

  const bruto = Object.fromEntries(formData) as Record<string, string>;
  const dados = recursoSchema.safeParse(bruto);
  if (!dados.success) return { erro: dados.error.issues[0].message, valores: bruto };
  const link = validarLink(dados.data.link);
  if (!link.ok) return { erro: link.erro, valores: bruto };

  const jogo = await prisma.disputa.findUnique({ where: { id: disputaId }, select: selecaoDoJogo });
  if (!jogo) return { erro: "Jogo não encontrado.", valores: bruto };
  if (jogo.status === "CANCELADA") return { erro: "Este jogo foi cancelado.", valores: bruto };

  const minha = (await equipesDoJogo(disputaId)).find((e) => e.delegacaoId === chefe.delegacaoId);
  if (!minha) return { erro: "Sua delegação não participa deste jogo.", valores: bruto };

  if (prazoEncerrado({ horas: jogo.torneio.modalidade.evento.recursoPartidaHoras, resultadoEm: jogo.resultadoEm, status: jogo.status })) {
    return { erro: "O prazo para recurso deste jogo já terminou.", valores: bruto };
  }

  const existente = await prisma.recursoDisputa.findUnique({
    where: { disputaId_equipeId: { disputaId, equipeId: minha.id } },
    select: { id: true },
  });
  if (existente) return { erro: "Sua equipe já abriu recurso neste jogo.", valores: bruto };

  await prisma.recursoDisputa.create({
    data: {
      disputaId,
      equipeId: minha.id,
      abertoPorId: chefeId,
      assunto: dados.data.assunto,
      texto: dados.data.texto,
      linkProvas: link.link,
    },
  });

  const eventoId = jogo.torneio.modalidade.eventoId;
  const coordenadores = await prisma.eventoCoordenador.findMany({ where: { eventoId }, select: { usuarioId: true } });
  await notificar(
    coordenadores.map((c) => c.usuarioId),
    `Novo recurso de ${chefe.delegacao?.nome ?? "uma delegação"}: ${rotuloDoJogo(jogo)} (${jogo.torneio.modalidade.nome}). Veja em Recursos de jogos.`
  );

  revalidatePath("/tecnico/recursos");
  revalidatePath(`/coordenador/eventos/${eventoId}/recursos`);
  redirect("/tecnico/recursos?ok=1");
}
