"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { salvarArquivo } from "@/lib/storage";
import { exigirPerfil } from "@/modules/usuarios/sessao";
import { exigirCoordenadorDoEvento } from "./acesso";
import { faseDaConferencia } from "./conferencia";
import {
  MIN_MOTIVO,
  MIN_RECURSO,
  decisaoPermitida,
  recursoPermitido,
  reaberturaPermitida,
  type StatusImpugnacao,
} from "./impugnacao";
import { coordenadoresDoEvento, destinatariosDoAtleta, notificar } from "./notificar";
import { aplicarEfeitosIndeferimento } from "./efeitos-indeferimento";

const LIMITE_BYTES = 10 * 1024 * 1024;

const voltaCoordenador = (eventoId: number) => `/coordenador/eventos/${eventoId}/conferencia`;
const VOLTA_CHEFE = "/tecnico/conferencia";

function atualizarTelas(eventoId: number) {
  revalidatePath(voltaCoordenador(eventoId));
  revalidatePath(VOLTA_CHEFE);
}

function texto(formData: FormData, campo: string) {
  return String(formData.get(campo) ?? "").trim();
}

async function atletaInscrito(eventoId: number, atletaId: number) {
  const total = await prisma.equipeAtleta.count({
    where: { atletaId, equipe: { modalidade: { eventoId } } },
  });
  return total > 0;
}

async function nomeDoAtleta(atletaId: number) {
  const a = await prisma.usuario.findUnique({ where: { id: atletaId }, select: { nome: true } });
  return a?.nome ?? "Atleta";
}

// RN192: só o coordenador impugna, sempre com motivo. Cabe recurso.
export async function impugnarAtleta(eventoId: number, atletaId: number, formData: FormData) {
  const { sessao, evento } = await exigirCoordenadorDoEvento(eventoId);
  const volta = voltaCoordenador(eventoId);
  const erro: (msg: string) => never = (msg) => redirect(`${volta}?erro=${encodeURIComponent(msg)}`);

  if (faseDaConferencia(evento) === "NAO_CONFIGURADA") {
    erro("Este evento não tem conferência. Para excluir um atleta, use Bloquear.");
  }
  const motivo = texto(formData, "motivo");
  if (motivo.length < MIN_MOTIVO) erro(`Informe o motivo (mínimo ${MIN_MOTIVO} caracteres).`);
  if (!(await atletaInscrito(eventoId, atletaId))) erro("Este atleta não está inscrito no evento.");

  const existente = await prisma.impugnacao.findUnique({ where: { eventoId_atletaId: { eventoId, atletaId } } });
  if (existente) erro("Este atleta já tem uma impugnação. Decida ou reabra a existente.");

  await prisma.impugnacao.create({
    data: { eventoId, atletaId, motivo, criadoPorId: Number(sessao.user.id) },
  });

  const nome = await nomeDoAtleta(atletaId);
  await notificar(
    await destinatariosDoAtleta(atletaId),
    `${nome} foi impugnado(a) no evento ${evento.nome}. Motivo: ${motivo}. Regularize a situação ou envie recurso dentro do prazo.`
  );

  atualizarTelas(eventoId);
  redirect(`${volta}?ok=${encodeURIComponent("Atleta impugnado e avisado.")}`);
}

