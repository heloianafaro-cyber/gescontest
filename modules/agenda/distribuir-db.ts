import { prisma } from "@/lib/prisma";
import {
  DESLOCAMENTO_BAHIA_MIN,
  distribuir,
  duracaoDoJogo,
  horaParaMinutos,
  type Entrada,
  type JogoAgenda,
  type Ocupacao,
  type Periodo,
} from "./distribuir";

export type ModoDistribuicao = "pendentes" | "tudo";

export function lerModo(valor: unknown): ModoDistribuicao {
  return valor === "tudo" ? "tudo" : "pendentes";
}

const diaDe = (d: Date) => d.toISOString().slice(0, 10);

function diasDoEvento(inicio: Date, fim: Date): string[] {
  const dias: string[] = [];
  const fimTxt = diaDe(fim);
  for (let d = new Date(`${diaDe(inicio)}T00:00:00Z`); diaDe(d) <= fimTxt && dias.length < 60; d = new Date(d.getTime() + 86400000)) {
    dias.push(diaDe(d));
  }
  return dias;
}

export type LinhaPrevia = {
  jogoId: number;
  torneio: string;
  modalidade: string;
  fase: string;
  confronto: string;
  localId: number | null;
  local: string | null;
  inicio: Date | null;
  fim: Date | null;
  motivo: string | null;
};

