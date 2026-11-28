import { prisma } from "@/lib/prisma";
import { notificar } from "@/modules/eventos/notificar";
import { jogosDoEvento } from "@/modules/publico/consultas";
import { chaveDia } from "@/modules/publico/formato";
import { diaCurto, diasRecomendados, situacaoDoDia } from "./conteudo";

// RN222: na rotina diária, avisa os coordenadores dos dias (até 3 para trás) que terminaram e ainda não têm boletim publicado.
// Não repete o mesmo aviso nas últimas 24 horas. Devolve quantos avisos foram criados.
export async function avisarBoletinsPendentes(): Promise<number> {
  const hoje = chaveDia(new Date());
  const eventos = await prisma.evento.findMany({
    select: { id: true, nome: true, coordenadores: { select: { usuarioId: true } }, boletins: { select: { tipo: true, dia: true, status: true } } },
  });
  let total = 0;
  for (const ev of eventos) {
    if (ev.coordenadores.length === 0) continue;
    const jogos = await jogosDoEvento(ev.id);
    const porDia = new Map<string, { status: string }[]>();
    for (const j of jogos) {
      if (!j.dataHora || j.resultado.status === "CANCELADA") continue;
      const k = chaveDia(j.dataHora);
      porDia.set(k, [...(porDia.get(k) ?? []), { status: j.resultado.status }]);
    }
    const dias = [...porDia.entries()].map(([dia, js]) => {
      const b = ev.boletins.find((x) => x.tipo === "PARCIAL" && x.dia === dia);
      return { dia, completo: situacaoDoDia(js).completo, boletim: (b ? (b.status === "PUBLICADO" ? "PUBLICADO" : "RASCUNHO") : "NENHUM") as "NENHUM" | "RASCUNHO" | "PUBLICADO" };
    });
    const ontem = new Date(Date.now() - 24 * 60 * 60 * 1000);
    for (const dia of diasRecomendados(dias, hoje)) {
      const mensagem = `Boletim do dia ${diaCurto(dia)} de "${ev.nome}": todos os jogos terminaram. Gere o boletim, revise e publique.`;
      const ids = ev.coordenadores.map((c) => c.usuarioId);
      const ja = await prisma.notificacao.findMany({ where: { usuarioId: { in: ids }, mensagem, dataHora: { gte: ontem } }, select: { usuarioId: true } });
      const jaSet = new Set(ja.map((n) => n.usuarioId));
      const novos = ids.filter((id) => !jaSet.has(id));
      if (novos.length > 0) {
        await notificar(novos, mensagem);
        total += novos.length;
      }
    }
  }
  return total;
}
