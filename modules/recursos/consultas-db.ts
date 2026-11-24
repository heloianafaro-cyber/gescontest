import { prisma } from "@/lib/prisma";
import { chaveDia, horaBahia, rotuloDia } from "@/modules/publico/formato";

export type EquipeDoJogo = { id: number; nome: string; delegacaoId: number };

// Equipes que participam do jogo: partida = as duas equipes; prova = equipes dos resultados.
export async function equipesDoJogo(disputaId: number): Promise<EquipeDoJogo[]> {
  const partida = await prisma.partida.findUnique({
    where: { disputaId },
    select: {
      equipeA: { select: { id: true, nome: true, delegacaoId: true } },
      equipeB: { select: { id: true, nome: true, delegacaoId: true } },
    },
  });
  if (partida) return [partida.equipeA, partida.equipeB].filter((e): e is EquipeDoJogo => e !== null);

  const resultados = await prisma.resultado.findMany({
    where: { provaId: disputaId, equipeId: { not: null } },
    select: { equipe: { select: { id: true, nome: true, delegacaoId: true } } },
  });
  const mapa = new Map<number, EquipeDoJogo>();
  for (const r of resultados) if (r.equipe) mapa.set(r.equipe.id, r.equipe);
  return [...mapa.values()];
}

// "Jogo 5 · Semifinal · Time A x Time B"
export function rotuloDoJogo(d: {
  numero: number | null;
  fase: string | null;
  partida: { equipeA: { nome: string } | null; equipeB: { nome: string } | null } | null;
  dataHora: Date | null;
}): string {
  const partes: string[] = [];
  if (d.numero != null) partes.push(`Jogo ${d.numero}`);
  if (d.fase) partes.push(d.fase);
  if (d.partida) partes.push(`${d.partida.equipeA?.nome ?? "A definir"} x ${d.partida.equipeB?.nome ?? "A definir"}`);
  if (d.dataHora) partes.push(`${rotuloDia(chaveDia(d.dataHora))} ${horaBahia(d.dataHora)}`);
  return partes.join(" · ") || "Jogo";
}

export const selecaoDoJogo = {
  numero: true,
  fase: true,
  dataHora: true,
  status: true,
  resultadoEm: true,
  partida: { select: { equipeA: { select: { id: true, nome: true } }, equipeB: { select: { id: true, nome: true } } } },
  torneio: {
    select: {
      nome: true,
      modalidade: { select: { nome: true, eventoId: true, evento: { select: { nome: true, recursoPartidaHoras: true } } } },
    },
  },
} as const;
