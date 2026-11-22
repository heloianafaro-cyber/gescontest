import { prisma } from "@/lib/prisma";
import { hojeNaBahia } from "@/modules/eventos/conferencia";
import { avisarChefesDoEvento } from "@/modules/eventos/minimos";
import { deveAvisarMinimosHoje } from "@/modules/eventos/minimos-regras";
import { avisarBoletinsPendentes } from "@/modules/boletins/avisos";
import { limparFichas } from "@/modules/fichas/limpeza-db";

// Rotina que roda uma vez por dia (Vercel Cron): aviso de mínimo (RN208), recomendação de boletim (RN222)
// e limpeza das fichas de autorização vencidas (RN109, RN110, RN224).
// Só para testes locais: opcoes.hoje simula outra data e opcoes.simular não apaga nada.
export async function rodarRotinaDiaria(opcoes: { hoje?: string; simular?: boolean } = {}) {
  const hoje = opcoes.hoje ?? hojeNaBahia();
  const eventos = await prisma.evento.findMany({
    select: { id: true, nome: true, inscricaoFim: true, dataFim: true },
  });

  const avisos: { evento: string; equipes: number; chefes: number }[] = [];
  for (const ev of eventos) {
    if (!deveAvisarMinimosHoje(ev, hoje)) continue;
    const r = await avisarChefesDoEvento({ id: ev.id, nome: ev.nome }, true);
    avisos.push({ evento: ev.nome, ...r });
  }
  const avisosDeBoletim = await avisarBoletinsPendentes();
  const fichas = await limparFichas(hoje, opcoes.simular === true);
  return { dia: hoje, simulacao: opcoes.simular === true, avisosDeMinimo: avisos, avisosDeBoletim, fichas };
}
