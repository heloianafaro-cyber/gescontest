"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { exigirPerfil } from "@/modules/usuarios/sessao";
import type { EstadoForm } from "@/modules/eventos/acoes";
import { atribuirCategoria } from "@/modules/equipes/categoria";
import { elegivelAbsoluto, idadeNoEvento } from "./regras";

// Avisa o chefe da delegação e o atleta, no sistema (o e-mail virá com o Resend) — RN160.
async function avisar(atletaId: number, delegacaoId: number, mensagem: string) {
  const chefes = await prisma.usuario.findMany({
    where: { tipo: "TECNICO", delegacaoId },
    select: { id: true },
  });
  const destinos = [atletaId, ...chefes.map((c) => c.id)];
  await prisma.notificacao.createMany({ data: destinos.map((usuarioId) => ({ usuarioId, mensagem })) });
}

// RN149, RN150, RN159, RN162: pesagem de um atleta de prova individual de luta.
export async function registrarPesagem(
  equipeId: number,
  _anterior: EstadoForm,
  formData: FormData
): Promise<EstadoForm> {
  await exigirPerfil("STAFF");

  const equipe = await prisma.equipe.findUnique({
    where: { id: equipeId },
    include: {
      modalidade: { include: { evento: true } },
      atletas: { include: { atleta: { select: { id: true, nome: true, dataNascimento: true } } } },
      torneios: { include: { torneio: true } },
      _count: { select: { partidasA: true, partidasB: true } },
    },
  });
  const vinculo = equipe?.atletas[0];
  if (!equipe || !vinculo) return { erro: "Inscrição não encontrada." };
  const m = equipe.modalidade;
  if (m.tipo !== "INDIVIDUAL" || m.formatoPlacar !== "LUTA") return { erro: "Esta inscrição não é de luta individual." };
  if (equipe._count.partidasA + equipe._count.partidasB > 0) {
    return { erro: "O atleta já tem lutas marcadas; fale com o coordenador." };
  }

  // Peso oficial (RN159).
  let peso: number | null = vinculo.pesoKg != null ? Number(vinculo.pesoKg) : null;
  if (m.catPeso) {
    const texto = String(formData.get("peso") ?? "").trim().replace(",", ".");
    peso = Number(texto);
    if (!texto || !Number.isFinite(peso) || peso <= 0) return { erro: "Informe o peso oficial (kg)." };
  }
  // Faixa (RN161): o Staff pode corrigir.
  let faixa = vinculo.faixa;
  if (m.catFaixa) {
    faixa = String(formData.get("faixa") ?? "");
    if (!m.faixas.includes(faixa)) return { erro: "Escolha a cor da faixa." };
  }

  const anterior = equipe.torneios.find((t) => !t.torneio.absoluto)?.torneio ?? null;
  const nomeAnterior = anterior?.nome ?? null;
  const evento = m.evento;
  const nome = vinculo.atleta.nome;

  await prisma.equipeAtleta.update({
    where: { atletaId_equipeId: { atletaId: vinculo.atletaId, equipeId } },
    data: { pesoKg: peso, pesoConfirmado: true, faixa },
  });

  // RN159/RN150: acima do máximo da categoria em que se inscreveu.
  const acimaDoMaximo =
    m.catPeso && peso != null && anterior?.pesoMax != null && peso > Number(anterior.pesoMax);
  let eliminar = acimaDoMaximo && evento.pesoExcedente === "ELIMINAR";

  let categoria: string | null = null;
  if (!eliminar) {
    categoria = await atribuirCategoria(equipeId);
    // Subir de categoria sem haver categoria que comporte o peso = eliminado.
    if (acimaDoMaximo && !categoria) eliminar = true;
  }

  if (eliminar) {
    await prisma.equipe.delete({ where: { id: equipeId } }); // some a inscrição desta prova
    await avisar(
      vinculo.atletaId,
      equipe.delegacaoId,
      `Pesagem: ${nome} foi eliminado(a) de ${m.nome}. Peso oficial ${peso} kg, acima do máximo da categoria ${nomeAnterior ?? ""}.`.trim()
    );
    revalidatePath(`/staff/pesagem/${evento.id}`);
    return { erro: "", valores: { ok: "eliminado" } };
  }

  // RN160: avisa se a categoria mudou (ou se ficou sem categoria).
  // (também avisa quando o atleta continua sem categoria depois da pesagem)
  if (categoria !== nomeAnterior || categoria === null) {
    const texto = categoria
      ? `Pesagem: ${nome} passou da categoria ${nomeAnterior ?? "(nenhuma)"} para ${categoria} em ${m.nome} (peso oficial ${peso ?? "-"} kg).`
      : `Pesagem: ${nome} ficou sem categoria em ${m.nome} (peso oficial ${peso ?? "-"} kg). O coordenador precisa criar uma categoria compatível.`;
    await avisar(vinculo.atletaId, equipe.delegacaoId, texto);
  }

  // RN162: absolutos (só os que o atleta pode disputar).
  const escolhidos = formData.getAll("absoluto").map((v) => Number(v)).filter((n) => Number.isInteger(n));
  const absolutos = await prisma.torneio.findMany({ where: { modalidadeId: m.id, absoluto: true } });
  const ctx = {
    naipe: equipe.naipe as string,
    idade: idadeNoEvento(evento.dataInicio, vinculo.atleta.dataNascimento),
    faixa,
  };
  const validos = absolutos.filter(
    (t) => escolhidos.includes(t.id) && elegivelAbsoluto(t, ctx, { catIdade: m.catIdade, catFaixa: m.catFaixa })
  );
  await prisma.torneioEquipe.deleteMany({
    where: { equipeId, torneio: { modalidadeId: m.id, absoluto: true } },
  });
  if (validos.length > 0) {
    await prisma.torneioEquipe.createMany({ data: validos.map((t) => ({ torneioId: t.id, equipeId })) });
  }

  revalidatePath(`/staff/pesagem/${evento.id}`);
  return { erro: "", valores: { ok: "salvo", categoria: categoria ?? "" } };
}
