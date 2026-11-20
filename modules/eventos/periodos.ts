"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { exigirCoordenadorDoEvento } from "./acesso";
import { periodoSchema } from "./schemas-periodos";
import type { EstadoForm } from "./acoes";

export async function adicionarPeriodo(
  eventoId: number,
  _anterior: EstadoForm,
  formData: FormData
): Promise<EstadoForm> {
  await exigirCoordenadorDoEvento(eventoId);

  const valores = Object.fromEntries(formData) as Record<string, string>;
  const resultado = periodoSchema.safeParse(valores);
  if (!resultado.success) return { erro: resultado.error.issues[0].message, valores };
  const d = resultado.data;

  const existentes = await prisma.periodoJogos.findMany({ where: { eventoId } });

  if (existentes.some((p) => p.nome.toLowerCase() === d.nome.toLowerCase())) {
    return { erro: "Já existe um período com esse nome neste evento.", valores };
  }
  // Dois períodos não podem se sobrepor ("HH:MM" compara certo como texto).
  const choque = existentes.find((p) => d.horaInicio < p.horaFim && d.horaFim > p.horaInicio);
  if (choque) {
    return { erro: `Esse horário se sobrepõe ao período "${choque.nome}".`, valores };
  }

  await prisma.periodoJogos.create({
    data: {
      eventoId,
      nome: d.nome,
      horaInicio: d.horaInicio,
      horaFim: d.horaFim,
      maxJogosPorLocal: d.maxJogosPorLocal ?? null,
    },
  });
  revalidatePath(`/coordenador/eventos/${eventoId}/periodos`);
  return { erro: "" };
}

export async function removerPeriodo(eventoId: number, formData: FormData) {
  await exigirCoordenadorDoEvento(eventoId);
  const periodoId = z.coerce.number().int().positive().parse(formData.get("periodoId"));

  await prisma.periodoJogos.deleteMany({ where: { id: periodoId, eventoId } });
  revalidatePath(`/coordenador/eventos/${eventoId}/periodos`);
}