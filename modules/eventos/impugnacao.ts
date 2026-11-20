// Regras puras da impugnação e do recurso (RN192 a RN198). Sem banco, para poder testar à parte.
import type { FaseConferencia } from "./conferencia";

export type StatusImpugnacao = "IMPUGNADO" | "RECURSO_ENVIADO" | "DEFERIDO" | "INDEFERIDO";

export const ROTULO_STATUS: Record<StatusImpugnacao, string> = {
  IMPUGNADO: "Impugnado (em recurso)",
  RECURSO_ENVIADO: "Recurso enviado (aguardando decisão)",
  DEFERIDO: "Deferido (inscrição vale)",
  INDEFERIDO: "Indeferido",
};

type Estado = { status: StatusImpugnacao; bloqueio: boolean };

// Pendente = ainda precisa de decisão do coordenador. Trava o sorteio (RN197).
export function estaPendente(status: StatusImpugnacao): boolean {
  return status === "IMPUGNADO" || status === "RECURSO_ENVIADO";
}

// RN195: um recurso por impugnação, só durante a conferência ou o prazo de recurso; bloqueio não tem recurso.
export function recursoPermitido(
  fase: FaseConferencia,
  imp: Estado
): { ok: true } | { ok: false; motivo: string } {
  if (imp.bloqueio) return { ok: false, motivo: "Este atleta foi bloqueado pelo coordenador; não cabe recurso." };
  if (imp.status !== "IMPUGNADO") return { ok: false, motivo: "Este atleta não está aguardando recurso." };
  if (fase !== "CONFERENCIA" && fase !== "RECURSO") {
    return { ok: false, motivo: "O prazo para enviar recurso não está aberto." };
  }
  return { ok: true };
}

// RN196: o coordenador decide enquanto estiver pendente.
export function decisaoPermitida(imp: Estado): boolean {
  return !imp.bloqueio && estaPendente(imp.status);
}

// RN195: o coordenador pode reabrir uma decisão indeferida (inclui bloqueio).
export function reaberturaPermitida(imp: Estado): boolean {
  return imp.status === "INDEFERIDO";
}

export const MIN_MOTIVO = 5;
export const MIN_RECURSO = 10;
