import { classificar, type ConfigClass, type JogoClass, type Linha } from "./classificacao";

// RN237-RN240: melhores colocados de uma mesma posição entre os grupos (ex.: os 8 melhores terceiros da Copa de 2026).
// Sem acesso ao banco (fácil de testar).

export type TabelaGrupo = { grupo: number; linhas: Linha[]; jogos: JogoClass[]; completa: boolean };
export type LinhaMelhor = Linha & { grupo: number };

export type RankingMelhores = {
  linhas: LinhaMelhor[]; // já na ordem do ranking (posicao = colocação entre os grupos)
  definido: boolean; // todos os grupos acabaram e não há empate sem solução entre as vagas
  pendencia: string | null; // por que ainda não está definido
  descartados: number; // quantas posições do fim do grupo foram ignoradas (grupos maiores que o menor)
};

// posicao: a posição que disputa as vagas (ex.: 3). vagas: quantos desse ranking avançam.
// manual: ordem decidida à mão pelo coordenador para empates entre grupos (1 = fica na frente).
export function rankearMelhores(
  tabelas: TabelaGrupo[],
  posicao: number,
  vagas: number,
  cfg: ConfigClass,
  manual: Map<number, number | null>
): RankingMelhores {
  const tamanhos = tabelas.map((t) => t.linhas.length);
  const menor = tamanhos.length > 0 ? Math.min(...tamanhos) : 0;

  // Grupos maiores que o menor: ignora os jogos contra quem ficou além da posição "menor" (ex.: contra o último).
  const jogos: JogoClass[] = [];
  const candidatos: { id: number; grupo: number; empatadaNoGrupo: boolean }[] = [];
  for (const t of tabelas) {
    const fora = new Set(t.linhas.filter((l) => l.posicao > menor).map((l) => l.equipeId));
    for (const j of t.jogos) if (!fora.has(j.a) && !fora.has(j.b)) jogos.push(j);
    const c = t.linhas.find((l) => l.posicao === posicao);
    if (c) candidatos.push({ id: c.equipeId, grupo: t.grupo, empatadaNoGrupo: c.empatada });
  }

  const grupoDe = new Map(candidatos.map((c) => [c.id, c.grupo]));
  const equipes = candidatos.map((c) => ({ id: c.id, manual: manual.get(c.id) ?? null }));
  const linhas = classificar(equipes, jogos, cfg).map((l) => ({ ...l, grupo: grupoDe.get(l.equipeId)! }));

  let pendencia: string | null = null;
  if (tabelas.length === 0 || tabelas.some((t) => !t.completa)) {
    pendencia = "Ainda há grupos em andamento.";
  } else if (candidatos.length < tabelas.length) {
    pendencia = "Há grupo com menos equipes do que a posição disputada.";
  } else if (candidatos.some((c) => c.empatadaNoGrupo)) {
    pendencia = "Há empate sem solução dentro de um grupo; defina a ordem do grupo primeiro.";
  } else if (linhas.slice(0, vagas).some((l) => l.empatada)) {
    pendencia = "Há empate sem solução no ranking; defina a ordem à mão.";
  }
  return { linhas, definido: pendencia === null, pendencia, descartados: tamanhos.length ? Math.max(...tamanhos) - menor : 0 };
}

// Coloca os classificados nas vagas da chave. A vaga 1 é a mais favorável (enfrenta o cabeça de chave mais forte).
// Mantém a ordem do ranking sempre que possível, mas evita que o classificado enfrente, na 1ª fase,
// a equipe do próprio grupo (grupoAdversario). Devolve vaga -> equipeId.
export function distribuirMelhores(
  qualificados: { equipeId: number; grupo: number }[],
  vagas: { numero: number; grupoAdversario: number | null }[]
): Map<number, number> {
  const ordenadas = [...vagas].sort((a, b) => a.numero - b.numero);
  const usado = new Array(qualificados.length).fill(false);
  const escolha: number[] = new Array(ordenadas.length).fill(-1);

  const buscar = (i: number): boolean => {
    if (i === ordenadas.length) return true;
    for (let q = 0; q < qualificados.length; q++) {
      if (usado[q]) continue;
      const adv = ordenadas[i].grupoAdversario;
      if (adv !== null && qualificados[q].grupo === adv) continue;
      usado[q] = true;
      escolha[i] = q;
      if (buscar(i + 1)) return true;
      usado[q] = false;
    }
    return false;
  };

  const resultado = new Map<number, number>();
  if (buscar(0)) {
    ordenadas.forEach((v, i) => resultado.set(v.numero, qualificados[escolha[i]].equipeId));
  } else {
    // Sem solução sem repetir grupo: segue a ordem do ranking (o coordenador pode ajustar à mão).
    ordenadas.forEach((v, i) => {
      if (qualificados[i]) resultado.set(v.numero, qualificados[i].equipeId);
    });
  }
  return resultado;
}
