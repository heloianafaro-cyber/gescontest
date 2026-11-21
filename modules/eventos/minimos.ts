import { prisma } from "@/lib/prisma";
import { avisoMinimo } from "./listas-csv";

export type EquipeAbaixo = {
  equipeId: number;
  equipe: string;
  modalidade: string;
  delegacaoId: number;
  inscritos: number;
  minimo: number;
};

// RN207: equipes do evento com menos atletas que o mínimo da modalidade.
export async function equipesAbaixoDoMinimo(eventoId: number): Promise<EquipeAbaixo[]> {
  const equipes = await prisma.equipe.findMany({
    where: { modalidade: { eventoId } },
    select: {
      id: true,
      nome: true,
      delegacaoId: true,
      modalidade: { select: { nome: true, minAtletas: true } },
      _count: { select: { atletas: true } },
    },
  });
  return equipes
    .filter((e) => avisoMinimo(e._count.atletas, e.modalidade.minAtletas) !== null)
    .map((e) => ({
      equipeId: e.id,
      equipe: e.nome,
      modalidade: e.modalidade.nome,
      delegacaoId: e.delegacaoId,
      inscritos: e._count.atletas,
      minimo: e.modalidade.minAtletas,
    }));
}

// Envia a notificação aos chefes da delegação. Com "semRepetir", quem já recebeu exatamente a mesma
// mensagem nas últimas 24 horas não recebe de novo (evita aviso duplicado). Devolve quantos chefes foram avisados.
async function avisarChefesDaDelegacao(delegacaoId: number, mensagem: string, semRepetir: boolean): Promise<number> {
  const chefes = await prisma.usuario.findMany({
    where: { tipo: "TECNICO", delegacaoId },
    select: { id: true },
  });
  let ids = chefes.map((c) => c.id);
  if (ids.length === 0) return 0;

  if (semRepetir) {
    const ontem = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const jaAvisados = await prisma.notificacao.findMany({
      where: { usuarioId: { in: ids }, mensagem, dataHora: { gte: ontem } },
      select: { usuarioId: true },
    });
    const ja = new Set(jaAvisados.map((n) => n.usuarioId));
    ids = ids.filter((id) => !ja.has(id));
  }
  if (ids.length === 0) return 0;

  await prisma.notificacao.createMany({ data: ids.map((usuarioId) => ({ usuarioId, mensagem })) });
  return ids.length;
}

// Um aviso por delegação, listando as equipes abaixo do mínimo (botão do coordenador e rotina diária).
export async function avisarChefesDoEvento(
  evento: { id: number; nome: string },
  semRepetir: boolean
): Promise<{ equipes: number; chefes: number }> {
  const abaixo = await equipesAbaixoDoMinimo(evento.id);
  const porDelegacao = new Map<number, string[]>();
  for (const a of abaixo) {
    const linhas = porDelegacao.get(a.delegacaoId) ?? [];
    linhas.push(`${a.equipe} (${a.modalidade}): ${a.inscritos} de ${a.minimo}`);
    porDelegacao.set(a.delegacaoId, linhas);
  }

  let chefes = 0;
  for (const [delegacaoId, linhas] of porDelegacao) {
    const mensagem = `${evento.nome}: equipe(s) que não atingiram o mínimo de inscritos — ${linhas.join("; ")}.`;
    chefes += await avisarChefesDaDelegacao(delegacaoId, mensagem, semRepetir);
  }
  return { equipes: abaixo.length, chefes };
}

// Chamada logo depois de um atleta sair de uma equipe: se ela ficou abaixo do mínimo, avisa o chefe na hora.
// Nunca atrapalha a ação que a chamou: qualquer erro aqui é ignorado.
export async function avisarSeAbaixoDoMinimo(equipeId: number): Promise<void> {
  try {
    const e = await prisma.equipe.findUnique({
      where: { id: equipeId },
      select: {
        nome: true,
        delegacaoId: true,
        modalidade: {
          select: { nome: true, minAtletas: true, evento: { select: { nome: true, dataFim: true } } },
        },
        _count: { select: { atletas: true } },
      },
    });
    if (!e) return;
    if (e.modalidade.evento.dataFim < new Date()) return;
    const aviso = avisoMinimo(e._count.atletas, e.modalidade.minAtletas);
    if (!aviso) return;
    const mensagem = `${e.modalidade.evento.nome}: ${e.nome} (${e.modalidade.nome}) — ${aviso}.`;
    await avisarChefesDaDelegacao(e.delegacaoId, mensagem, true);
  } catch {
    // aviso é só um extra
  }
}
