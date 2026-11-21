import { prisma } from "@/lib/prisma";
import { duracaoDoJogo } from "./distribuir";
import type { Escopo, JogoIcs } from "./ics";

// Só jogos com horário. Mostra apenas nomes de equipes (nunca atletas), como nas páginas públicas.
export async function carregarCalendario(escopo: Escopo, id: number): Promise<{ nome: string; jogos: JogoIcs[] } | null> {
  let nome: string | null = null;
  let filtro: object;

  if (escopo === "evento") {
    const e = await prisma.evento.findUnique({ where: { id }, select: { nome: true } });
    nome = e?.nome ?? null;
    filtro = { torneio: { modalidade: { eventoId: id } } };
  } else if (escopo === "modalidade") {
    const m = await prisma.modalidade.findUnique({ where: { id }, select: { nome: true, evento: { select: { nome: true } } } });
    nome = m ? `${m.nome} — ${m.evento.nome}` : null;
    filtro = { torneio: { modalidadeId: id } };
  } else if (escopo === "torneio") {
    const t = await prisma.torneio.findUnique({
      where: { id },
      select: { nome: true, modalidade: { select: { nome: true } } },
    });
    nome = t ? `${t.modalidade.nome} — ${t.nome}` : null;
    filtro = { torneioId: id };
  } else if (escopo === "delegacao") {
    const d = await prisma.delegacao.findUnique({ where: { id }, select: { nome: true } });
    nome = d ? `Delegação ${d.nome}` : null;
    filtro = { partida: { OR: [{ equipeA: { delegacaoId: id } }, { equipeB: { delegacaoId: id } }] } };
  } else {
    const q = await prisma.equipe.findUnique({ where: { id }, select: { nome: true, modalidade: { select: { nome: true } } } });
    nome = q ? `${q.nome} (${q.modalidade.nome})` : null;
    filtro = { partida: { OR: [{ equipeAId: id }, { equipeBId: id }] } };
  }
  if (nome === null) return null;

  const disputas = await prisma.disputa.findMany({
    where: { ...filtro, dataHora: { not: null }, partida: { isNot: null }, status: { not: "CANCELADA" } },
    orderBy: [{ dataHora: "asc" }, { id: "asc" }],
    select: {
      id: true,
      dataHora: true,
      duracaoMin: true,
      fase: true,
      status: true,
      local: { select: { nome: true } },
      torneio: {
        select: {
          nome: true,
          numTempos: true,
          duracaoTempoMin: true,
          intervaloTemposMin: true,
          duracaoJogoMin: true,
          modalidade: { select: { nome: true, evento: { select: { nome: true } } } },
        },
      },
      partida: { select: { equipeA: { select: { nome: true } }, equipeB: { select: { nome: true } } } },
    },
  });

  const jogos: JogoIcs[] = disputas.map((d) => {
    const inicio = d.dataHora as Date;
    const minutos = duracaoDoJogo({
      numTempos: d.torneio.numTempos,
      duracaoTempoMin: d.torneio.duracaoTempoMin,
      intervaloTemposMin: d.torneio.intervaloTemposMin,
      duracaoJogoMin: d.torneio.duracaoJogoMin,
      duracaoDoJogoGravada: d.duracaoMin,
    });
    const a = d.partida?.equipeA?.nome ?? "A definir";
    const b = d.partida?.equipeB?.nome ?? "A definir";
    return {
      id: d.id,
      inicio,
      fim: new Date(inicio.getTime() + minutos * 60000),
      titulo: `${d.torneio.modalidade.nome}: ${a} × ${b}`,
      local: d.local?.nome ?? null,
      descricao: [d.torneio.modalidade.evento.nome, `${d.torneio.modalidade.nome} — ${d.torneio.nome}`, d.fase ?? ""]
        .filter(Boolean)
        .join("\n"),
      cancelado: d.status === "ANULADA",
    };
  });
  return { nome, jogos };
}
