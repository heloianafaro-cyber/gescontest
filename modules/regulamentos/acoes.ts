"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { apagarArquivo, salvarArquivo } from "@/lib/storage";
import { exigirCoordenadorDoEvento } from "@/modules/eventos/acesso";

// RN175, RN177, RN190: só os coordenadores do evento enviam, substituem e removem regulamentos (PDF até 10 MB).
const LIMITE_BYTES = 10 * 1024 * 1024;

export type EscopoRegulamento = "GERAL" | "MAE" | "MODALIDADE";

function telas(eventoId: number) {
  revalidatePath(`/coordenador/eventos/${eventoId}/regulamentos`);
  revalidatePath("/regulamentos");
}

export async function enviarRegulamento(
  eventoId: number,
  escopo: EscopoRegulamento,
  alvoId: number,
  formData: FormData
) {
  await exigirCoordenadorDoEvento(eventoId);
  const volta = `/coordenador/eventos/${eventoId}/regulamentos`;
  const erro = (msg: string) => redirect(`${volta}?erro=${encodeURIComponent(msg)}`);

  // O alvo precisa ser deste evento (e, no caso de modalidade, avulsa).
  let maeId: number | null = null;
  let modalidadeId: number | null = null;
  if (escopo === "MAE") {
    const mae = await prisma.modalidadeMae.findFirst({ where: { id: alvoId, eventoId }, select: { id: true } });
    if (!mae) erro("Modalidade não encontrada neste evento.");
    maeId = alvoId;
  } else if (escopo === "MODALIDADE") {
    const m = await prisma.modalidade.findFirst({ where: { id: alvoId, eventoId, maeId: null }, select: { id: true } });
    if (!m) erro("Modalidade não encontrada neste evento.");
    modalidadeId = alvoId;
  }

  const arquivo = formData.get("arquivo");
  if (!(arquivo instanceof File) || arquivo.size === 0) erro("Escolha um arquivo PDF.");
  const pdf = arquivo as File;
  if (pdf.size > LIMITE_BYTES) erro("O PDF passa de 10 MB. Reduza o arquivo e tente de novo.");

  const corpo = Buffer.from(await pdf.arrayBuffer());
  if (corpo.subarray(0, 5).toString("latin1") !== "%PDF-") erro("O arquivo não é um PDF válido.");

  const chave = `regulamentos/evento-${eventoId}/${randomUUID()}.pdf`;
  await salvarArquivo(chave, corpo, "application/pdf");

  const existente = await prisma.regulamento.findFirst({ where: { eventoId, maeId, modalidadeId } });
  const dados = { chave, nomeArquivo: pdf.name.slice(0, 120), tamanho: pdf.size, enviadoEm: new Date() };
  if (existente) {
    await prisma.regulamento.update({ where: { id: existente.id }, data: dados });
    await apagarArquivo(existente.chave).catch(() => undefined); // o arquivo antigo não pode ficar sobrando
  } else {
    await prisma.regulamento.create({ data: { eventoId, maeId, modalidadeId, ...dados } });
  }

  telas(eventoId);
  redirect(`${volta}?ok=1`);
}

export async function removerRegulamento(eventoId: number, regulamentoId: number) {
  await exigirCoordenadorDoEvento(eventoId);
  const r = await prisma.regulamento.findFirst({ where: { id: regulamentoId, eventoId } });
  if (r) {
    await prisma.regulamento.delete({ where: { id: r.id } });
    await apagarArquivo(r.chave).catch(() => undefined);
  }
  telas(eventoId);
  redirect(`/coordenador/eventos/${eventoId}/regulamentos?ok=removido`);
}
