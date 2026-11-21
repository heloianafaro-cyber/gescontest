import { prisma } from "@/lib/prisma";
import { hojeNaBahia } from "@/modules/eventos/conferencia";
import { avisarChefesDoEvento } from "@/modules/eventos/minimos";
import { deveAvisarMinimosHoje } from "@/modules/eventos/minimos-regras";

// Rotina que roda uma vez por dia (Vercel Cron). Hoje só faz o RN208; a limpeza de fichas e arquivos
// (RN109/RN110) entra aqui depois.
export async function rodarRotinaDiaria() {
  const hoje = hojeNaBahia();
  const eventos = await prisma.evento.findMany({
    select: { id: true, nome: true, inscricaoFim: true, dataFim: true },
  });

  const avisos: { evento: string; equipes: number; chefes: number }[] = [];
  for (const ev of eventos) {
    if (!deveAvisarMinimosHoje(ev, hoje)) continue;
    const r = await avisarChefesDoEvento({ id: ev.id, nome: ev.nome }, true);
    avisos.push({ evento: ev.nome, ...r });
  }
  return { dia: hoje, avisosDeMinimo: avisos };
}
