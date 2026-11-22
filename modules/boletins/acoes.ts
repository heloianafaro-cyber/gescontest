"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { exigirCoordenadorDoEvento } from "@/modules/eventos/acesso";
import { montarConteudo } from "./gerar-db";
import { nomeDoBoletim } from "./conteudo";

const base = (eventoId: number) => `/coordenador/eventos/${eventoId}/boletins`;
const msg = (t: string) => encodeURIComponent(t);

// RN219: o coordenador gera o boletim (diário ou final). Gerar de novo atualiza o rascunho; publicado precisa ser despublicado antes.
export async function gerarBoletim(eventoId: number, dia: string, _formData: FormData) {
  const { sessao, evento } = await exigirCoordenadorDoEvento(eventoId);
  const diaOuNull = dia === "final" ? null : dia;
  if (diaOuNull !== null && !/^\d{4}-\d{2}-\d{2}$/.test(diaOuNull)) redirect(`${base(eventoId)}?erro=${msg("Dia inválido.")}`);

  const tipo = diaOuNull ? "PARCIAL" : "FINAL";
  const existente = await prisma.boletim.findFirst({ where: { eventoId, dia: diaOuNull, tipo } });
  if (existente?.status === "PUBLICADO") {
    redirect(`${base(eventoId)}?erro=${msg("Este boletim já está publicado. Despublique para gerar de novo.")}`);
  }

  const conteudo = JSON.parse(JSON.stringify(await montarConteudo(eventoId, evento.nome, diaOuNull)));
  const nome = nomeDoBoletim(evento.nome, diaOuNull);
  const salvo = existente
    ? await prisma.boletim.update({ where: { id: existente.id }, data: { conteudo, nome, usuarioId: Number(sessao.user.id) } })
    : await prisma.boletim.create({
        data: { eventoId, usuarioId: Number(sessao.user.id), nome, tipo, dia: diaOuNull, conteudo },
      });
  revalidatePath(base(eventoId));
  redirect(`${base(eventoId)}/${salvo.id}?ok=${msg("Rascunho gerado. Revise e publique.")}`);
}

// RN220: só o que o coordenador publica aparece para o público.
export async function publicarBoletim(eventoId: number, boletimId: number, _formData: FormData) {
  const { sessao } = await exigirCoordenadorDoEvento(eventoId);
  const b = await prisma.boletim.findFirst({ where: { id: boletimId, eventoId } });
  if (!b) redirect(`${base(eventoId)}?erro=${msg("Boletim não encontrado.")}`);
  await prisma.boletim.update({
    where: { id: boletimId },
    data: { status: "PUBLICADO", dataPublicacao: new Date(), publicadoPorId: Number(sessao.user.id) },
  });
  revalidatePath(base(eventoId));
  revalidatePath(`/boletins/${eventoId}`);
  redirect(`${base(eventoId)}?ok=${msg("Boletim publicado.")}`);
}

export async function despublicarBoletim(eventoId: number, boletimId: number, _formData: FormData) {
  await exigirCoordenadorDoEvento(eventoId);
  const b = await prisma.boletim.findFirst({ where: { id: boletimId, eventoId } });
  if (!b) redirect(`${base(eventoId)}?erro=${msg("Boletim não encontrado.")}`);
  await prisma.boletim.update({
    where: { id: boletimId },
    data: { status: "RASCUNHO", dataPublicacao: null, publicadoPorId: null },
  });
  revalidatePath(base(eventoId));
  revalidatePath(`/boletins/${eventoId}`);
  redirect(`${base(eventoId)}?ok=${msg("Boletim despublicado (voltou a rascunho).")}`);
}

export async function excluirBoletim(eventoId: number, boletimId: number, _formData: FormData) {
  await exigirCoordenadorDoEvento(eventoId);
  const b = await prisma.boletim.findFirst({ where: { id: boletimId, eventoId } });
  if (!b) redirect(`${base(eventoId)}?erro=${msg("Boletim não encontrado.")}`);
  if (b.status === "PUBLICADO") redirect(`${base(eventoId)}?erro=${msg("Despublique antes de excluir.")}`);
  await prisma.boletim.delete({ where: { id: boletimId } });
  revalidatePath(base(eventoId));
  redirect(`${base(eventoId)}?ok=${msg("Rascunho excluído.")}`);
}
