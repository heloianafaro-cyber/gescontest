"use server";

import { termos } from "./exibicao";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { exigirCoordenadorDoEvento } from "@/modules/eventos/acesso";
import { situacaoInscricao } from "@/modules/eventos/inscricoes";
import { bloqueioDoSorteio } from "@/modules/eventos/conferencia-sorteio";
import { sortear } from "./sorteio";

function base(eventoId: number, modalidadeId: number, torneioId: number) {
  return `/coordenador/eventos/${eventoId}/modalidades/${modalidadeId}/torneios/${torneioId}`;
}

async function carregar(eventoId: number, modalidadeId: number, torneioId: number) {
  await exigirCoordenadorDoEvento(eventoId);
  const torneio = await prisma.torneio.findFirst({
    where: { id: torneioId, modalidadeId, modalidade: { eventoId } },
    include: { modalidade: { include: { evento: true } } },
  });
  if (!torneio) notFound();
  return torneio;
}

// RN169: o coordenador marca ou desmarca cabeças de chave (quantos quiser).
export async function marcarCabeca(
  eventoId: number,
  modalidadeId: number,
  torneioId: number,
  formData: FormData
) {
  await carregar(eventoId, modalidadeId, torneioId);
  const equipeId = z.coerce.number().int().positive().parse(formData.get("equipeId"));
  const marcar = formData.get("marcar") === "1";
  await prisma.torneioEquipe.updateMany({
    where: { torneioId, equipeId },
    data: { cabecaDeChave: marcar },
  });
  revalidatePath(`${base(eventoId, modalidadeId, torneioId)}/participantes`);
}

// RN166, RN170: grava o sorteio mostrado na prévia (a semente reproduz o mesmo resultado).
export async function confirmarSorteio(
  eventoId: number,
  modalidadeId: number,
  torneioId: number,
  formData: FormData
) {
  const torneio = await carregar(eventoId, modalidadeId, torneioId);
  const volta = `${base(eventoId, modalidadeId, torneioId)}/sorteio`;
  const erro = (msg: string) => redirect(`${volta}?erro=${encodeURIComponent(msg)}`);

  const semente = z.coerce.number().int().nonnegative().parse(formData.get("semente"));

  // RN166: só depois do fim do prazo de inscrição do evento.
  const prazo = situacaoInscricao(torneio.modalidade.evento);
  if (prazo.aberta) erro("O sorteio só pode ser feito depois do fim do prazo de inscrição do evento.");

  // RN177/RN197: com conferência configurada, só depois dela, do recurso e das decisões.
  const bloqueioConferencia = await bloqueioDoSorteio(torneio.modalidade.evento);
  if (bloqueioConferencia) erro(bloqueioConferencia);

  // RN166: trava depois do primeiro resultado.
  const comResultado = await prisma.disputa.count({ where: { torneioId, NOT: { status: "AGENDADA" } } });
  if (comResultado > 0) erro(`O sorteio está travado: já há ${termos(torneio.modalidade.formatoPlacar).jogos} iniciados ou com resultado neste torneio.`);

  const participantes = await prisma.torneioEquipe.findMany({ where: { torneioId } });
  const r = sortear(
    torneio.sistemaDisputa,
    torneio.chaves,
    participantes.map((p) => ({ equipeId: p.equipeId, cabeca: p.cabecaDeChave })),
    semente
  );
  if ("erro" in r) erro(r.erro);
  else {
    await prisma.$transaction([
      // Refazer o sorteio apaga os jogos já gerados (todos ainda agendados, sem resultado).
      prisma.disputa.deleteMany({ where: { torneioId } }),
      ...r.itens.map((i) =>
        prisma.torneioEquipe.update({
          where: { torneioId_equipeId: { torneioId, equipeId: i.equipeId } },
          data: { grupo: i.grupo, posicao: i.posicao },
        })
      ),
      prisma.torneio.update({ where: { id: torneioId }, data: { sorteioEm: new Date() } }),
    ]);
  }

  revalidatePath(volta);
  revalidatePath(`${base(eventoId, modalidadeId, torneioId)}/participantes`);
  redirect(`${volta}?ok=1`);
}
