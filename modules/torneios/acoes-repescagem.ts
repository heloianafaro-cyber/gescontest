"use server";

import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { exigirCoordenadorDoEvento } from "@/modules/eventos/acesso";
import type { Lado } from "./jogos";
import { ehJogoDeRepescagem, planejarRepescagem, type JogoPrincipal } from "./repescagem";

// RN186-RN188: gera (ou gera de novo) a repescagem e as lutas de bronze depois das semifinais.
export async function gerarRepescagem(eventoId: number, modalidadeId: number, torneioId: number) {
  await exigirCoordenadorDoEvento(eventoId);
  const torneio = await prisma.torneio.findFirst({
    where: { id: torneioId, modalidadeId, modalidade: { eventoId } },
    include: {
      modalidade: { select: { formatoPlacar: true } },
      disputas: { include: { partida: true }, orderBy: [{ numero: "asc" }, { id: "asc" }] },
    },
  });
  if (!torneio) notFound();

  const volta = `/coordenador/eventos/${eventoId}/modalidades/${modalidadeId}/torneios/${torneioId}/jogos`;
  const erro = (msg: string) => redirect(`${volta}?erro=${encodeURIComponent(msg)}`);

  if (torneio.sistemaDisputa !== "ELIMINATORIO" || torneio.variante !== "REPESCAGEM" || torneio.modalidade.formatoPlacar !== "LUTA") {
    erro("Este torneio não usa a repescagem tradicional.");
  }

  const antigos = torneio.disputas.filter((d) => ehJogoDeRepescagem(d.fase));
  if (antigos.some((d) => d.status !== "AGENDADA" && d.status !== "CANCELADA")) {
    erro("Já há lutas da repescagem ou do bronze iniciadas; não é possível gerar de novo.");
  }

  // Jogos da chave principal e seus resultados.
  const principais: JogoPrincipal[] = torneio.disputas
    .filter((d) => !ehJogoDeRepescagem(d.fase) && d.partida)
    .map((d) => {
      const p = d.partida!;
      const fechado = d.status === "ENCERRADA" || d.status === "WO";
      const vencedor = fechado ? p.vencedorId : null;
      const perdedor =
        vencedor !== null ? (p.equipeAId === vencedor ? p.equipeBId : p.equipeAId) : null;
      return { numero: d.numero ?? 0, rodada: d.rodada ?? 0, fase: d.fase ?? "", vencedor, perdedor };
    });

  const r = planejarRepescagem(principais);
  if ("erro" in r) erro(r.erro);
  const { plano, bronzeSemLuta } = r as Exclude<typeof r, { erro: string }>;

  const maiorNumero = torneio.disputas.reduce((m, d) => Math.max(m, d.numero ?? 0), 0);

  await prisma.$transaction(
    async (tx) => {
      await tx.disputa.deleteMany({ where: { id: { in: antigos.map((d) => d.id) } } });
      const ids: number[] = [];
      const lado = (l: Lado) =>
        "equipeId" in l ? { equipeId: l.equipeId, origem: null } : { equipeId: null, origem: "jogo" in l ? ids[l.jogo] : null };
      for (let i = 0; i < plano.length; i++) {
        const j = plano[i];
        const a = lado(j.a);
        const b = lado(j.b);
        const d = await tx.disputa.create({
          data: {
            torneioId,
            rodada: j.rodada,
            numero: maiorNumero + i + 1,
            fase: j.fase,
            duracaoMin: torneio.duracaoJogoMin,
            partida: {
              create: { equipeAId: a.equipeId, equipeBId: b.equipeId, origemAId: a.origem, origemBId: b.origem },
            },
          },
        });
        ids.push(d.id);
      }

      // Ordem de exibição: a final é sempre o último combate; antes dela vêm o bronze e, antes do bronze, a repescagem.
      const todas = await tx.disputa.findMany({ where: { torneioId }, select: { id: true, rodada: true, numero: true, fase: true } });
      const ultimaRodada = Math.max(0, ...plano.map((j) => j.rodada));
      const rank = (fase: string | null) =>
        fase?.startsWith("Repescagem") ? 1 : fase?.startsWith("Disputa de bronze") ? 2 : fase === "Final" ? 3 : 0;
      const itens = todas.map((d) => ({
        id: d.id,
        fase: d.fase,
        numero: d.numero ?? 0,
        rodada: d.fase === "Final" ? Math.max(d.rodada ?? 0, ultimaRodada + 1) : (d.rodada ?? 0),
      }));
      itens.sort((x, y) => x.rodada - y.rodada || rank(x.fase) - rank(y.fase) || x.numero - y.numero);
      for (let i = 0; i < itens.length; i++) {
        await tx.disputa.update({ where: { id: itens[i].id }, data: { numero: i + 1, rodada: itens[i].rodada } });
      }
    },
    { timeout: 60_000, maxWait: 20_000 }
  );

  let aviso = "";
  if (bronzeSemLuta.length > 0) {
    const equipes = await prisma.equipe.findMany({ where: { id: { in: bronzeSemLuta } }, select: { nome: true } });
    aviso = `Bronze sem luta (lado sem repescagem): ${equipes.map((e) => e.nome).join(", ")}.`;
  }

  revalidatePath(volta);
  revalidatePath(`/staff/jogos/${eventoId}`);
  redirect(`${volta}?ok=${plano.length}${aviso ? `&aviso=${encodeURIComponent(aviso)}` : ""}`);
}
