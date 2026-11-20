"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { exigirCoordenadorDoEvento } from "@/modules/eventos/acesso";
import { exigirPerfil } from "@/modules/usuarios/sessao";
import type { EstadoForm } from "@/modules/eventos/acoes";
import { aplicarAcao } from "./avanco";

function textos(formData: FormData) {
  return Object.fromEntries(formData) as Record<string, string>;
}

async function jogoDoEvento(eventoId: number, disputaId: number) {
  return prisma.disputa.findFirst({
    where: { id: disputaId, torneio: { modalidade: { eventoId } } },
    select: { id: true, torneioId: true, torneio: { select: { modalidadeId: true } } },
  });
}

// Coordenador: registra, corrige e anula (RN181, RN184).
export async function registrarComoCoordenador(
  eventoId: number,
  disputaId: number,
  _anterior: EstadoForm,
  formData: FormData
): Promise<EstadoForm> {
  await exigirCoordenadorDoEvento(eventoId);
  const jogo = await jogoDoEvento(eventoId, disputaId);
  if (!jogo) return { erro: "Jogo não encontrado neste evento." };

  const r = await aplicarAcao(disputaId, "COORDENADOR", formData);
  if (r.erro) return { erro: r.erro, valores: textos(formData) };

  const volta = `/coordenador/eventos/${eventoId}/modalidades/${jogo.torneio.modalidadeId}/torneios/${jogo.torneioId}/jogos`;
  revalidatePath(volta);
  revalidatePath(`/staff/jogos/${eventoId}`);
  redirect(volta);
}

// Staff: registra e corrige enquanto nenhum jogo seguinte começou (RN184).
export async function registrarComoStaff(
  eventoId: number,
  disputaId: number,
  _anterior: EstadoForm,
  formData: FormData
): Promise<EstadoForm> {
  await exigirPerfil("STAFF");
  const jogo = await jogoDoEvento(eventoId, disputaId);
  if (!jogo) return { erro: "Jogo não encontrado neste evento." };

  const r = await aplicarAcao(disputaId, "STAFF", formData);
  if (r.erro) return { erro: r.erro, valores: textos(formData) };

  revalidatePath(`/staff/jogos/${eventoId}`);
  revalidatePath(`/coordenador/eventos/${eventoId}/modalidades/${jogo.torneio.modalidadeId}/torneios/${jogo.torneioId}/jogos`);
  redirect(`/staff/jogos/${eventoId}`);
}
