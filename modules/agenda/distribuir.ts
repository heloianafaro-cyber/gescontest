// RN211: distribuição automática dos jogos em dias, períodos e locais. Lógica pura (sem banco, sem relógio).
// Todos os horários aqui são "minutos desde 1970 em UTC" (inteiros), o que deixa as contas simples.

export const DURACAO_PADRAO_MIN = 30; // quando o torneio não define a duração do jogo
export const DESLOCAMENTO_BAHIA_MIN = -180; // a Bahia fica em UTC-3 o ano todo

// Duração total de um jogo, a partir da configuração ATUAL do torneio (não da cópia gravada no jogo):
// tempos × minutos por tempo + intervalos entre os tempos. Ex.: 2 × 20 + 1 × 5 = 45 minutos.
// Sem tempos configurados, vale a duração do jogo do torneio, depois a gravada no jogo, depois 30 minutos.
export function duracaoDoJogo(c: {
  numTempos: number | null;
  duracaoTempoMin: number | null;
  intervaloTemposMin: number | null;
  duracaoJogoMin: number | null;
  duracaoDoJogoGravada: number | null;
}): number {
  if (c.numTempos && c.numTempos > 0 && c.duracaoTempoMin && c.duracaoTempoMin > 0) {
    return c.numTempos * c.duracaoTempoMin + (c.numTempos - 1) * (c.intervaloTemposMin ?? 0);
  }
  if (c.duracaoJogoMin && c.duracaoJogoMin > 0) return c.duracaoJogoMin;
  if (c.duracaoDoJogoGravada && c.duracaoDoJogoGravada > 0) return c.duracaoDoJogoGravada;
  return DURACAO_PADRAO_MIN;
}

export type Periodo = { nome: string; inicioMin: number; fimMin: number; maxJogosPorLocal: number | null };

export type JogoAgenda = {
  id: number;
  torneioId: number;
  modalidadeId: number;
  rodada: number | null;
  numero: number | null;
  duracaoMin: number;
  intervaloMin: number; // folga depois do jogo, no mesmo local
  descansoMin: number; // descanso mínimo da equipe (da modalidade)
  equipes: number[]; // equipes já conhecidas (no mata-mata as vagas vazias ficam de fora)
  deps: number[]; // jogos que precisam terminar antes
};

// Algo que já ocupa o calendário (jogo fixo, travado ou já iniciado).
export type Ocupacao = {
  jogoId: number;
  localId: number | null;
  inicio: number;
  fim: number;
  intervaloMin: number;
  descansoMin: number;
  equipes: number[];
};

export type Entrada = {
  dias: string[]; // "AAAA-MM-DD"
  periodos: Periodo[];
  locais: number[]; // todos os locais do evento
  locaisPorModalidade: Map<number, number[]>; // RN209: a modalidade só usa os locais marcados; sem nenhum marcado, não é agendada
  jogos: JogoAgenda[];
  ocupacoes: Ocupacao[];
  deslocamentoMin: number;
};

export type Alocado = { jogoId: number; localId: number; inicio: number; fim: number };
export type Pendente = { jogoId: number; motivo: string };

export const MOTIVO = {
  SEM_PERIODO: "Nenhum período do dia está configurado.",
  SEM_LOCAL: "O evento não tem locais cadastrados.",
  SEM_LOCAL_DA_MODALIDADE: "Nenhum local foi marcado para esta modalidade (veja Agenda > Locais de cada modalidade).",
  MUITO_LONGO: "O jogo é mais longo que qualquer período do dia.",
  NAO_COUBE: "Não coube nos dias, períodos e locais disponíveis.",
  DEPENDE: "Depende de um jogo que não coube na agenda.",
} as const;

export function paraEpochMin(dia: string, minutoDoDia: number, deslocamentoMin: number): number {
  const [a, m, d] = dia.split("-").map(Number);
  return Date.UTC(a, m - 1, d) / 60000 + minutoDoDia - deslocamentoMin;
}

export function horaParaMinutos(hora: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hora.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 24 || min > 59 || (h === 24 && min > 0)) return null;
  return h * 60 + min;
}

