import { prisma } from "@/lib/prisma";
import type { ListaTorneio } from "./listas-csv";

// Torneios do evento com a quantidade de equipes (para a tela de escolha).
export async function listarTorneiosDoEvento(eventoId: number) {
  const torneios = await prisma.torneio.findMany({
    where: { modalidade: { eventoId } },
    orderBy: [{ modalidade: { nome: "asc" } }, { nome: "asc" }],
    select: {
      id: true,
      nome: true,
      modalidade: { select: { nome: true } },
      _count: { select: { participantes: true } },
    },
  });
  return torneios.map((t) => ({
    id: t.id,
    nome: t.nome,
    modalidade: t.modalidade.nome,
    equipes: t._count.participantes,
  }));
}

// Lista de equipes e atletas de um torneio. Só seleciona campos permitidos pela RN200 (sem CPF, matrícula ou ficha).
export async function carregarLista(eventoId: number, torneioId: number): Promise<ListaTorneio | null> {
  const t = await prisma.torneio.findFirst({
    where: { id: torneioId, modalidade: { eventoId } },
    select: {
      nome: true,
      modalidade: { select: { nome: true, minAtletas: true, evento: { select: { nome: true } } } },
      participantes: {
        select: {
          grupo: true,
          cabecaDeChave: true,
          posicao: true,
          equipe: {
            select: {
              id: true,
              nome: true,
              naipe: true,
              delegacao: { select: { nome: true } },
              atletas: {
                select: {
                  pesoKg: true,
                  pesoConfirmado: true,
                  faixa: true,
                  atleta: { select: { nome: true, dataNascimento: true } },
                },
              },
            },
          },
        },
      },
    },
  });
  if (!t) return null;

  const equipes = t.participantes.map((p) => ({
    id: p.equipe.id,
    nome: p.equipe.nome,
    delegacao: p.equipe.delegacao.nome,
    naipe: p.equipe.naipe,
    grupo: p.grupo,
    cabeca: p.cabecaDeChave,
    posicao: p.posicao,
    minimo: t.modalidade.minAtletas,
    atletas: p.equipe.atletas
      .map((a) => ({
        nome: a.atleta.nome,
        anoNascimento: a.atleta.dataNascimento ? a.atleta.dataNascimento.getUTCFullYear() : null,
        pesoKg: a.pesoKg === null ? null : String(a.pesoKg),
        pesoConfirmado: a.pesoConfirmado,
        faixa: a.faixa,
      }))
      .sort((x, y) => x.nome.localeCompare(y.nome, "pt-BR")),
  }));

  // Grupo, depois posição do sorteio, depois nome. Quem não tem grupo/posição vai para o fim.
  const fim = Number.MAX_SAFE_INTEGER;
  equipes.sort(
    (a, b) =>
      (a.grupo ?? fim) - (b.grupo ?? fim) ||
      (a.posicao ?? fim) - (b.posicao ?? fim) ||
      a.nome.localeCompare(b.nome, "pt-BR")
  );

  return {
    evento: t.modalidade.evento.nome,
    modalidade: t.modalidade.nome,
    torneio: t.nome,
    temPeso: equipes.some((e) => e.atletas.some((a) => a.pesoKg !== null)),
    temFaixa: equipes.some((e) => e.atletas.some((a) => a.faixa)),
    equipes,
  };
}
