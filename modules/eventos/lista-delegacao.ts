import { prisma } from "@/lib/prisma";
import { exigirPerfil } from "@/modules/usuarios/sessao";
import type { ListaDelegacao } from "./lista-delegacao-csv";

// O chefe só enxerga a própria delegação (RN107). Devolve null se a conta não estiver ligada a uma.
export async function delegacaoDoChefe() {
  const sessao = await exigirPerfil("TECNICO");
  const chefe = await prisma.usuario.findUnique({
    where: { id: Number(sessao.user.id) },
    select: { delegacaoId: true, delegacao: { select: { nome: true } } },
  });
  if (!chefe?.delegacaoId || !chefe.delegacao) return null;
  return { id: chefe.delegacaoId, nome: chefe.delegacao.nome };
}

// Todas as modalidades e provas do evento, com as equipes da delegação (ou nenhuma).
// Sem CPF, matrícula ou ficha (RN200).
export async function carregarListaDelegacao(
  eventoId: number,
  delegacao: { id: number; nome: string }
): Promise<ListaDelegacao | null> {
  const evento = await prisma.evento.findUnique({ where: { id: eventoId }, select: { nome: true } });
  if (!evento) return null;

  const modalidades = await prisma.modalidade.findMany({
    where: { eventoId },
    select: {
      id: true,
      nome: true,
      minAtletas: true,
      mae: { select: { nome: true } },
      equipes: {
        where: { delegacaoId: delegacao.id },
        orderBy: { nome: "asc" },
        select: {
          id: true,
          nome: true,
          naipe: true,
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
  });

  const lista: ListaDelegacao = {
    evento: evento.nome,
    delegacao: delegacao.nome,
    temPeso: false,
    temFaixa: false,
    modalidades: modalidades
      .map((m) => ({
        id: m.id,
        mae: m.mae?.nome ?? null,
        nome: m.nome,
        equipes: m.equipes.map((e) => ({
          id: e.id,
          nome: e.nome,
          naipe: e.naipe,
          minimo: m.minAtletas,
          atletas: e.atletas
            .map((a) => ({
              nome: a.atleta.nome,
              anoNascimento: a.atleta.dataNascimento ? a.atleta.dataNascimento.getUTCFullYear() : null,
              pesoKg: a.pesoKg === null ? null : String(a.pesoKg),
              pesoConfirmado: a.pesoConfirmado,
              faixa: a.faixa,
            }))
            .sort((x, y) => x.nome.localeCompare(y.nome, "pt-BR")),
        })),
      }))
      .sort(
        (a, b) =>
          (a.mae ?? a.nome).localeCompare(b.mae ?? b.nome, "pt-BR") || a.nome.localeCompare(b.nome, "pt-BR")
      ),
  };
  lista.temPeso = lista.modalidades.some((m) => m.equipes.some((e) => e.atletas.some((a) => a.pesoKg !== null)));
  lista.temFaixa = lista.modalidades.some((m) => m.equipes.some((e) => e.atletas.some((a) => a.faixa)));
  return lista;
}
