// RN253-RN258: quadro de medalhas por delegação. Lógica pura (sem banco).
// Cada pódio completo de torneio vira medalhas para as delegações das equipes colocadas.

export type MedalhaTipo = "OURO" | "PRATA" | "BRONZE";

export type EntradaMedalha = {
  torneioId: number;
  torneio: string; // nome do torneio
  modalidade: string; // rótulo da modalidade (com a mãe, se houver)
  colocacoes: { posicao: number; delegacaoId: number }[]; // só posições 1 a 3
};

export type DetalheMedalha = { tipo: MedalhaTipo; torneioId: number; torneio: string; modalidade: string };

export type LinhaQuadro = {
  posicao: number; // empatados em ouro, prata e bronze dividem a mesma posição
  delegacaoId: number;
  nome: string;
  ouro: number;
  prata: number;
  bronze: number;
  total: number;
  detalhes: DetalheMedalha[];
};

const TIPO: Record<number, MedalhaTipo> = { 1: "OURO", 2: "PRATA", 3: "BRONZE" };

export function montarQuadro(entradas: EntradaMedalha[], nomes: Map<number, string>): LinhaQuadro[] {
  const mapa = new Map<number, LinhaQuadro>();
  for (const e of entradas) {
    for (const c of e.colocacoes) {
      const tipo = TIPO[c.posicao];
      if (!tipo) continue;
      let l = mapa.get(c.delegacaoId);
      if (!l) {
        l = { posicao: 0, delegacaoId: c.delegacaoId, nome: nomes.get(c.delegacaoId) ?? "—", ouro: 0, prata: 0, bronze: 0, total: 0, detalhes: [] };
        mapa.set(c.delegacaoId, l);
      }
      if (tipo === "OURO") l.ouro++;
      else if (tipo === "PRATA") l.prata++;
      else l.bronze++;
      l.total++;
      l.detalhes.push({ tipo, torneioId: e.torneioId, torneio: e.torneio, modalidade: e.modalidade });
    }
  }
  const ordem = { OURO: 0, PRATA: 1, BRONZE: 2 };
  const linhas = [...mapa.values()].sort(
    (a, b) => b.ouro - a.ouro || b.prata - a.prata || b.bronze - a.bronze || a.nome.localeCompare(b.nome, "pt-BR")
  );
  linhas.forEach((l, i) => {
    const ant = linhas[i - 1];
    l.posicao = ant && ant.ouro === l.ouro && ant.prata === l.prata && ant.bronze === l.bronze ? ant.posicao : i + 1;
    l.detalhes.sort(
      (x, y) => ordem[x.tipo] - ordem[y.tipo] || x.modalidade.localeCompare(y.modalidade, "pt-BR") || x.torneio.localeCompare(y.torneio, "pt-BR")
    );
  });
  return linhas;
}
