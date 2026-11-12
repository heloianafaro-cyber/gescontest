"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { exigirCoordenadorDoEvento } from "./acesso";
import { localSchema } from "./schemas-estrutura";
import type { EstadoForm } from "./acoes";

export async function adicionarLocal(
  eventoId: number,
  _anterior: EstadoForm,
  formData: FormData
): Promise<EstadoForm> {
  await exigirCoordenadorDoEvento(eventoId);

  const resultado = localSchema.safeParse(Object.fromEntries(formData));
  if (!resultado.success) return { erro: resultado.error.issues[0].message };

  const repetido = await prisma.local.findFirst({
    where: { eventoId, nome: { equals: resultado.data.nome, mode: "insensitive" } },
  });
  if (repetido) return { erro: "Já existe um local com esse nome neste evento." };

  await prisma.local.create({ data: { eventoId, nome: resultado.data.nome } });
  revalidatePath(`/coordenador/eventos/${eventoId}/locais`);
  return { erro: "" };
}

export async function removerLocal(eventoId: number, formData: FormData) {
  await exigirCoordenadorDoEvento(eventoId);
  const localId = z.coerce.number().int().positive().parse(formData.get("localId"));

  // O filtro por eventoId impede apagar um local de outro evento.
  await prisma.local.deleteMany({ where: { id: localId, eventoId } });
  revalidatePath(`/coordenador/eventos/${eventoId}/locais`);
}