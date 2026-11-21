"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { exigirCoordenadorDoEvento } from "@/modules/eventos/acesso";
import { avisosDoHorario, lerDataHoraBahia, type Aviso } from "@/modules/agenda/conferir";
import { carregarJogoParaEdicao, nomesDosJogos } from "@/modules/agenda/mover-db";

const rotaDoJogo = (eventoId: number, disputaId: number) => `/coordenador/eventos/${eventoId}/agenda/jogos/${disputaId}`;
const rotaLista = (eventoId: number) => `/coordenador/eventos/${eventoId}/agenda/jogos`;

function textoDoAviso(a: Aviso, nomes: Map<number, string>, descanso: number): string {
  switch (a.tipo) {
    case "LOCAL":
      return `Conflito de local com: ${nomes.get(a.jogoId) ?? `jogo ${a.jogoId}`}.`;
    case "EQUIPE":
      return `Equipe sem o descanso mínimo (${descanso} min) em relação a: ${nomes.get(a.jogoId) ?? `jogo ${a.jogoId}`}.`;
    case "LOCAL_NAO_MARCADO":
      return "Este local não está marcado para a modalidade.";
    case "FORA_DO_PERIODO":
      return "O jogo ficaria fora dos períodos do dia configurados (ou fora dos dias do evento).";
    case "ANTES_DA_DEPENDENCIA":
      return "O jogo começaria antes do fim de um jogo de que ele depende (mais o descanso).";
    case "ANTES_DO_FIM_PARA_SEGUINTE":
      return `O jogo seguinte começa antes do fim deste (mais o descanso): ${nomes.get(a.jogoId) ?? `jogo ${a.jogoId}`}.`;
  }
}

// RN212: o coordenador move o jogo. Se houver conflito, só grava com "gravar mesmo assim". O jogo fica travado.
export async function salvarHorario(eventoId: number, disputaId: number, formData: FormData) {
  await exigirCoordenadorDoEvento(eventoId);
  const volta = rotaDoJogo(eventoId, disputaId);
  const erro = (msg: string): never => redirect(`${volta}?erro=${encodeURIComponent(msg)}`);

  const dados = await carregarJogoParaEdicao(eventoId, disputaId);
  if (!dados) erro("Jogo não encontrado.");
  const { disputa, evento, contexto, duracaoMin, base } = dados!;
  if (disputa.status !== "AGENDADA") erro("Só é possível mover jogos que ainda não começaram.");

  const localId = Number(formData.get("localId"));
  if (!evento.locais.some((l) => l.id === localId)) erro("Escolha um local do evento.");
  const inicio = lerDataHoraBahia(formData.get("dataHora"));
  if (inicio === null) erro("Informe uma data e hora válidas.");

  const jogo = { jogoId: disputa.id, localId, inicio: inicio as number, fim: (inicio as number) + duracaoMin, ...base };
  const avisos = avisosDoHorario(jogo, contexto);

  if (avisos.length > 0 && formData.get("forcar") !== "on") {
    const nomes = await nomesDosJogos(avisos.flatMap((a) => ("jogoId" in a ? [a.jogoId] : [])));
    const texto = avisos.map((a) => textoDoAviso(a, nomes, base.descansoMin)).join(" ");
    erro(`${texto} Se quiser gravar mesmo assim, marque a caixa abaixo e salve de novo.`);
  }

  await prisma.disputa.update({
    where: { id: disputa.id },
    data: { dataHora: new Date((inicio as number) * 60000), localId, duracaoMin, travada: true },
  });
  revalidatePath(rotaLista(eventoId));
  redirect(`${rotaLista(eventoId)}?ok=${encodeURIComponent("Jogo movido e travado.")}`);
}

export async function alternarTrava(eventoId: number, disputaId: number) {
  await exigirCoordenadorDoEvento(eventoId);
  const d = await prisma.disputa.findFirst({
    where: { id: disputaId, torneio: { modalidade: { eventoId } } },
    select: { id: true, travada: true, dataHora: true },
  });
  const volta = rotaDoJogo(eventoId, disputaId);
  if (!d) redirect(`${rotaLista(eventoId)}?ok=${encodeURIComponent("Jogo não encontrado.")}`);
  if (!d.dataHora) redirect(`${volta}?erro=${encodeURIComponent("Só dá para travar um jogo que já tem horário.")}`);
  await prisma.disputa.update({ where: { id: d.id }, data: { travada: !d.travada } });
  revalidatePath(rotaLista(eventoId));
  redirect(`${volta}?ok=${encodeURIComponent(d.travada ? "Jogo destravado." : "Jogo travado.")}`);
}

// Tira o horário e o local; o jogo volta a ser distribuído na próxima agenda automática.
export async function limparHorario(eventoId: number, disputaId: number) {
  await exigirCoordenadorDoEvento(eventoId);
  const d = await prisma.disputa.findFirst({
    where: { id: disputaId, torneio: { modalidade: { eventoId } } },
    select: { id: true, status: true },
  });
  if (!d) redirect(`${rotaLista(eventoId)}?ok=${encodeURIComponent("Jogo não encontrado.")}`);
  if (d.status !== "AGENDADA") {
    redirect(`${rotaDoJogo(eventoId, disputaId)}?erro=${encodeURIComponent("Só é possível limpar o horário de jogos que ainda não começaram.")}`);
  }
  await prisma.disputa.update({ where: { id: d.id }, data: { dataHora: null, localId: null, travada: false } });
  revalidatePath(rotaLista(eventoId));
  redirect(`${rotaLista(eventoId)}?ok=${encodeURIComponent("Horário removido. O jogo voltou a ficar sem horário.")}`);
}