// RN198: o coordenador pode bloquear um atleta a qualquer tempo. Decisão final: sem recurso.
export async function bloquearAtleta(eventoId: number, atletaId: number, formData: FormData) {
  const { sessao, evento } = await exigirCoordenadorDoEvento(eventoId);
  const volta = voltaCoordenador(eventoId);
  const erro: (msg: string) => never = (msg) => redirect(`${volta}?erro=${encodeURIComponent(msg)}`);

  const motivo = texto(formData, "motivo");
  if (motivo.length < MIN_MOTIVO) erro(`Informe o motivo (mínimo ${MIN_MOTIVO} caracteres).`);
  if (!(await atletaInscrito(eventoId, atletaId))) erro("Este atleta não está inscrito no evento.");

  const agora = new Date();
  const dados = {
    status: "INDEFERIDO" as const,
    bloqueio: true,
    motivo,
    decisaoTexto: motivo,
    decididoPorId: Number(sessao.user.id),
    decididoEm: agora,
  };
  await prisma.impugnacao.upsert({
    where: { eventoId_atletaId: { eventoId, atletaId } },
    create: { eventoId, atletaId, criadoPorId: Number(sessao.user.id), ...dados },
    update: dados,
  });

  const nome = await nomeDoAtleta(atletaId);
  await notificar(
    await destinatariosDoAtleta(atletaId),
    `${nome} foi bloqueado(a) no evento ${evento.nome}. Motivo: ${motivo}.`
  );

  // RN198/RN199: efeitos nas equipes e nos jogos.
  const notas = await aplicarEfeitosIndeferimento(eventoId, atletaId);

  atualizarTelas(eventoId);
  redirect(`${volta}?ok=${encodeURIComponent(["Atleta bloqueado e avisado.", ...notas].join(" "))}`);
}

// RN195: o chefe de delegação envia o recurso (texto + PDF opcional de até 10 MB).
export async function enviarRecurso(eventoId: number, atletaId: number, formData: FormData) {
  const sessao = await exigirPerfil("TECNICO");
  const erro: (msg: string) => never = (msg) => redirect(`${VOLTA_CHEFE}?erro=${encodeURIComponent(msg)}`);

  const chefe = await prisma.usuario.findUnique({
    where: { id: Number(sessao.user.id) },
    select: { delegacaoId: true },
  });
  if (!chefe?.delegacaoId) erro("Sua conta não está ligada a uma delegação.");

  // RN107: só atletas da própria delegação.
  const atleta = await prisma.usuario.findFirst({
    where: { id: atletaId, tipo: "ATLETA", delegacaoId: chefe!.delegacaoId },
    select: { nome: true },
  });
  if (!atleta) erro("Atleta não encontrado na sua delegação.");

  const evento = await prisma.evento.findUnique({ where: { id: eventoId } });
  if (!evento) erro("Evento não encontrado.");

  const imp = await prisma.impugnacao.findUnique({ where: { eventoId_atletaId: { eventoId, atletaId } } });
  if (!imp) erro("Este atleta não tem impugnação.");

  const permissao = recursoPermitido(faseDaConferencia(evento!), {
    status: imp!.status as StatusImpugnacao,
    bloqueio: imp!.bloqueio,
  });
  if (!permissao.ok) erro(permissao.motivo);

  const justificativa = texto(formData, "texto");
  if (justificativa.length < MIN_RECURSO) erro(`Explique o recurso (mínimo ${MIN_RECURSO} caracteres).`);

  let chave: string | null = null;
  let nomeArquivo: string | null = null;
  const arquivo = formData.get("arquivo");
  if (arquivo instanceof File && arquivo.size > 0) {
    if (arquivo.size > LIMITE_BYTES) erro("O PDF passa de 10 MB. Reduza o arquivo e tente de novo.");
    const corpo = Buffer.from(await arquivo.arrayBuffer());
    if (corpo.subarray(0, 5).toString("latin1") !== "%PDF-") erro("O arquivo não é um PDF válido.");
    chave = `recursos/evento-${eventoId}/${randomUUID()}.pdf`;
    nomeArquivo = arquivo.name.slice(0, 120);
    await salvarArquivo(chave, corpo, "application/pdf");
  }

  await prisma.impugnacao.update({
    where: { eventoId_atletaId: { eventoId, atletaId } },
    data: {
      status: "RECURSO_ENVIADO",
      recursoTexto: justificativa,
      recursoArquivo: chave,
      recursoNomeArquivo: nomeArquivo,
      recursoEm: new Date(),
      recursoPorId: Number(sessao.user.id),
    },
  });

  await notificar(
    await coordenadoresDoEvento(eventoId),
    `Recurso enviado para ${atleta!.nome} no evento ${evento!.nome}. Analise na tela de conferência.`
  );

  atualizarTelas(eventoId);
  redirect(`${VOLTA_CHEFE}?ok=${encodeURIComponent("Recurso enviado. Aguarde a decisão do coordenador.")}`);
}