type Janela = { inicio: number; fim: number; max: number | null };

export function distribuir(entrada: Entrada): { alocados: Alocado[]; pendentes: Pendente[] } {
  const { jogos, ocupacoes, deslocamentoMin } = entrada;
  const alocados: Alocado[] = [];
  const pendentes: Pendente[] = [];

  // Janelas: cada período de cada dia, em ordem.
  const janelas: Janela[] = [];
  for (const dia of [...entrada.dias].sort()) {
    for (const p of [...entrada.periodos].sort((x, y) => x.inicioMin - y.inicioMin)) {
      janelas.push({
        inicio: paraEpochMin(dia, p.inicioMin, deslocamentoMin),
        fim: paraEpochMin(dia, p.fimMin, deslocamentoMin),
        max: p.maxJogosPorLocal,
      });
    }
  }
  const maiorJanela = janelas.reduce((m, j) => Math.max(m, j.fim - j.inicio), 0);

  // Ocupação por local e por equipe (fixos + os que formos colocando).
  const porLocal = new Map<number, Ocupacao[]>();
  const porEquipe = new Map<number, Ocupacao[]>();
  const contagem = new Map<string, number>(); // "local|janela" -> jogos
  const carga = new Map<number, number>(); // local -> total de jogos (desempate)
  const fimDoJogo = new Map<number, number>();

  const indiceJanela = (t: number) => janelas.findIndex((j) => t >= j.inicio && t < j.fim);

  const registrar = (o: Ocupacao) => {
    fimDoJogo.set(o.jogoId, o.fim);
    if (o.localId !== null) {
      porLocal.set(o.localId, [...(porLocal.get(o.localId) ?? []), o]);
      carga.set(o.localId, (carga.get(o.localId) ?? 0) + 1);
      const i = indiceJanela(o.inicio);
      if (i >= 0) contagem.set(`${o.localId}|${i}`, (contagem.get(`${o.localId}|${i}`) ?? 0) + 1);
    }
    for (const e of o.equipes) porEquipe.set(e, [...(porEquipe.get(e) ?? []), o]);
  };
  for (const o of ocupacoes) registrar(o);

  const doConjunto = new Map(jogos.map((j) => [j.id, j]));
  const ordenados = [...jogos].sort(
    (a, b) =>
      (a.rodada ?? 0) - (b.rodada ?? 0) ||
      a.torneioId - b.torneioId ||
      (a.numero ?? 0) - (b.numero ?? 0) ||
      a.id - b.id
  );

  const estado = new Map<number, "ok" | "pendente" | "andando">();

  // Primeiro horário livre deste jogo neste local, a partir de "minimo".
  const primeiroHorario = (j: JogoAgenda, localId: number, minimo: number): number | null => {
    let s = minimo;
    for (let volta = 0; volta < 20000; volta++) {
      let w = janelas.findIndex((x) => x.fim > s);
      if (w < 0) return null;
      if (s < janelas[w].inicio) s = janelas[w].inicio;
      const proxima = () => (w + 1 < janelas.length ? janelas[w + 1].inicio : null);

      if (s + j.duracaoMin > janelas[w].fim) {
        const p = proxima();
        if (p === null) return null;
        s = p;
        continue;
      }
      const max = janelas[w].max;
      if (max !== null && (contagem.get(`${localId}|${w}`) ?? 0) >= max) {
        const p = proxima();
        if (p === null) return null;
        s = p;
        continue;
      }

      const fim = s + j.duracaoMin;
      let proximo = s;

      for (const o of porLocal.get(localId) ?? []) {
        if (s < o.fim + o.intervaloMin && o.inicio < fim + j.intervaloMin) proximo = Math.max(proximo, o.fim + o.intervaloMin);
      }
      for (const e of j.equipes) {
        for (const o of porEquipe.get(e) ?? []) {
          if (s < o.fim + j.descansoMin && o.inicio < fim + j.descansoMin) proximo = Math.max(proximo, o.fim + j.descansoMin);
        }
      }
      if (proximo === s) return s;
      s = proximo;
    }
    return null;
  };

  const colocar = (j: JogoAgenda): "ok" | "pendente" => {
    const atual = estado.get(j.id);
    if (atual === "ok" || atual === "pendente") return atual;
    if (atual === "andando") return "pendente"; // ciclo inesperado: não trava
    estado.set(j.id, "andando");

    const resultado = (() => {
      // 1) dependências
      let minimo = Number.NEGATIVE_INFINITY;
      for (const d of j.deps) {
        const dj = doConjunto.get(d);
        if (dj) {
          if (colocar(dj) === "pendente") {
            pendentes.push({ jogoId: j.id, motivo: MOTIVO.DEPENDE });
            return "pendente" as const;
          }
        }
        const fim = fimDoJogo.get(d);
        if (fim !== undefined) minimo = Math.max(minimo, fim + j.descansoMin);
      }

      // 2) pré-condições
      if (janelas.length === 0) {
        pendentes.push({ jogoId: j.id, motivo: MOTIVO.SEM_PERIODO });
        return "pendente" as const;
      }
      if (entrada.locais.length === 0) {
        pendentes.push({ jogoId: j.id, motivo: MOTIVO.SEM_LOCAL });
        return "pendente" as const;
      }
      if (j.duracaoMin > maiorJanela) {
        pendentes.push({ jogoId: j.id, motivo: MOTIVO.MUITO_LONGO });
        return "pendente" as const;
      }

      // 3) melhor local = o que começa mais cedo; empate: o menos usado
      const candidatos = (entrada.locaisPorModalidade.get(j.modalidadeId) ?? []).filter((l) => entrada.locais.includes(l));
      if (candidatos.length === 0) {
        pendentes.push({ jogoId: j.id, motivo: MOTIVO.SEM_LOCAL_DA_MODALIDADE });
        return "pendente" as const;
      }
      let melhor: { localId: number; inicio: number } | null = null;
      for (const l of candidatos) {
        const inicio = primeiroHorario(j, l, minimo === Number.NEGATIVE_INFINITY ? janelas[0].inicio : minimo);
        if (inicio === null) continue;
        if (
          melhor === null ||
          inicio < melhor.inicio ||
          (inicio === melhor.inicio && (carga.get(l) ?? 0) < (carga.get(melhor.localId) ?? 0))
        ) {
          melhor = { localId: l, inicio };
        }
      }
      if (melhor === null) {
        pendentes.push({ jogoId: j.id, motivo: MOTIVO.NAO_COUBE });
        return "pendente" as const;
      }

      const fim = melhor.inicio + j.duracaoMin;
      registrar({
        jogoId: j.id,
        localId: melhor.localId,
        inicio: melhor.inicio,
        fim,
        intervaloMin: j.intervaloMin,
        descansoMin: j.descansoMin,
        equipes: j.equipes,
      });
      alocados.push({ jogoId: j.id, localId: melhor.localId, inicio: melhor.inicio, fim });
      return "ok" as const;
    })();

    estado.set(j.id, resultado);
    return resultado;
  };

  for (const j of ordenados) colocar(j);
  alocados.sort((a, b) => a.inicio - b.inicio || a.localId - b.localId);
  return { alocados, pendentes };
}

// Confere um conjunto de jogos já alocados (usado nos testes e, depois, na edição manual).
export function conflitos(
  a: { jogoId: number; localId: number; inicio: number; fim: number; intervaloMin: number; descansoMin: number; equipes: number[] },
  outros: Ocupacao[]
): string[] {
  const achados: string[] = [];
  for (const o of outros) {
    if (o.jogoId === a.jogoId) continue;
    if (o.localId === a.localId && a.inicio < o.fim + o.intervaloMin && o.inicio < a.fim + a.intervaloMin) {
      achados.push("LOCAL");
    }
    if (a.equipes.some((e) => o.equipes.includes(e)) && a.inicio < o.fim + a.descansoMin && o.inicio < a.fim + a.descansoMin) {
      achados.push("EQUIPE");
    }
  }
  return [...new Set(achados)];
}
