// RN185: classificação do rodízio e dos grupos, com critérios de desempate configuráveis por modalidade.
// Sem acesso ao banco (fácil de testar).

export const CRITERIOS = [
  { codigo: "VITORIAS", rotulo: "Mais vitórias", formatos: ["CORRIDO", "SETS"] },
  { codigo: "SALDO", rotulo: "Melhor saldo (gols ou sets)", formatos: ["CORRIDO", "SETS"] },
  { codigo: "PRO", rotulo: "Mais gols ou sets a favor", formatos: ["CORRIDO", "SETS"] },
  { codigo: "SALDO_PONTOS", rotulo: "Melhor saldo de pontos nos sets", formatos: ["SETS"] },
  { codigo: "PONTOS_PRO", rotulo: "Mais pontos a favor nos sets", formatos: ["SETS"] },
  { codigo: "CONFRONTO_DIRETO", rotulo: "Confronto direto entre os empatados", formatos: ["CORRIDO", "SETS"] },
];

export const CRITERIOS_PADRAO: Record<string, string[]> = {
  CORRIDO: ["VITORIAS", "SALDO", "PRO", "CONFRONTO_DIRETO"],
  SETS: ["VITORIAS", "SALDO", "PRO", "SALDO_PONTOS", "PONTOS_PRO", "CONFRONTO_DIRETO"],
};

export type EquipeClass = { id: number; manual: number | null };
export type JogoClass = {
  a: number;
  b: number;
  placarA: number;
  placarB: number;
  pontosSetA: number; // soma dos pontos de todos os sets (só no formato por sets)
  pontosSetB: number;
};
export type ConfigClass = { pontosVit: number; pontosEmp: number; pontosDer: number; criterios: string[] };

export type Linha = {
  equipeId: number;
  posicao: number;
  jogos: number;
  vitorias: number;
  empates: number;
  derrotas: number;
  pontos: number;
  pro: number;
  contra: number;
  saldo: number;
  pontosPro: number;
  pontosContra: number;
  empatada: boolean; // continua empatada com a vizinha mesmo depois de todos os critérios
};

export function classificar(equipes: EquipeClass[], jogos: JogoClass[], cfg: ConfigClass): Linha[] {
  const base = new Map<number, Linha>();
  for (const e of equipes) {
    base.set(e.id, {
      equipeId: e.id, posicao: 0, jogos: 0, vitorias: 0, empates: 0, derrotas: 0, pontos: 0,
      pro: 0, contra: 0, saldo: 0, pontosPro: 0, pontosContra: 0, empatada: false,
    });
  }
  const pontosDoJogo = (j: JogoClass, lado: "a" | "b") => {
    const meu = lado === "a" ? j.placarA : j.placarB;
    const dele = lado === "a" ? j.placarB : j.placarA;
    return meu > dele ? cfg.pontosVit : meu === dele ? cfg.pontosEmp : cfg.pontosDer;
  };
  for (const j of jogos) {
    for (const lado of ["a", "b"] as const) {
      const l = base.get(lado === "a" ? j.a : j.b);
      if (!l) continue;
      const meu = lado === "a" ? j.placarA : j.placarB;
      const dele = lado === "a" ? j.placarB : j.placarA;
      l.jogos++;
      if (meu > dele) l.vitorias++;
      else if (meu === dele) l.empates++;
      else l.derrotas++;
      l.pontos += pontosDoJogo(j, lado);
      l.pro += meu;
      l.contra += dele;
      l.pontosPro += lado === "a" ? j.pontosSetA : j.pontosSetB;
      l.pontosContra += lado === "a" ? j.pontosSetB : j.pontosSetA;
    }
  }
  for (const l of base.values()) l.saldo = l.pro - l.contra;

  // Divide um bloco de empatadas pelo valor de um critério (maior = melhor).
  const dividir = (bloco: Linha[], valor: (l: Linha) => number): Linha[][] => {
    const grupos = new Map<number, Linha[]>();
    for (const l of bloco) grupos.set(valor(l), [...(grupos.get(valor(l)) ?? []), l]);
    return [...grupos.entries()].sort((x, y) => y[0] - x[0]).map(([, ls]) => ls);
  };

  const valorDoCriterio = (codigo: string, bloco: Linha[]): ((l: Linha) => number) | null => {
    switch (codigo) {
      case "VITORIAS": return (l) => l.vitorias;
      case "SALDO": return (l) => l.saldo;
      case "PRO": return (l) => l.pro;
      case "SALDO_PONTOS": return (l) => l.pontosPro - l.pontosContra;
      case "PONTOS_PRO": return (l) => l.pontosPro;
      case "CONFRONTO_DIRETO": {
        const ids = new Set(bloco.map((l) => l.equipeId));
        const mini = new Map<number, number>(bloco.map((l) => [l.equipeId, 0]));
        for (const j of jogos) {
          if (!ids.has(j.a) || !ids.has(j.b)) continue;
          mini.set(j.a, (mini.get(j.a) ?? 0) + pontosDoJogo(j, "a"));
          mini.set(j.b, (mini.get(j.b) ?? 0) + pontosDoJogo(j, "b"));
        }
        return (l) => mini.get(l.equipeId) ?? 0;
      }
      default: return null;
    }
  };

  // Começa pelos pontos; cada critério desfaz os empates que sobraram, na ordem configurada.
  let blocos: Linha[][] = dividir([...base.values()], (l) => l.pontos);
  for (const codigo of cfg.criterios) {
    blocos = blocos.flatMap((b) => {
      if (b.length < 2) return [b];
      const valor = valorDoCriterio(codigo, b);
      return valor ? dividir(b, valor) : [b];
    });
  }
  // Por último, a ordem decidida à mão pelo coordenador (quem não tem fica junto).
  const manual = new Map(equipes.map((e) => [e.id, e.manual]));
  blocos = blocos.flatMap((b) => {
    if (b.length < 2) return [b];
    const grupos = new Map<number, Linha[]>();
    for (const l of b) {
      const m = manual.get(l.equipeId) ?? Number.MAX_SAFE_INTEGER;
      grupos.set(m, [...(grupos.get(m) ?? []), l]);
    }
    return [...grupos.entries()].sort((x, y) => x[0] - y[0]).map(([, ls]) => ls);
  });

  const saida: Linha[] = [];
  for (const b of blocos) {
    for (const l of [...b].sort((x, y) => x.equipeId - y.equipeId)) {
      l.empatada = b.length > 1;
      l.posicao = saida.length + 1;
      saida.push(l);
    }
  }
  return saida;
}

// Quais posições (1..k) já estão definidas, ou seja, não fazem parte de um empate sem solução.
export function posicoesDefinidas(linhas: Linha[], k: number): Map<number, number> {
  const definidas = new Map<number, number>(); // posição -> equipeId
  for (const l of linhas) {
    if (l.posicao <= k && !l.empatada) definidas.set(l.posicao, l.equipeId);
  }
  return definidas;
}
