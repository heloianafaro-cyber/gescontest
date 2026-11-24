import { prisma } from "@/lib/prisma";
import { STATUS_FINAIS } from "./regras";

// RN234: anota quando o resultado de um jogo foi registrado (base do prazo de recurso).
// Chamada depois de registrar, corrigir, anular ou limpar um resultado. Correção não reinicia o prazo.
export async function marcarResultadoEm(disputaId: number) {
  const d = await prisma.disputa.findUnique({
    where: { id: disputaId },
    select: { status: true, resultadoEm: true, torneioId: true },
  });
  if (!d) return;
  const finalizado = (STATUS_FINAIS as readonly string[]).includes(d.status);
  if (finalizado && !d.resultadoEm) {
    await prisma.disputa.update({ where: { id: disputaId }, data: { resultadoEm: new Date() } });
  } else if (!finalizado && d.resultadoEm) {
    await prisma.disputa.update({ where: { id: disputaId }, data: { resultadoEm: null } });
  }
  // Jogos do mesmo torneio que voltaram a agendados (avanço em cascata) perdem a marca antiga.
  await prisma.disputa.updateMany({
    where: { torneioId: d.torneioId, resultadoEm: { not: null }, status: { in: ["AGENDADA", "EM_ANDAMENTO"] } },
    data: { resultadoEm: null },
  });
}
