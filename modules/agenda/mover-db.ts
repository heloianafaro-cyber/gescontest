import { prisma } from "@/lib/prisma";
import {
  DESLOCAMENTO_BAHIA_MIN,
  duracaoDoJogo,
  horaParaMinutos,
  paraEpochMin,
  type Ocupacao,
} from "./distribuir";
import type { ContextoConferencia, JogoEditado } from "./conferir";

const diaDe = (d: Date) => d.toISOString().slice(0, 10);

export async function carregarJogoParaEdicao(eventoId: number, disputaId: number) {
  const d = await prisma.disputa.findFirst({
    where: { id: disputaId, torneio: { modalidade: { eventoId } }, partida: { isNot: null } },
    select: {
      id: true,
      torneioId: true,
      dataHora: true,
      localId: true,
      duracaoMin: true,
      status: true,
      travada: true,
      fase: true,
      serie: true,
      jogoNaSerie: true,
      torneio: {
        select: {
          nome: true,
          intervaloJogosMin: true,
          modalidadeId: true,
          numTempos: true,
          duracaoTempoMin: true,
          intervaloTemposMin: true,
          duracaoJogoMin: true,
          modalidade: { select: { nome: true, descansoEquipeMin: true, locais: { select: { localId: true } } } },
        },
      },
      partida: {
        select: {
          equipeAId: true,
          equipeBId: true,
          origemAId: true,
          origemBId: true,
          equipeA: { select: { nome: true } },
          equipeB: { select: { nome: true } },
        },
      },
    },
  });
  if (!d || !d.partida) return null;

  const evento = await prisma.evento.findUnique({
    where: { id: eventoId },
    select: {
      dataInicio: true,
      dataFim: true,
      locais: { orderBy: { nome: "asc" }, select: { id: true, nome: true } },
      periodos: { select: { horaInicio: true, horaFim: true } },
    },
  });
  if (!evento) return null;

  const todos = await prisma.disputa.findMany({
    where: { torneio: { modalidade: { eventoId } }, partida: { isNot: null }, status: { not: "CANCELADA" } },
    select: {
      id: true,
      torneioId: true,
      dataHora: true,
      localId: true,
      duracaoMin: true,
      serie: true,
      jogoNaSerie: true,
      fase: true,
      torneio: {
        select: {
          intervaloJogosMin: true,
          numTempos: true,
          duracaoTempoMin: true,
          intervaloTemposMin: true,
          duracaoJogoMin: true,
          modalidade: { select: { descansoEquipeMin: true } },
        },
      },
      partida: { select: { equipeAId: true, equipeBId: true, origemAId: true, origemBId: true } },
    },
  });

  const duracaoDe = (x: {
    duracaoMin: number | null;
    torneio: { numTempos: number | null; duracaoTempoMin: number | null; intervaloTemposMin: number | null; duracaoJogoMin: number | null };
  }) =>
    duracaoDoJogo({
      numTempos: x.torneio.numTempos,
      duracaoTempoMin: x.torneio.duracaoTempoMin,
      intervaloTemposMin: x.torneio.intervaloTemposMin,
      duracaoJogoMin: x.torneio.duracaoJogoMin,
      duracaoDoJogoGravada: x.duracaoMin,
    });
  const equipesDe = (p: { equipeAId: number | null; equipeBId: number | null } | null) =>
    [p?.equipeAId, p?.equipeBId].filter((e): e is number => typeof e === "number");

  const comHorario = todos.filter((x) => x.dataHora !== null);
  const outros: Ocupacao[] = comHorario
    .filter((x) => x.id !== d.id)
    .map((x) => {
      const inicio = Math.floor(x.dataHora!.getTime() / 60000);
      return {
        jogoId: x.id,
        localId: x.localId,
        inicio,
        fim: inicio + duracaoDe(x),
        intervaloMin: x.torneio.intervaloJogosMin,
        descansoMin: x.torneio.modalidade.descansoEquipeMin,
        equipes: equipesDe(x.partida),
      };
    });
  const porId = new Map(outros.map((o) => [o.jogoId, o]));

  // Dependências deste jogo (quem precisa terminar antes) e dos seguintes (quem depende dele).
  const depsIds = new Set<number>();
  if (d.partida.origemAId) depsIds.add(d.partida.origemAId);
  if (d.partida.origemBId) depsIds.add(d.partida.origemBId);
  if (d.serie != null && d.jogoNaSerie != null && d.jogoNaSerie > 1) {
    for (const x of todos) if (x.torneioId === d.torneioId && x.serie === d.serie && x.jogoNaSerie === d.jogoNaSerie - 1) depsIds.add(x.id);
  }
  const seguintesIds = new Set<number>();
  for (const x of todos) {
    if (x.partida?.origemAId === d.id || x.partida?.origemBId === d.id) seguintesIds.add(x.id);
    if (d.serie != null && d.jogoNaSerie != null && x.torneioId === d.torneioId && x.serie === d.serie && x.jogoNaSerie === d.jogoNaSerie + 1) {
      seguintesIds.add(x.id);
    }
  }

  // Janelas: períodos do dia em cada dia do evento.
  const janelas: { inicio: number; fim: number }[] = [];
  const fimTxt = diaDe(evento.dataFim);
  for (let dia = new Date(`${diaDe(evento.dataInicio)}T00:00:00Z`), n = 0; diaDe(dia) <= fimTxt && n < 60; dia = new Date(dia.getTime() + 86400000), n++) {
    for (const p of evento.periodos) {
      const ini = horaParaMinutos(p.horaInicio);
      const fim = horaParaMinutos(p.horaFim);
      if (ini === null || fim === null || fim <= ini) continue;
      janelas.push({
        inicio: paraEpochMin(diaDe(dia), ini, DESLOCAMENTO_BAHIA_MIN),
        fim: paraEpochMin(diaDe(dia), fim, DESLOCAMENTO_BAHIA_MIN),
      });
    }
  }

  const contexto: ContextoConferencia = {
    outros,
    locaisMarcados: d.torneio.modalidade.locais.map((l) => l.localId),
    janelas,
    fimDasDependencias: [...depsIds].map((id) => porId.get(id)?.fim).filter((f): f is number => typeof f === "number"),
    inicioDosSeguintes: [...seguintesIds]
      .map((id) => ({ jogoId: id, inicio: porId.get(id)?.inicio }))
      .filter((s): s is { jogoId: number; inicio: number } => typeof s.inicio === "number"),
  };

  return {
    disputa: d,
    evento,
    contexto,
    duracaoMin: duracaoDe(d),
    base: {
      intervaloMin: d.torneio.intervaloJogosMin,
      descansoMin: d.torneio.modalidade.descansoEquipeMin,
      equipes: equipesDe(d.partida),
    } satisfies Pick<JogoEditado, "intervaloMin" | "descansoMin" | "equipes">,
  };
}

// Nomes legíveis dos jogos citados nos avisos.
export async function nomesDosJogos(ids: number[]): Promise<Map<number, string>> {
  if (ids.length === 0) return new Map();
  const jogos = await prisma.disputa.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      fase: true,
      torneio: { select: { nome: true, modalidade: { select: { nome: true } } } },
      partida: { select: { equipeA: { select: { nome: true } }, equipeB: { select: { nome: true } } } },
    },
  });
  return new Map(
    jogos.map((j) => [
      j.id,
      `${j.torneio.modalidade.nome} — ${j.torneio.nome}${j.fase ? ` · ${j.fase}` : ""} (${j.partida?.equipeA?.nome ?? "A definir"} × ${j.partida?.equipeB?.nome ?? "A definir"})`,
    ])
  );
}
