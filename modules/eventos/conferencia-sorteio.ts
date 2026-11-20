import { faseDaConferencia, type DatasConferencia } from "./conferencia";
import { contarPendentes } from "./conferencia-db";

const formatar = (d: Date) => d.toLocaleDateString("pt-BR", { timeZone: "UTC" });

// RN177/RN197: com conferência configurada, o sorteio só é liberado depois da conferência e do prazo de
// recurso, e sem impugnação aguardando decisão. Devolve a mensagem do bloqueio, ou null se está liberado.
export async function bloqueioDoSorteio(evento: { id: number } & DatasConferencia): Promise<string | null> {
  const fase = faseDaConferencia(evento);
  if (fase === "ANTES" && evento.conferenciaInicio) {
    return `O sorteio só é liberado depois da conferência das inscrições, que começa em ${formatar(evento.conferenciaInicio)}.`;
  }
  if (fase === "CONFERENCIA" && evento.conferenciaFim) {
    return `A conferência das inscrições vai até ${formatar(evento.conferenciaFim)}. O sorteio só é liberado depois dela.`;
  }
  if (fase === "RECURSO" && evento.recursoFim) {
    return `O prazo de recurso vai até ${formatar(evento.recursoFim)}. O sorteio só é liberado depois dele.`;
  }
  const pendentes = await contarPendentes(evento.id);
  if (pendentes > 0) {
    return `Há ${pendentes} impugnação(ões) aguardando decisão do coordenador. Decida na tela de Conferência antes de sortear.`;
  }
  return null;
}
