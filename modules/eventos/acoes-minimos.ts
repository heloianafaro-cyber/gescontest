"use server";

import { redirect } from "next/navigation";
import { exigirCoordenadorDoEvento } from "@/modules/eventos/acesso";
import { avisarChefesDoEvento } from "@/modules/eventos/minimos";

// RN207: botão manual do coordenador. Sempre envia (mesmo que o aviso automático já tenha ido hoje).
export async function avisarMinimos(eventoId: number) {
  const { evento } = await exigirCoordenadorDoEvento(eventoId);
  const base = `/coordenador/eventos/${eventoId}/listas`;

  const r = await avisarChefesDoEvento({ id: evento.id, nome: evento.nome }, false);
  const texto =
    r.equipes === 0
      ? "Nenhuma equipe está abaixo do mínimo."
      : `${r.equipes} equipe(s) abaixo do mínimo. ${r.chefes} chefe(s) avisado(s).`;
  redirect(`${base}?ok=${encodeURIComponent(texto)}`);
}
