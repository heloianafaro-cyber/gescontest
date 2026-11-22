// RN219-RN222: conteúdo do boletim (congelado quando é gerado) e regras do dia. Lógica pura (sem banco).

export type JogoBol = {
  hora: string;
  local: string | null;
  fase: string | null;
  equipeA: string;
  equipeB: string;
  principal: string;
  detalhe: string;
};
export type ResultadosBol = { modalidade: string; torneio: string; jogos: JogoBol[] };
export type TabelaBol = {
  modalidade: string;
  torneio: string;
  grupo: string | null;
  linhas: { pos: number; equipe: string; p: number; j: number; v: number; e: number; d: number; pro: number; contra: number; saldo: number }[];
};
export type PodioBol = { modalidade: string; torneio: string; colocacoes: { posicao: number; equipe: string }[] };
export type ConteudoBoletim = {
  titulo: string;
  dia: string | null; // "2026-11-21" no boletim diário; vazio no final
  geradoEm: string; // ISO
  resumo: { realizados: number; wo: number; semResultado: number; anulados: number };
  resultados: ResultadosBol[];
  tabelas: TabelaBol[];
  podios: PodioBol[];
};

const terminado = (s: string) => s === "ENCERRADA" || s === "WO";

// RN221: o dia está completo quando todos os jogos dele (menos os cancelados) têm resultado.
export function situacaoDoDia(jogos: { status: string }[]): { total: number; terminados: number; completo: boolean } {
  const validos = jogos.filter((j) => j.status !== "CANCELADA");
  const terminados = validos.filter((j) => terminado(j.status)).length;
  return { total: validos.length, terminados, completo: validos.length > 0 && terminados === validos.length };
}

export function resumoDeJogos(jogos: { status: string }[]) {
  const validos = jogos.filter((j) => j.status !== "CANCELADA");
  return {
    realizados: validos.filter((j) => j.status === "ENCERRADA").length,
    wo: validos.filter((j) => j.status === "WO").length,
    semResultado: validos.filter((j) => j.status === "AGENDADA" || j.status === "EM_ANDAMENTO").length,
    anulados: validos.filter((j) => j.status === "ANULADA").length,
  };
}

export function diaCurto(chave: string): string {
  const [a, m, d] = chave.split("-");
  return `${d}/${m}/${a}`;
}

export function nomeDoBoletim(evento: string, dia: string | null): string {
  return dia ? `Boletim do dia ${diaCurto(dia)} — ${evento}` : `Boletim final — ${evento}`;
}

// Lê o JSON guardado no banco com cuidado (nunca confia no formato).
export function lerConteudo(x: unknown): ConteudoBoletim | null {
  if (typeof x !== "object" || x === null) return null;
  const c = x as Partial<ConteudoBoletim>;
  if (typeof c.titulo !== "string" || !Array.isArray(c.resultados) || !Array.isArray(c.tabelas) || !Array.isArray(c.podios)) return null;
  return {
    titulo: c.titulo,
    dia: typeof c.dia === "string" ? c.dia : null,
    geradoEm: typeof c.geradoEm === "string" ? c.geradoEm : "",
    resumo: c.resumo ?? { realizados: 0, wo: 0, semResultado: 0, anulados: 0 },
    resultados: c.resultados,
    tabelas: c.tabelas,
    podios: c.podios,
  };
}

// RN222: dias (até 3 para trás) completos e ainda sem boletim, para recomendar ao coordenador.
export function diasRecomendados(
  dias: { dia: string; completo: boolean; boletim: "NENHUM" | "RASCUNHO" | "PUBLICADO" }[],
  hoje: string
): string[] {
  const limite = new Date(`${hoje}T00:00:00Z`);
  limite.setUTCDate(limite.getUTCDate() - 3);
  const minimo = limite.toISOString().slice(0, 10);
  return dias.filter((d) => d.completo && d.boletim !== "PUBLICADO" && d.dia <= hoje && d.dia >= minimo).map((d) => d.dia);
}
