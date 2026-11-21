import { prisma } from "@/lib/prisma";
import { chaveDia, escolherEventoAtual, type JogoResultado } from "./formato";

export type JogoPublico = {
  id: number;
  dataHora: Date | null;
  local: string | null;
  modalidade: string;
  modalidadeId: number;
  torneio: string;
  torneioId: number;
  fase: string | null;
  equipeA: string;
  equipeB: string;
  resultado: JogoResultado;
};

// Só nomes de equipes (RN215). Provas de marca (sem partida) ainda não entram.
const selecao = {
  id: true,
  dataHora: true,
  fase: true,
  status: true,
  numero: true,
  torneioId: true,
  local: { select: { nome: true } },
  torneio: {
    select: {
      nome: true,
      modalidadeId: true,
      modalidade: { select: { nome: true, formatoPlacar: true, mae: { select: { nome: true } } } },
    },
  },
  partida: {
    select: {
      placarA: true,
      placarB: true,
      decididoPor: true,
      penaltisA: true,
      penaltisB: true,
      formaVitoria: true,
      equipeA: { select: { nome: true } },
      equipeB: { select: { nome: true } },
      vencedor: { select: { nome: true } },
      woEquipe: { select: { nome: true } },
      sets: { orderBy: { numero: "asc" as const }, select: { pontosA: true, pontosB: true } },
    },
  },
} as const;

type Linha = Awaited<ReturnType<typeof buscar>>[number];
async function buscar(where: object) {
  return prisma.disputa.findMany({
    where: { partida: { isNot: null }, ...where },
    select: selecao,
    orderBy: [{ dataHora: { sort: "asc", nulls: "last" } }, { id: "asc" }],
  });
}

function paraJogo(d: Linha): JogoPublico {
  const p = d.partida;
  const mod = d.torneio.modalidade;
  // RN217: partida anulada não mostra placar (o texto do resultado já trata isso pelo status).
  return {
    id: d.id,
    dataHora: d.dataHora,
    local: d.local?.nome ?? null,
    modalidade: mod.mae ? `${mod.mae.nome} — ${mod.nome}` : mod.nome,
    modalidadeId: d.torneio.modalidadeId,
    torneio: d.torneio.nome,
    torneioId: d.torneioId,
    fase: d.fase,
    equipeA: p?.equipeA?.nome ?? "A definir",
    equipeB: p?.equipeB?.nome ?? "A definir",
    resultado: {
      status: d.status,
      formato: mod.formatoPlacar ?? null,
      placarA: p?.placarA ?? null,
      placarB: p?.placarB ?? null,
      sets: (p?.sets ?? []).map((s) => ({ a: s.pontosA, b: s.pontosB })),
      decididoPor: p?.decididoPor ?? null,
      penaltisA: p?.penaltisA ?? null,
      penaltisB: p?.penaltisB ?? null,
      vencedorNome: p?.vencedor?.nome ?? null,
      formaVitoria: p?.formaVitoria ?? null,
      woNome: p?.woEquipe?.nome ?? null,
    },
  };
}

export async function jogosDoEvento(eventoId: number): Promise<JogoPublico[]> {
  const linhas = await buscar({ torneio: { modalidade: { eventoId } } });
  return linhas.map(paraJogo);
}

// RN216
export async function eventoAtualId(): Promise<number | null> {
  const eventos = await prisma.evento.findMany({ select: { id: true, dataInicio: true, dataFim: true } });
  return escolherEventoAtual(
    eventos.map((e) => ({ id: e.id, inicio: e.dataInicio.toISOString().slice(0, 10), fim: e.dataFim.toISOString().slice(0, 10) })),
    chaveDia(new Date())
  );
}
