// RN181, RN182: transforma o que foi digitado em um resultado válido (sem acessar o banco).

export type Lado = "A" | "B";

export type EntradaResultado = {
  formato: string | null; // CORRIDO | SETS | LUTA
  mataMata: boolean;
  acao: "encerrar" | "wo";
  setsParaVencer: number | null;
  desempate: string | null; // PENALTIS | PRORROGACAO_PENALTIS | null
  woPlacarVencedor: number | null;
  woPlacarPerdedor: number | null;
  // digitado
  placarA: number | null;
  placarB: number | null;
  sets: { a: number; b: number }[];
  prorrogacao: boolean;
  vencedorDesempate: Lado | null;
  penaltisA: number | null;
  penaltisB: number | null;
  vencedorLuta: Lado | null;
  forma: string | null;
  woLado: Lado | null; // quem deu W.O.
};

export type ResultadoValido = {
  placarA: number | null;
  placarB: number | null;
  vencedor: Lado | null; // null = empate (só rodízio)
  forma: string | null;
  decididoPor: string | null;
  penaltisA: number | null;
  penaltisB: number | null;
  sets: { a: number; b: number }[];
  woLado: Lado | null;
};

const vazio: ResultadoValido = {
  placarA: null, placarB: null, vencedor: null, forma: null, decididoPor: null,
  penaltisA: null, penaltisB: null, sets: [], woLado: null,
};

const inteiro = (n: number | null) => n !== null && Number.isInteger(n) && n >= 0;

export function interpretarResultado(e: EntradaResultado): { erro: string } | { resultado: ResultadoValido } {
  if (e.formato !== "CORRIDO" && e.formato !== "SETS" && e.formato !== "LUTA") {
    return { erro: "Este formato de modalidade não tem jogos com placar." };
  }

  // ---- W.O. ----
  if (e.acao === "wo") {
    if (!e.woLado) return { erro: "Escolha qual equipe deu W.O." };
    const vencedor: Lado = e.woLado === "A" ? "B" : "A";
    let pv: number | null = null;
    let pp: number | null = null;
    if (e.formato === "CORRIDO") {
      pv = e.woPlacarVencedor ?? 1;
      pp = e.woPlacarPerdedor ?? 0;
    } else if (e.formato === "SETS") {
      pv = e.setsParaVencer ?? 2;
      pp = 0;
    }
    const a = vencedor === "A" ? pv : pp;
    const b = vencedor === "A" ? pp : pv;
    return { resultado: { ...vazio, placarA: a, placarB: b, vencedor, forma: e.formato === "LUTA" ? "WO" : null, woLado: e.woLado } };
  }

  // ---- Luta ----
  if (e.formato === "LUTA") {
    if (!e.vencedorLuta) return { erro: "Escolha o vencedor da luta." };
    if (!e.forma || e.forma === "WO") return { erro: "Escolha a forma da vitória." };
    // Só a vitória por pontos tem placar (ex.: 10x0); Ippon, finalização etc. não.
    if (e.forma !== "PONTOS") {
      return { resultado: { ...vazio, vencedor: e.vencedorLuta, forma: e.forma } };
    }
    if (!inteiro(e.placarA) || !inteiro(e.placarB)) return { erro: "Informe os pontos dos dois lados." };
    const pa = e.placarA as number;
    const pb = e.placarB as number;
    if ((e.vencedorLuta === "A" && pa <= pb) || (e.vencedorLuta === "B" && pb <= pa)) {
      return { erro: "Os pontos não batem com o vencedor escolhido." };
    }
    return { resultado: { ...vazio, placarA: pa, placarB: pb, vencedor: e.vencedorLuta, forma: e.forma } };
  }

  // ---- Sets ----
  if (e.formato === "SETS") {
    const need = e.setsParaVencer;
    if (!need) return { erro: "A modalidade não tem o número de sets configurado no torneio." };
    if (e.sets.length === 0) return { erro: "Informe o placar de cada set." };
    let a = 0;
    let b = 0;
    for (let i = 0; i < e.sets.length; i++) {
      const s = e.sets[i];
      if (!inteiro(s.a) || !inteiro(s.b)) return { erro: `Set ${i + 1}: use números inteiros.` };
      if (s.a === s.b) return { erro: `Set ${i + 1}: não pode terminar empatado.` };
      if (a === need || b === need) return { erro: `O jogo já estava decidido antes do set ${i + 1}.` };
      if (s.a > s.b) a++;
      else b++;
    }
    if (a !== need && b !== need) return { erro: `Ninguém venceu ${need} sets ainda; confira os sets informados.` };
    return { resultado: { ...vazio, placarA: a, placarB: b, vencedor: a > b ? "A" : "B", sets: e.sets } };
  }

  // ---- Placar corrido ----
  if (!inteiro(e.placarA) || !inteiro(e.placarB)) return { erro: "Informe o placar dos dois lados (números inteiros)." };
  const a = e.placarA as number;
  const b = e.placarB as number;
  const usaProrrogacao = e.desempate === "PRORROGACAO_PENALTIS" && e.prorrogacao;
  if (a !== b) {
    return {
      resultado: { ...vazio, placarA: a, placarB: b, vencedor: a > b ? "A" : "B", decididoPor: usaProrrogacao ? "PRORROGACAO" : "TEMPO_NORMAL" },
    };
  }
  if (!e.mataMata) return { resultado: { ...vazio, placarA: a, placarB: b, vencedor: null } }; // empate vale no rodízio e nos grupos

  // Mata-mata empatado: a modalidade pode ter pênaltis; sem regra, o vencedor é informado à mão.
  if (!e.desempate) {
    if (!e.vencedorDesempate) return { erro: "Jogo empatado no mata-mata: informe quem venceu." };
    return { resultado: { ...vazio, placarA: a, placarB: b, vencedor: e.vencedorDesempate, decididoPor: "MANUAL" } };
  }
  const temPen = e.penaltisA !== null || e.penaltisB !== null;
  let vencedor: Lado | null = e.vencedorDesempate;
  if (temPen) {
    if (!inteiro(e.penaltisA) || !inteiro(e.penaltisB)) return { erro: "Informe o placar dos pênaltis dos dois lados." };
    if (e.penaltisA === e.penaltisB) return { erro: "A disputa de pênaltis não pode terminar empatada." };
    vencedor = (e.penaltisA as number) > (e.penaltisB as number) ? "A" : "B";
    if (e.vencedorDesempate && e.vencedorDesempate !== vencedor) {
      return { erro: "O vencedor escolhido não bate com o placar dos pênaltis." };
    }
  }
  if (!vencedor) return { erro: "Jogo empatado: informe o vencedor dos pênaltis." };
  return {
    resultado: {
      ...vazio, placarA: a, placarB: b, vencedor, decididoPor: "PENALTIS",
      penaltisA: temPen ? e.penaltisA : null, penaltisB: temPen ? e.penaltisB : null,
    },
  };
}