// RN194/RN196: só o coordenador decide (deferir = a inscrição volta a valer; indeferir = cancelada), com justificativa.
export async function decidirRecurso(eventoId: number, atletaId: number, formData: FormData) {
  const { sessao, evento } = await exigirCoordenadorDoEvento(eventoId);
  const volta = voltaCoordenador(eventoId);
  const erro: (msg: string) => never = (msg) => redirect(`${volta}?erro=${encodeURIComponent(msg)}`);

  const decisao = texto(formData, "decisao");
  if (decisao !== "DEFERIDO" && decisao !== "INDEFERIDO") erro("Escolha deferir ou indeferir.");
  const justificativa = texto(formData, "justificativa");
  if (justificativa.length < MIN_MOTIVO) erro(`Informe a justificativa (mínimo ${MIN_MOTIVO} caracteres).`);

  const imp = await prisma.impugnacao.findUnique({ where: { eventoId_atletaId: { eventoId, atletaId } } });
  if (!imp) erro("Este atleta não tem impugnação.");
  if (!decisaoPermitida({ status: imp!.status as StatusImpugnacao, bloqueio: imp!.bloqueio })) {
    erro("Esta impugnação não está pendente de decisão.");
  }

  await prisma.impugnacao.update({
    where: { eventoId_atletaId: { eventoId, atletaId } },
    data: {
      status: decisao,
      decisaoTexto: justificativa,
      decididoPorId: Number(sessao.user.id),
      decididoEm: new Date(),
    },
  });

  const nome = await nomeDoAtleta(atletaId);
  const resultado = decisao === "DEFERIDO" ? "deferida: a inscrição vale" : "indeferida: a inscrição foi cancelada";
  await notificar(
    await destinatariosDoAtleta(atletaId),
    `A situação de ${nome} no evento ${evento.nome} foi ${resultado}. Justificativa: ${justificativa}.`
  );

  // RN196: indeferir cancela a inscrição (efeitos nas equipes e nos jogos).
  const notas = decisao === "INDEFERIDO" ? await aplicarEfeitosIndeferimento(eventoId, atletaId) : [];

  atualizarTelas(eventoId);
  redirect(`${volta}?ok=${encodeURIComponent(["Decisão registrada e avisada.", ...notas].join(" "))}`);
}

// RN195: o coordenador pode reabrir uma decisão indeferida.
export async function reabrirImpugnacao(eventoId: number, atletaId: number) {
  const { evento } = await exigirCoordenadorDoEvento(eventoId);
  const volta = voltaCoordenador(eventoId);
  const erro: (msg: string) => never = (msg) => redirect(`${volta}?erro=${encodeURIComponent(msg)}`);

  const imp = await prisma.impugnacao.findUnique({ where: { eventoId_atletaId: { eventoId, atletaId } } });
  if (!imp) erro("Este atleta não tem impugnação.");
  if (!reaberturaPermitida({ status: imp!.status as StatusImpugnacao, bloqueio: imp!.bloqueio })) {
    erro("Só é possível reabrir uma decisão indeferida.");
  }

  await prisma.impugnacao.update({
    where: { eventoId_atletaId: { eventoId, atletaId } },
    data: { status: "IMPUGNADO", bloqueio: false, decisaoTexto: null, decididoPorId: null, decididoEm: null },
  });

  const nome = await nomeDoAtleta(atletaId);
  await notificar(
    await destinatariosDoAtleta(atletaId),
    `A impugnação de ${nome} no evento ${evento.nome} foi reaberta pelo coordenador.`
  );

  atualizarTelas(eventoId);
  redirect(
    `${volta}?ok=${encodeURIComponent(
      "Impugnação reaberta. As inscrições canceladas não voltam sozinhas: se for deferida, o chefe inscreve o atleta de novo."
    )}`
  );
}
