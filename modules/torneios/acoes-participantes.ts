"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { exigirCoordenadorDoEvento } from "@/modules/eventos/acesso";
import { incluirEquipesCompativeis } from "./participantes";

// Confere que o torneio é da modalidade e do evento; devolve o torneio.
async function torneioDoEvento(eventoId: number, modalidadeId: number, torneioId: number) {
  await exigirCoordenadorDoEvento(eventoId);
  const torneio = await prisma.torneio.findFirst({
    where: { id: torneioId, modalidadeId, modalidade: { eventoId } },
  });
  if (!torneio) notFound();
  return torneio;
}

// RN166: se os participantes mudam depois do sorteio, o sorteio perde a validade e precisa ser refeito.
async function invalidarSorteio(torneio: { id: number; sorteioEm: Date | null }) {
  if (!torneio.sorteioEm) return;
  await prisma.$transaction([
    prisma.torneioEquipe.updateMany({ where: { torneioId: torneio.id }, data: { grupo: null, posicao: null } }),
    prisma.torneio.update({ where: { id: torneio.id }, data: { sorteioEm: null } }),
  ]);
}

function atualizar(eventoId: number, modalidadeId: number, torneioId: number) {
  const base = `/coordenador/eventos/${eventoId}/modalidades/${modalidadeId}/torneios`;
  revalidatePath(base);
  revalidatePath(`${base}/${torneioId}/participantes`);
}

// RN165: inclui as equipes compatíveis (mesmo naipe / mesma categoria) que ainda não estão em torneio.
export async function incluirCompativeis(eventoId: number, modalidadeId: number, torneioId: number) {
  const torneio = await torneioDoEvento(eventoId, modalidadeId, torneioId);
  await incluirEquipesCompativeis(modalidadeId, torneioId);
  await invalidarSorteio(torneio);
  atualizar(eventoId, modalidadeId, torneioId);
}

// RN165: o coordenador inclui uma equipe à mão.
export async function incluirParticipante(
  eventoId: number,
  modalidadeId: number,
  torneioId: number,
  formData: FormData
) {
  const torneio = await torneioDoEvento(eventoId, modalidadeId, torneioId);
  const equipeId = z.coerce.number().int().positive().parse(formData.get("equipeId"));
  const equipe = await prisma.equipe.findFirst({ where: { id: equipeId, modalidadeId } });
  if (!equipe) return;
  await prisma.torneioEquipe.createMany({ data: [{ torneioId, equipeId }], skipDuplicates: true });
  await invalidarSorteio(torneio);
  atualizar(eventoId, modalidadeId, torneioId);
}

// RN165: o coordenador retira uma equipe do torneio.
export async function retirarParticipante(
  eventoId: number,
  modalidadeId: number,
  torneioId: number,
  formData: FormData
) {
  const torneio = await torneioDoEvento(eventoId, modalidadeId, torneioId);
  const equipeId = z.coerce.number().int().positive().parse(formData.get("equipeId"));
  await prisma.torneioEquipe.deleteMany({ where: { torneioId, equipeId } });
  await invalidarSorteio(torneio);
  atualizar(eventoId, modalidadeId, torneioId);
}
