import { prisma } from "@/lib/prisma";
import { enviarAvisosPorEmail } from "@/modules/email/avisos";

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

// Grava a notificação no sistema e, se for um aviso importante (RN248), também manda e-mail curto.
// Falha no e-mail nunca impede a ação: a notificação no sistema já está gravada.
export async function notificar(ids: number[], mensagem: string, opcoes?: { email?: boolean }) {
  const unicos = [...new Set(ids)];
  if (unicos.length === 0) return;
  const criadas = await prisma.notificacao.createManyAndReturn({
    data: unicos.map((usuarioId) => ({ usuarioId, mensagem })),
    select: { id: true, usuarioId: true },
  });
  try {
    await enviarAvisosPorEmail(
      criadas.map((c) => ({ notificacaoId: c.id, usuarioId: c.usuarioId, mensagem })),
      opcoes?.email
    );
  } catch (e) {
    console.error("[email] falha ao enviar avisos:", e);
  }
}
