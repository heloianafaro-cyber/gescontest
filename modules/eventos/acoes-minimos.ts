"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { exigirCoordenadorDoEvento } from "@/modules/eventos/acesso";
import { equipesAbaixoDoMinimo } from "@/modules/eventos/minimos";

// RN207: o coordenador avisa os chefes das delegações que têm equipe abaixo do mínimo.
// Um aviso por delegação, listando as equipes. Pode ser repetido (por exemplo, perto do fim das inscrições).
export async function avisarMinimos(eventoId: number) {
  const { evento } = await exigirCoordenadorDoEvento(eventoId);
  const base = `/coordenador/eventos/${eventoId}/listas`;

  const abaixo = await equipesAbaixoDoMinimo(eventoId);
  if (abaixo.length === 0) redirect(`${base}?ok=${encodeURIComponent("Nenhuma equipe está abaixo do mínimo.")}`);

  const porDelegacao = new Map<number, string[]>();
  for (const a of abaixo) {
    const linhas = porDelegacao.get(a.delegacaoId) ?? [];
    linhas.push(`${a.equipe} (${a.modalidade}): ${a.inscritos} de ${a.minimo}`);
    porDelegacao.set(a.delegacaoId, linhas);
  }

  let avisados = 0;
  for (const [delegacaoId, linhas] of porDelegacao) {
    const chefes = await prisma.usuario.findMany({
      where: { tipo: "TECNICO", delegacaoId },
      select: { id: true },
    });
    if (chefes.length === 0) continue;
    const mensagem = `${evento.nome}: equipe(s) que não atingiram o mínimo de inscritos — ${linhas.join("; ")}.`;
    await prisma.notificacao.createMany({ data: chefes.map((c) => ({ usuarioId: c.id, mensagem })) });
    avisados += chefes.length;
  }

  const texto = `${abaixo.length} equipe(s) abaixo do mínimo. ${avisados} chefe(s) avisado(s).`;
  redirect(`${base}?ok=${encodeURIComponent(texto)}`);
}
