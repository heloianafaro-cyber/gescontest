// Geração de confrontos (RN172, RN173). Sem banco: só calcula quem joga contra quem.

export type Confronto = { rodada: number; a: number; b: number };

const FOLGA = -1;

// Rodízio (todos contra todos) pelo método do círculo: em cada rodada, todos jogam uma vez.
// Com número ímpar de equipes, uma folga por rodada. Returno repete os confrontos com mando invertido.
export function rodizio(ids: number[], turnos: number): { confrontos: Confronto[]; rodadasPorTurno: number } {
  const arr = [...ids];
  if (arr.length % 2 === 1) arr.push(FOLGA);
  const m = arr.length;
  const rodadasPorTurno = m - 1;
  const primeiro: Confronto[] = [];

  let giro = [...arr];
  for (let r = 0; r < rodadasPorTurno; r++) {
    for (let i = 0; i < m / 2; i++) {
      const x = giro[i];
      const y = giro[m - 1 - i];
      if (x === FOLGA || y === FOLGA) continue;
      // Alterna o mando para ninguém ficar sempre como "A".
      primeiro.push((r + i) % 2 === 0 ? { rodada: r + 1, a: x, b: y } : { rodada: r + 1, a: y, b: x });
    }
    giro = [giro[0], giro[m - 1], ...giro.slice(1, m - 1)];
  }

  const confrontos = [...primeiro];
  if (turnos === 2) {
    for (const c of primeiro) confrontos.push({ rodada: c.rodada + rodadasPorTurno, a: c.b, b: c.a });
  }
  return { confrontos, rodadasPorTurno };
}

// ---------------------------------------------------------------------------
// Eliminatória simples e mata-mata do sistema misto (RN131, RN135, RN171, RN178, RN179)
// ---------------------------------------------------------------------------

import { potenciaDe2, ordemDaChave } from "./sorteio";

// Cada vaga de um jogo é: uma equipe já conhecida, o resultado de outro jogo do plano,
// o classificado numa posição de um grupo (mata-mata depois dos grupos) ou o "melhor Nº colocado" entre os grupos
// (RN237: ex.: o 3º melhor terceiro colocado, numerado pelo ranking).
export type Lado = { equipeId: number } | { jogo: number } | { grupo: number; pos: number } | { melhor: number };
export type JogoPlano = {
  fase: string;
  rodada: number;
  a: Lado;
  b: Lado;
  perdedores?: boolean;
  serie?: number; // play-off: número do confronto
  jogoNaSerie?: number; // play-off: jogo 1, 2, 3... do confronto
};

function nomeDaFase(vagas: number): string {
  if (vagas === 2) return "Final";
  if (vagas === 4) return "Semifinal";
  if (vagas === 8) return "Quartas de final";
  if (vagas === 16) return "Oitavas de final";
  return `Fase de ${vagas}`;
}

// entradas: o que ocupa cada posição da primeira rodada (índice 0 = posição 1); null = isento (bye).
// Isentos passam direto: não geram jogo, e a vaga já entra na rodada seguinte.
// rodadaInicial: número da primeira rodada do mata-mata (no misto vem depois da fase de grupos).
export function chaveDeLados(entradas: (Lado | null)[], terceiroLugar: string | null, rodadaInicial = 1): JogoPlano[] {
  const jogos: JogoPlano[] = [];
  let vagas: (Lado | null)[] = [...entradas];
  let rodada = rodadaInicial;

  while (vagas.length > 1) {
    const fase = nomeDaFase(vagas.length);
    const proximas: (Lado | null)[] = [];
    for (let i = 0; i < vagas.length; i += 2) {
      const a = vagas[i];
      const b = vagas[i + 1];
      if (a && b) {
        jogos.push({ fase, rodada, a, b });
        proximas.push({ jogo: jogos.length - 1 });
      } else {
        proximas.push(a ?? b);
      }
    }
    // Disputa de 3º lugar: entre os perdedores das duas semifinais (só se as duas existem como jogo).
    if (vagas.length === 4 && terceiroLugar === "DISPUTA_3LUGAR") {
      const [s1, s2] = proximas;
      if (s1 && s2 && "jogo" in s1 && "jogo" in s2) {
        jogos.push({ fase: "Disputa de 3º lugar", rodada: rodada + 1, a: s1, b: s2, perdedores: true });
      }
    }
    vagas = proximas;
    rodada++;
  }
  return jogos;
}

// posicoes: equipe em cada posição da chave (índice 0 = posição 1); null = isento (bye).
export function chaveEliminatoria(posicoes: (number | null)[], terceiroLugar: string | null): JogoPlano[] {
  return chaveDeLados(posicoes.map((id) => (id === null ? null : { equipeId: id })), terceiroLugar);
}

const letra = (g: number) => String.fromCharCode(64 + g);

