"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { exigirCoordenadorDoEvento } from "@/modules/eventos/acesso";
import { gravarDistribuicao, lerModo } from "@/modules/agenda/distribuir-db";

// RN212: só grava depois da confirmação do coordenador (a prévia usa o mesmo cálculo).
export async function confirmarDistribuicao(eventoId: number, formData: FormData) {
  await exigirCoordenadorDoEvento(eventoId);
  const modo = lerModo(formData.get("modo"));
  const base = `/coordenador/eventos/${eventoId}/agenda`;

  const r = await gravarDistribuicao(eventoId, modo);
  revalidatePath(`${base}/jogos`);
  const texto = r
    ? `${r.agendados} jogo(s) agendado(s)${r.pendentes > 0 ? `; ${r.pendentes} não coube(ram) (veja a lista de pendentes)` : ""}.`
    : "Evento não encontrado.";
  redirect(`${base}/jogos?ok=${encodeURIComponent(texto)}`);
}
