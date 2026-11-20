// Sorteio de grupos, chaves e ordem (RN169, RN170, RN171). Sem banco: só calcula.
// O sorteio usa uma "semente": a mesma semente dá sempre o mesmo resultado,
// assim a prévia mostrada na tela é exatamente o que será gravado ao confirmar.

export type Entrada = { equipeId: number; cabeca: boolean };
export type Sorteado = { equipeId: number; grupo: number | null; posicao: number };

function gerador(semente: number) {
  let a = semente >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function embaralhar<T>(lista: T[], sorte: () => number): T[] {
  const r = [...lista];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(sorte() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

export function potenciaDe2(n: number): number {
  let t = 1;
  while (t < n) t *= 2;
  return t;
}

// Ordem clássica de uma chave: o cabeça 1 e o 2 só se encontram na final, e assim por diante.
// Para 8: [1, 8, 4, 5, 2, 7, 3, 6] (a posição 1 enfrenta a 2, a 3 enfrenta a 4...).
export function ordemDaChave(tamanho: number): number[] {
  let ordem = [1];
  while (ordem.length < tamanho) {
    const total = ordem.length * 2;
    ordem = ordem.flatMap((s) => [s, total + 1 - s]);
  }
  return ordem;
}

export function sortear(
  sistema: string,
  chaves: number | null,
  entradas: Entrada[],
  semente: number
): { itens: Sorteado[] } | { erro: string } {
  const sorte = gerador(semente);
  const n = entradas.length;
  if (n < 2) return { erro: "O torneio precisa de pelo menos 2 participantes para o sorteio." };

  // Cabeças de chave primeiro (embaralhados entre si), depois os demais.
  const ordenadas = [...entradas].sort((a, b) => a.equipeId - b.equipeId);
  const cabecas = embaralhar(ordenadas.filter((e) => e.cabeca), sorte);
  const demais = embaralhar(ordenadas.filter((e) => !e.cabeca), sorte);
  const fila = [...cabecas, ...demais];

  if (sistema === "RODIZIO") {
    return { itens: fila.map((e, i) => ({ equipeId: e.equipeId, grupo: null, posicao: i + 1 })) };
  }

  if (sistema === "MISTO") {
    const g = chaves ?? 0;
    if (g < 2) return { erro: "O torneio misto precisa de pelo menos 2 grupos." };
    if (n < g * 2) return { erro: `Poucos participantes para ${g} grupos (mínimo de 2 por grupo).` };
    const contagem = new Array(g).fill(0);
    // Distribui em sequência: os cabeças se espalham primeiro (um por grupo) e os grupos ficam equilibrados.
    const itens = fila.map((e, i) => {
      const grupo = i % g;
      contagem[grupo] += 1;
      return { equipeId: e.equipeId, grupo: grupo + 1, posicao: contagem[grupo] };
    });
    return { itens };
  }

  if (sistema === "ELIMINATORIO") {
    const tamanho = potenciaDe2(n);
    const ordem = ordemDaChave(tamanho);
    // O cabeça nº k ocupa a posição da chave onde está o "seed" k; seeds acima de n são isentos (byes),
    // que caem justamente diante dos primeiros cabeças (RN171).
    const itens = fila.map((e, i) => ({
      equipeId: e.equipeId,
      grupo: null,
      posicao: ordem.indexOf(i + 1) + 1,
    }));
    return { itens };
  }

  return { erro: "Este sistema de disputa não usa sorteio." };
}

// Organiza o resultado para mostrar na tela (prévia ou sorteio gravado).
export type Estrutura =
  | { tipo: "ORDEM"; ordem: number[] }
  | { tipo: "GRUPOS"; grupos: { numero: number; equipes: number[] }[] }
  | { tipo: "CHAVE"; tamanho: number; confrontos: { a: number | null; b: number | null }[] };

export function estruturar(sistema: string, itens: Sorteado[]): Estrutura {
  if (sistema === "MISTO") {
    const mapa = new Map<number, Sorteado[]>();
    for (const i of itens) mapa.set(i.grupo ?? 0, [...(mapa.get(i.grupo ?? 0) ?? []), i]);
    const grupos = [...mapa.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([numero, lista]) => ({ numero, equipes: lista.sort((x, y) => x.posicao - y.posicao).map((l) => l.equipeId) }));
    return { tipo: "GRUPOS", grupos };
  }
  if (sistema === "ELIMINATORIO") {
    const tamanho = potenciaDe2(itens.length);
    const porPosicao = new Map(itens.map((i) => [i.posicao, i.equipeId]));
    const confrontos = [];
    for (let p = 1; p <= tamanho; p += 2) {
      confrontos.push({ a: porPosicao.get(p) ?? null, b: porPosicao.get(p + 1) ?? null });
    }
    return { tipo: "CHAVE", tamanho, confrontos };
  }
  return { tipo: "ORDEM", ordem: [...itens].sort((a, b) => a.posicao - b.posicao).map((i) => i.equipeId) };
}