// Sistema misto: cada grupo joga em rodízio (turno simples) e os melhores de cada grupo seguem para o mata-mata.
// grupos[i] = equipes do grupo i+1, na ordem do sorteio. k = classificados por grupo.
// vagasMelhores = quantos "melhores de uma posição" (ex.: melhores terceiros) também avançam (0 = não usa).
export function jogosDoMisto(
  grupos: number[][],
  k: number,
  terceiroLugar: string | null,
  vagasMelhores = 0
): JogoPlano[] {
  const jogos: JogoPlano[] = [];
  let ultimaRodada = 0;

  grupos.forEach((ids, i) => {
    const { confrontos, rodadasPorTurno } = rodizio(ids, 1);
    ultimaRodada = Math.max(ultimaRodada, rodadasPorTurno);
    for (const c of confrontos) {
      jogos.push({
        fase: `Grupo ${letra(i + 1)} – Rodada ${c.rodada}`,
        rodada: c.rodada,
        a: { equipeId: c.a },
        b: { equipeId: c.b },
      });
    }
  });

  const g = grupos.length;
  let entradas: (Lado | null)[];
  if (vagasMelhores === 0 && k === 2 && g >= 2 && potenciaDe2(g) === g) {
    // Cruzamento clássico: o 1º de um grupo enfrenta o 2º do grupo vizinho, em lados opostos da chave.
    const primeiros: Lado[] = [];
    const segundos: Lado[] = [];
    for (let p = 0; p < g; p += 2) {
      const x = p + 1;
      const y = p + 2;
      primeiros.push({ grupo: x, pos: 1 }, { grupo: y, pos: 2 });
      segundos.push({ grupo: y, pos: 1 }, { grupo: x, pos: 2 });
    }
    entradas = [...primeiros, ...segundos];
  } else {
    // Outros casos: chave por "seeds" (1ºs colocados primeiro, depois 2ºs em ordem inversa...), com isentos.
    const seeds: Lado[] = [];
    for (let pos = 1; pos <= k; pos++) {
      const ordem = Array.from({ length: g }, (_, i) => i + 1);
      if (pos % 2 === 0) ordem.reverse();
      for (const gr of ordem) seeds.push({ grupo: gr, pos });
    }
    // Os melhores de uma posição (ex.: melhores terceiros) entram por último: o melhor enfrenta o 1º cabeça.
    for (let m = 1; m <= vagasMelhores; m++) seeds.push({ melhor: m });
    const tamanho = potenciaDe2(seeds.length);
    const ordem = ordemDaChave(tamanho);
    entradas = ordem.map((seed) => (seed <= seeds.length ? seeds[seed - 1] : null));
  }

  const deslocamento = jogos.length;
  const remap = (l: Lado): Lado => ("jogo" in l ? { jogo: l.jogo + deslocamento } : l);
  for (const j of chaveDeLados(entradas, terceiroLugar, ultimaRodada + 1)) {
    jogos.push({ ...j, a: remap(j.a), b: remap(j.b) });
  }
  return jogos;
}

// Play-off (RN180): cada confronto do mata-mata vira uma série de jogos, com mando alternado.
// Os jogos de grupo não viram série. Referências "{jogo}" passam a apontar para o 1º jogo da série.
export function expandirSeries(plano: JogoPlano[], jogosSerie: number | null, jogosFinal: number | null): JogoPlano[] {
  if (!jogosSerie) return plano;
  const tamanho = (j: JogoPlano) =>
    j.fase.startsWith("Grupo") ? 1 : j.fase === "Final" ? (jogosFinal ?? jogosSerie) : jogosSerie;

  // Cada rodada ocupa tantas rodadas quanto a maior série dela; as seguintes se deslocam.
  const rodadas = [...new Set(plano.map((j) => j.rodada))].sort((x, y) => x - y);
  const inicio = new Map<number, number>();
  let proxima = rodadas[0] ?? 1;
  for (const r of rodadas) {
    inicio.set(r, proxima);
    proxima += Math.max(...plano.filter((j) => j.rodada === r).map(tamanho));
  }

  const primeiro: number[] = [];
  const saida: JogoPlano[] = [];
  let serie = 0;
  for (const j of plano) {
    primeiro.push(saida.length);
    const remap = (l: Lado): Lado => ("jogo" in l ? { jogo: primeiro[l.jogo] } : l);
    const a = remap(j.a);
    const b = remap(j.b);
    const n = tamanho(j);
    const base = inicio.get(j.rodada)!;
    if (n === 1) {
      saida.push({ ...j, a, b, rodada: base });
      continue;
    }
    serie++;
    for (let k = 1; k <= n; k++) {
      const inverte = k % 2 === 0; // mando alterna a cada jogo
      saida.push({
        ...j,
        rodada: base + k - 1,
        a: inverte ? b : a,
        b: inverte ? a : b,
        serie,
        jogoNaSerie: k,
      });
    }
  }
  return saida;
}
