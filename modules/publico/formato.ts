// RN215-RN217: textos das páginas públicas. Lógica pura (sem banco), fuso de Bahia (UTC−3, sem horário de verão).

const FUSO = "America/Bahia";

// "2026-11-21" no horário de Bahia.
export function chaveDia(d: Date): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: FUSO, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

export function rotuloDia(chave: string): string {
  const [a, m, d] = chave.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", weekday: "long", day: "2-digit", month: "2-digit" }).format(
    new Date(Date.UTC(a, m - 1, d))
  );
}

export function horaBahia(d: Date): string {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, hour: "2-digit", minute: "2-digit" }).format(d);
}

// RN216: o evento atual é o que está em andamento; senão o próximo; senão o mais recente.
// Datas no formato "YYYY-MM-DD" (início e fim do evento, e hoje em Bahia).
export type EventoDatas = { id: number; inicio: string; fim: string };
export function escolherEventoAtual(eventos: EventoDatas[], hoje: string): number | null {
  if (eventos.length === 0) return null;
  const emAndamento = eventos.filter((e) => e.inicio <= hoje && hoje <= e.fim);
  if (emAndamento.length > 0) return emAndamento.sort((a, b) => a.inicio.localeCompare(b.inicio) || a.id - b.id)[0].id;
  const proximos = eventos.filter((e) => e.inicio > hoje).sort((a, b) => a.inicio.localeCompare(b.inicio) || a.id - b.id);
  if (proximos.length > 0) return proximos[0].id;
  return [...eventos].sort((a, b) => b.fim.localeCompare(a.fim) || b.id - a.id)[0].id;
}

export type JogoResultado = {
  status: "AGENDADA" | "EM_ANDAMENTO" | "ENCERRADA" | "WO" | "CANCELADA" | "ANULADA";
  formato: "CORRIDO" | "SETS" | "MARCA" | "LUTA" | null;
  placarA: number | null;
  placarB: number | null;
  sets: { a: number; b: number }[];
  decididoPor: string | null;
  penaltisA: number | null;
  penaltisB: number | null;
  vencedorNome: string | null;
  formaVitoria: string | null;
  woNome: string | null;
};

const FORMAS: Record<string, string> = {
  IPPON: "Ippon",
  PONTOS: "Pontos",
  FINALIZACAO: "Finalização",
  DECISAO: "Decisão",
  WO: "W.O.",
  DESCLASSIFICACAO: "Desclassificação",
};

export function textoResultado(j: JogoResultado): { principal: string; detalhe: string } {
  if (j.status === "CANCELADA") return { principal: "Cancelado", detalhe: "" };
  if (j.status === "ANULADA") return { principal: "Anulado", detalhe: "" };
  if (j.status === "AGENDADA") return { principal: "", detalhe: "" };
  if (j.status === "EM_ANDAMENTO") return { principal: "Em andamento", detalhe: "" };
  if (j.status === "WO") return { principal: j.woNome ? `W.O. de ${j.woNome}` : "W.O.", detalhe: "" };

  // ENCERRADA
  if (j.formato === "LUTA") {
    const forma = j.formaVitoria ? (FORMAS[j.formaVitoria] ?? j.formaVitoria) : "";
    return { principal: j.vencedorNome ? `Vitória de ${j.vencedorNome}` : "Encerrado", detalhe: forma };
  }
  const a = j.placarA ?? 0;
  const b = j.placarB ?? 0;
  const principal = `${a} × ${b}`;
  if (j.formato === "SETS") {
    return { principal, detalhe: j.sets.map((s) => `${s.a}-${s.b}`).join(", ") };
  }
  if (j.decididoPor === "PENALTIS" && j.penaltisA !== null && j.penaltisB !== null) {
    return { principal, detalhe: `pênaltis ${j.penaltisA}-${j.penaltisB}` };
  }
  if (j.decididoPor === "PRORROGACAO") return { principal, detalhe: "após prorrogação" };
  return { principal, detalhe: "" };
}
