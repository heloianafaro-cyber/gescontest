"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { exigirPerfil } from "@/modules/usuarios/sessao";
import { cifrar } from "@/modules/seguranca/cifra";
import { hojeNaBahia } from "@/modules/eventos/conferencia";
import { dadosBancariosSchema } from "./validacao";

export type EstadoBanco = { erro: string; ok?: boolean; valores?: Record<string, string> };

// RN225/RN226: o atleta informa os próprios dados; agência, conta e titular vão cifrados.
export async function salvarDadosBancarios(_anterior: EstadoBanco, formData: FormData): Promise<EstadoBanco> {
  const sessao = await exigirPerfil("ATLETA");
  const atletaId = Number(sessao.user.id);

  const bruto = Object.fromEntries(formData) as Record<string, string>;
  const resultado = dadosBancariosSchema.safeParse(bruto);
  if (!resultado.success) {
    return { erro: resultado.error.issues[0].message, valores: bruto };
  }
  const d = resultado.data;

  const dados = {
    banco: d.banco,
    tipoConta: d.tipoConta,
    agenciaCifrada: cifrar(d.agencia),
    contaCifrada: cifrar(d.conta),
    titularCifrado: cifrar(d.titular),
    informadoEm: new Date(`${hojeNaBahia()}T00:00:00Z`),
  };

  await prisma.dadoBancario.upsert({
    where: { usuarioId: atletaId },
    create: { usuarioId: atletaId, ...dados },
    update: dados,
  });

  revalidatePath("/atleta");
  revalidatePath("/atleta/dados-bancarios");
  return { erro: "", ok: true };
}

// RN230: o atleta pode apagar os próprios dados quando quiser.
export async function apagarDadosBancarios() {
  const sessao = await exigirPerfil("ATLETA");
  await prisma.dadoBancario.deleteMany({ where: { usuarioId: Number(sessao.user.id) } });
  revalidatePath("/atleta");
  revalidatePath("/atleta/dados-bancarios");
}
