import { prisma } from "@/lib/prisma";

// O atleta e os chefes da delegação dele.
export async function destinatariosDoAtleta(atletaId: number): Promise<number[]> {
  const atleta = await prisma.usuario.findUnique({
    where: { id: atletaId },
    select: { delegacaoId: true },
  });
  const ids = [atletaId];
  if (atleta?.delegacaoId) {
    const chefes = await prisma.usuario.findMany({
      where: { tipo: "TECNICO", delegacaoId: atleta.delegacaoId },
      select: { id: true },
    });
    ids.push(...chefes.map((c) => c.id));
  }
  return ids;
}

export async function coordenadoresDoEvento(eventoId: number): Promise<number[]> {
  const linhas = await prisma.eventoCoordenador.findMany({ where: { eventoId }, select: { usuarioId: true } });
  return linhas.map((l) => l.usuarioId);
}

export async function notificar(ids: number[], mensagem: string) {
  const unicos = [...new Set(ids)];
  if (unicos.length === 0) return;
  await prisma.notificacao.createMany({ data: unicos.map((usuarioId) => ({ usuarioId, mensagem })) });
}
