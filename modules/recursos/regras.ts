// RN233, RN234: regras puras dos recursos de jogo (sem banco).

export const STATUS_FINAIS = ["ENCERRADA", "WO", "ANULADA"] as const;

// Prazo (RN234): sem horas definidas ou sem resultado registrado, nunca vence.
export function prazoEncerrado(p: { horas: number | null; resultadoEm: Date | null; status: string; agora?: Date }): boolean {
  if (p.horas == null || p.resultadoEm == null) return false;
  if (!(STATUS_FINAIS as readonly string[]).includes(p.status)) return false;
  const limite = p.resultadoEm.getTime() + p.horas * 3600_000;
  return (p.agora ?? new Date()).getTime() > limite;
}

// Link das provas (RN233): opcional, só https, sem espaços.
export function validarLink(texto: string): { ok: true; link: string | null } | { ok: false; erro: string } {
  const t = texto.trim();
  if (t === "") return { ok: true, link: null };
  if (t.length > 500 || /\s/.test(t)) return { ok: false, erro: "Link inválido." };
  let url: URL;
  try {
    url = new URL(t);
  } catch {
    return { ok: false, erro: "Link inválido. Cole o endereço completo, começando com https://" };
  }
  if (url.protocol !== "https:") return { ok: false, erro: "O link precisa começar com https://" };
  return { ok: true, link: url.toString() };
}