// Calcula a distribuição (sem gravar nada). Usada na prévia e, de novo, na confirmação.
export async function calcularDistribuicao(eventoId: number, modo: ModoDistribuicao) {
  const evento = await prisma.evento.findUnique({
    where: { id: eventoId },
    select: {
      dataInicio: true,
      dataFim: true,
      periodos: { select: { nome: true, horaInicio: true, horaFim: true, maxJogosPorLocal: true } },
      locais: { select: { id: true, nome: true } },
      modalidades: { select: { id: true, descansoEquipeMin: true, locais: { select: { localId: true } } } },
    },
  });
  if (!evento) return null;

  const disputas = await prisma.disputa.findMany({
    where: { torneio: { modalidade: { eventoId } } },
    select: {
      id: true,
      torneioId: true,
      dataHora: true,
      localId: true,
      duracaoMin: true,
      status: true,
      travada: true,
      rodada: true,
      numero: true,
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
          modalidade: { select: { nome: true } },
        },
      },
      partida: {
        select: {
          equipeAId: true,
          equipeBId: true,
          origemAId: true,
          origemBId: true,
          origemGrupoA: true,
          origemGrupoB: true,
          equipeA: { select: { nome: true } },
          equipeB: { select: { nome: true } },
        },
      },
    },
  });

  const descansoDaModalidade = new Map(evento.modalidades.map((m) => [m.id, m.descansoEquipeMin]));
  const locaisPorModalidade = new Map(evento.modalidades.map((m) => [m.id, m.locais.map((l) => l.localId)]));
  const nomeLocal = new Map(evento.locais.map((l) => [l.id, l.nome]));

  const periodos: Periodo[] = [];
  for (const p of evento.periodos) {
    const ini = horaParaMinutos(p.horaInicio);
    const fim = horaParaMinutos(p.horaFim);
    if (ini === null || fim === null || fim <= ini) continue;
    periodos.push({ nome: p.nome, inicioMin: ini, fimMin: fim, maxJogosPorLocal: p.maxJogosPorLocal });
  }

  // Quais jogos vamos (re)distribuir e quais ficam como estão.
  const agendar = disputas.filter(
    (d) =>
      d.partida !== null &&
      d.status === "AGENDADA" &&
      (modo === "pendentes" ? d.dataHora === null : !d.travada)
  );
  const idsAgendar = new Set(agendar.map((d) => d.id));

  // A duração vem da configuração atual do torneio (tempos × minutos + intervalos entre os tempos).
  const duracao = (d: (typeof disputas)[number]) =>
    duracaoDoJogo({
      numTempos: d.torneio.numTempos,
      duracaoTempoMin: d.torneio.duracaoTempoMin,
      intervaloTemposMin: d.torneio.intervaloTemposMin,
      duracaoJogoMin: d.torneio.duracaoJogoMin,
      duracaoDoJogoGravada: d.duracaoMin,
    });

  const ocupacoes: Ocupacao[] = [];
  for (const d of disputas) {
    if (idsAgendar.has(d.id) || d.dataHora === null || d.status === "CANCELADA") continue;
    const inicio = Math.floor(d.dataHora.getTime() / 60000);
    ocupacoes.push({
      jogoId: d.id,
      localId: d.localId,
      inicio,
      fim: inicio + duracao(d),
      intervaloMin: d.torneio.intervaloJogosMin,
      descansoMin: descansoDaModalidade.get(d.torneio.modalidadeId) ?? 0,
      equipes: [d.partida?.equipeAId, d.partida?.equipeBId].filter((x): x is number => typeof x === "number"),
    });
  }

  // Dependências: vagas que esperam outro jogo, mata-mata depois de grupos e jogos seguintes de uma série.
  const porTorneio = new Map<number, typeof disputas>();
  for (const d of disputas) porTorneio.set(d.torneioId, [...(porTorneio.get(d.torneioId) ?? []), d]);

  const jogos: JogoAgenda[] = agendar.map((d) => {
    const deps = new Set<number>();
    if (d.partida?.origemAId) deps.add(d.partida.origemAId);
    if (d.partida?.origemBId) deps.add(d.partida.origemBId);
    const irmaos = porTorneio.get(d.torneioId) ?? [];
    if (d.partida?.origemGrupoA != null || d.partida?.origemGrupoB != null) {
      for (const x of irmaos) if (x.fase?.startsWith("Grupo") && x.id !== d.id) deps.add(x.id);
    }
    if (d.serie != null && d.jogoNaSerie != null && d.jogoNaSerie > 1) {
      for (const x of irmaos) {
        if (x.serie === d.serie && x.jogoNaSerie === d.jogoNaSerie - 1) deps.add(x.id);
      }
    }
    return {
      id: d.id,
      torneioId: d.torneioId,
      modalidadeId: d.torneio.modalidadeId,
      rodada: d.rodada,
      numero: d.numero,
      duracaoMin: duracao(d),
      intervaloMin: d.torneio.intervaloJogosMin,
      descansoMin: descansoDaModalidade.get(d.torneio.modalidadeId) ?? 0,
      equipes: [d.partida?.equipeAId, d.partida?.equipeBId].filter((x): x is number => typeof x === "number"),
      deps: [...deps],
    };
  });

  const entrada: Entrada = {
    dias: diasDoEvento(evento.dataInicio, evento.dataFim),
    periodos,
    locais: evento.locais.map((l) => l.id),
    locaisPorModalidade,
    jogos,
    ocupacoes,
    deslocamentoMin: DESLOCAMENTO_BAHIA_MIN,
  };
  const saida = distribuir(entrada);

  // Linhas legíveis para a prévia.
  const porId = new Map(disputas.map((d) => [d.id, d]));
  const confronto = (id: number) => {
    const d = porId.get(id)!;
    const a = d.partida?.equipeA?.nome ?? "A definir";
    const b = d.partida?.equipeB?.nome ?? "A definir";
    return `${a} × ${b}`;
  };
  const linha = (id: number): Omit<LinhaPrevia, "localId" | "local" | "inicio" | "fim" | "motivo"> => {
    const d = porId.get(id)!;
    return { jogoId: id, torneio: d.torneio.nome, modalidade: d.torneio.modalidade.nome, fase: d.fase ?? "", confronto: confronto(id) };
  };
  const alocadas: LinhaPrevia[] = saida.alocados.map((a) => ({
    ...linha(a.jogoId),
    localId: a.localId,
    local: nomeLocal.get(a.localId) ?? `#${a.localId}`,
    inicio: new Date(a.inicio * 60000),
    fim: new Date(a.fim * 60000),
    motivo: null,
  }));
  const pendentes: LinhaPrevia[] = saida.pendentes.map((p) => ({
    ...linha(p.jogoId),
    localId: null,
    local: null,
    inicio: null,
    fim: null,
    motivo: p.motivo,
  }));

  return {
    saida,
    alocadas,
    pendentes,
    totalAgendar: jogos.length,
    jaAgendados: disputas.filter((d) => d.status === "AGENDADA" && d.partida !== null && d.dataHora !== null).length,
    semHorario: disputas.filter((d) => d.status === "AGENDADA" && d.partida !== null && d.dataHora === null).length,
    travados: disputas.filter((d) => d.travada).length,
    idsAgendar: [...idsAgendar],
    duracaoPorJogo: new Map(agendar.map((d) => [d.id, duracao(d)])),
  };
}

// Grava a distribuição. No modo "tudo", jogos que não couberam voltam a ficar sem horário.
export async function gravarDistribuicao(eventoId: number, modo: ModoDistribuicao) {
  const r = await calcularDistribuicao(eventoId, modo);
  if (!r) return null;

  const colocados = new Set(r.saida.alocados.map((a) => a.jogoId));
  const limpar = modo === "tudo" ? r.idsAgendar.filter((id) => !colocados.has(id)) : [];

  await prisma.$transaction(
    [
      ...r.saida.alocados.map((a) =>
        prisma.disputa.update({
          where: { id: a.jogoId },
          data: {
            dataHora: new Date(a.inicio * 60000),
            localId: a.localId,
            duracaoMin: a.fim - a.inicio, // guarda a duração usada, para a agenda mostrar o fim certo
          },
        })
      ),
      ...(limpar.length > 0
        ? [prisma.disputa.updateMany({ where: { id: { in: limpar } }, data: { dataHora: null, localId: null } })]
        : []),
    ]
  );
  return { agendados: r.saida.alocados.length, pendentes: r.saida.pendentes.length };
}
