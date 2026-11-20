import { prisma } from "@/lib/prisma";
import { atribuirCategoria } from "@/modules/equipes/categoria";

// RN165: coloca as equipes nos torneios da modalidade.
// - Coletiva: a equipe entra nos torneios do mesmo naipe (torneio sem naipe aceita todas).
// - Individual: quem ainda não tem categoria é encaixado pelos critérios (naipe, peso, idade, faixa).
// Não tira ninguém de lugar. Com soTorneioId, só mexe nesse torneio (equipes coletivas).
// Quem o coordenador retirou volta se a função for chamada de novo para o mesmo torneio.
export async function incluirEquipesCompativeis(modalidadeId: number, soTorneioId?: number): Promise<number> {
  const modalidade = await prisma.modalidade.findUnique({ where: { id: modalidadeId } });
  if (!modalidade) return 0;

  const equipes = await prisma.equipe.findMany({
    where: { modalidadeId },
    select: { id: true, naipe: true, torneios: { select: { torneio: { select: { absoluto: true } } } } },
  });

  if (modalidade.tipo === "INDIVIDUAL") {
    let colocados = 0;
    for (const e of equipes) {
      const jaTemCategoria = e.torneios.some((t) => !t.torneio.absoluto);
      if (jaTemCategoria) continue;
      if (await atribuirCategoria(e.id)) colocados++;
    }
    return colocados;
  }

  const torneios = await prisma.torneio.findMany({
    where: { modalidadeId, absoluto: false, ...(soTorneioId ? { id: soTorneioId } : {}) },
  });
  const dados: { torneioId: number; equipeId: number }[] = [];
  for (const t of torneios) {
    for (const e of equipes) {
      if (!t.naipe || t.naipe === e.naipe) dados.push({ torneioId: t.id, equipeId: e.id });
    }
  }
  if (dados.length === 0) return 0;
  const r = await prisma.torneioEquipe.createMany({ data: dados, skipDuplicates: true });
  return r.count;
}

// RN165: equipe coletiva recém-criada entra nos torneios do mesmo naipe (sem mexer nas demais equipes).
export async function incluirEquipeNosTorneios(equipeId: number): Promise<void> {
  const equipe = await prisma.equipe.findUnique({
    where: { id: equipeId },
    select: { id: true, naipe: true, modalidadeId: true, modalidade: { select: { tipo: true } } },
  });
  if (!equipe || equipe.modalidade.tipo !== "COLETIVA") return;
  const torneios = await prisma.torneio.findMany({
    where: { modalidadeId: equipe.modalidadeId, absoluto: false },
    select: { id: true, naipe: true },
  });
  const dados = torneios
    .filter((t) => !t.naipe || t.naipe === equipe.naipe)
    .map((t) => ({ torneioId: t.id, equipeId: equipe.id }));
  if (dados.length > 0) await prisma.torneioEquipe.createMany({ data: dados, skipDuplicates: true });
}
