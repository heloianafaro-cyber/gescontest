// RN218: pódio do torneio. Só existe quando todos os jogos terminaram. Lógica pura (sem banco).

export type JogoPodio = {
  id: number;
  fase: string | null;
  status: string;
  serie: number | null;
  a: number | null;
  b: number | null;
  placarA: number | null;
  placarB: number | null;
  penaltisA: number | null;
  penaltisB: number | null;
  vencedorId: number | null;
  woEquipeId: number | null;
};

export type EntradaPodio = {
  sistema: string; // RODIZIO, ELIMINATORIO, MISTO, PLAYOFF
  terceiroLugar: string | null; // DISPUTA_3LUGAR, DOIS_BRONZES ou SEM_DISPUTA
  jogos: JogoPodio[];
  tabela: { equipeId: number; posicao: number; empatada: boolean }[] | null; // só rodízio
};

export type Colocacao = { posicao: number; equipeId: number };
export type ResultadoPodio = { completo: boolean; colocacoes: Colocacao[]; pendente: string };

const terminado = (s: string) => s === "ENCERRADA" || s === "WO";

export function vencedorDoJogo(j: JogoPodio): number | null {
  if (j.status === "WO") {
    if (j.woEquipeId === null) return null;
    return j.woEquipeId === j.a ? j.b : j.woEquipeId === j.b ? j.a : null;
  }
  if (j.status !== "ENCERRADA") return null;
  if (j.vencedorId !== null) return j.vencedorId;
  if (j.placarA !== null && j.placarB !== null && j.placarA !== j.placarB) return j.placarA > j.placarB ? j.a : j.b;
  if (j.penaltisA !== null && j.penaltisB !== null && j.penaltisA !== j.penaltisB) return j.penaltisA > j.penaltisB ? j.a : j.b;
  return null;
}

type Unidade = { fase: string; vencedor: number | null; perdedor: number | null };

// Um jogo, ou uma série de play-off inteira, vira uma unidade com vencedor e perdedor.
function unidades(jogos: JogoPodio[]): Unidade[] {
  const grupos = new Map<string, JogoPodio[]>();
  for (const j of jogos) {
    const k = j.serie !== null ? `s${j.serie}` : `j${j.id}`;
    grupos.set(k, [...(grupos.get(k) ?? []), j]);
  }
  return [...grupos.values()].map((g) => {
    const fase = g[0].fase ?? "";
    const times = new Set<number>();
    const vitorias = new Map<number, number>();
    for (const j of g) {
      if (j.a !== null) times.add(j.a);
      if (j.b !== null) times.add(j.b);
      const v = vencedorDoJogo(j);
      if (v !== null) vitorias.set(v, (vitorias.get(v) ?? 0) + 1);
    }
    const ordenado = [...vitorias.entries()].sort((x, y) => y[1] - x[1]);
    const vencedor = ordenado.length > 0 && (ordenado.length === 1 || ordenado[0][1] > ordenado[1][1]) ? ordenado[0][0] : null;
    const perdedor = vencedor === null ? null : ([...times].find((t) => t !== vencedor) ?? null);
    return { fase, vencedor, perdedor };
  });
}

export function calcularPodio(e: EntradaPodio): ResultadoPodio {
  const vazio = (pendente: string): ResultadoPodio => ({ completo: false, colocacoes: [], pendente });
  const jogos = e.jogos.filter((j) => j.status !== "CANCELADA");
  if (jogos.length === 0) return vazio("Os jogos ainda não foram gerados.");
  if (!jogos.every((j) => terminado(j.status))) return vazio("Há jogos ainda sem resultado.");

  if (e.sistema === "RODIZIO") {
    if (!e.tabela) return vazio("Sem tabela de classificação.");
    const topo = e.tabela.filter((l) => l.posicao <= 3);
    if (topo.some((l) => l.empatada)) return vazio("Aguardando o desempate do coordenador.");
    return { completo: true, pendente: "", colocacoes: topo.map((l) => ({ posicao: l.posicao, equipeId: l.equipeId })) };
  }

  const us = unidades(jogos);
  const final = us.find((u) => u.fase === "Final");
  if (!final || final.vencedor === null || final.perdedor === null) return vazio("A final ainda não foi decidida.");
  const col: Colocacao[] = [
    { posicao: 1, equipeId: final.vencedor },
    { posicao: 2, equipeId: final.perdedor },
  ];

  const bronzes = us.filter((u) => u.fase.startsWith("Disputa de bronze"));
  const terceiro = us.find((u) => u.fase === "Disputa de 3º lugar");
  if (bronzes.length > 0) {
    for (const b of bronzes) if (b.vencedor !== null) col.push({ posicao: 3, equipeId: b.vencedor });
  } else if (terceiro) {
    if (terceiro.vencedor === null) return vazio("A disputa de 3º lugar ainda não foi decidida.");
    col.push({ posicao: 3, equipeId: terceiro.vencedor });
  } else if (e.terceiroLugar === "DOIS_BRONZES") {
    for (const s of us.filter((u) => u.fase === "Semifinal")) if (s.perdedor !== null) col.push({ posicao: 3, equipeId: s.perdedor });
  }
  return { completo: true, pendente: "", colocacoes: col };
}
