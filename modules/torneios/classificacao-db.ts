import { prisma } from "@/lib/prisma";
import { classificar, CRITERIOS_PADRAO, posicoesDefinidas, type JogoClass, type Linha } from "./classificacao";
import { distribuirMelhores, rankearMelhores, type RankingMelhores } from "./melhores";

// Acesso ao banco para a classificação (RN185) e para a entrada dos classificados no mata-mata (RN183).

type Tx = Omit<typeof prisma, "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends">;

export type Tabela = { grupo: number | null; linhas: Linha[]; completa: boolean; jogos: JogoClass[] };

export async function tabelasDoTorneio(tx: Tx, torneioId: number) {
  const t = await tx.torneio.findUnique({
    where: { id: torneioId },
    include: {
      modalidade: true,
      participantes: { include: { equipe: { select: { nome: true } } } },
      disputas: { include: { partida: { include: { sets: true } } } },
    },
  });
  if (!t) return null;
  const nomes = new Map(t.participantes.map((p) => [p.equipeId, p.equipe.nome]));
  const formato = t.modalidade.formatoPlacar;
  const temTabela =
    (t.sistemaDisputa === "RODIZIO" || t.sistemaDisputa === "MISTO") &&
    (formato === "CORRIDO" || formato === "SETS" || formato === "LUTA");
  if (!temTabela) return { torneio: t, nomes, tabelas: [] as Tabela[], cfg: null };

  const criterios =
    t.modalidade.criteriosDesempate.length > 0
      ? t.modalidade.criteriosDesempate
      : (CRITERIOS_PADRAO[formato === "SETS" ? "SETS" : "CORRIDO"] ?? []);
  const cfg = { pontosVit: t.pontosVit, pontosEmp: t.pontosEmp, pontosDer: t.pontosDer, criterios };

  const grupoDe = new Map(t.participantes.map((p) => [p.equipeId, p.grupo]));
  const grupos = t.sistemaDisputa === "MISTO"
    ? [...new Set(t.participantes.map((p) => p.grupo).filter((g): g is number => g !== null))].sort((a, b) => a - b)
    : [null];

  const tabelas: Tabela[] = grupos.map((g) => {
    const equipes = t.participantes
      .filter((p) => g === null || p.grupo === g)
      .map((p) => ({ id: p.equipeId, manual: p.desempateManual }));
    // Jogos da fase de pontos corridos (no misto, só os de grupo).
    const doGrupo = t.disputas.filter(
      (d) =>
        d.partida?.equipeAId != null &&
        (g === null || grupoDe.get(d.partida.equipeAId) === g) &&
        (t.sistemaDisputa !== "MISTO" || (d.fase ?? "").startsWith("Grupo"))
    );
    const jogos: JogoClass[] = [];
    for (const d of doGrupo) {
      const p = d.partida!;
      if (d.status !== "ENCERRADA" && d.status !== "WO") continue;
      if (p.equipeAId === null || p.equipeBId === null) continue;
      let placarA = p.placarA ?? 0;
      let placarB = p.placarB ?? 0;
      if (formato === "LUTA") {
        placarA = p.vencedorId === p.equipeAId ? 1 : 0;
        placarB = p.vencedorId === p.equipeBId ? 1 : 0;
      }
      jogos.push({
        a: p.equipeAId,
        b: p.equipeBId,
        placarA,
        placarB,
        pontosSetA: p.sets.reduce((s, x) => s + x.pontosA, 0),
        pontosSetB: p.sets.reduce((s, x) => s + x.pontosB, 0),
      });
    }
    const completa = doGrupo.length > 0 && doGrupo.every((d) => !["AGENDADA", "EM_ANDAMENTO"].includes(d.status));
    return { grupo: g, linhas: classificar(equipes, jogos, cfg), completa, jogos };
  });
  return { torneio: t, nomes, tabelas, cfg };
}

type Dados = NonNullable<Awaited<ReturnType<typeof tabelasDoTorneio>>>;

// RN237-RN240: ranking dos melhores de uma posição entre os grupos (ex.: melhores terceiros). Facultativo no torneio.
export function rankingDosMelhores(dados: Dados): RankingMelhores | null {
  const t = dados.torneio;
  if (t.sistemaDisputa !== "MISTO" || !t.melhoresPosicao || !t.melhoresVagas || !dados.cfg) return null;
  const grupos = dados.tabelas
    .filter((x) => x.grupo !== null)
    .map((x) => ({ grupo: x.grupo as number, linhas: x.linhas, jogos: x.jogos, completa: x.completa }));
  const manual = new Map(t.participantes.map((p) => [p.equipeId, p.desempateMelhores]));
  return rankearMelhores(grupos, t.melhoresPosicao, t.melhoresVagas, dados.cfg, manual);
}

// Sistema misto: quando um grupo termina, os classificados ocupam as vagas "1º do Grupo A", etc.
export async function preencherClassificados(tx: Tx, torneioId: number) {
  const dados = await tabelasDoTorneio(tx, torneioId);
  if (!dados || dados.torneio.sistemaDisputa !== "MISTO") return;
  const k = dados.torneio.classificadosPorGrupo ?? 0;

  const definidas = new Map<number, Map<number, number>>(); // grupo -> posição -> equipe
  for (const tab of dados.tabelas) {
    if (tab.grupo !== null && tab.completa) definidas.set(tab.grupo, posicoesDefinidas(tab.linhas, k));
  }

  // Melhores de uma posição entre os grupos: só entram quando o ranking está definido; evita mesmo grupo na 1ª fase.
  const colocados = new Map<number, number>(); // vaga (nº do melhor) -> equipe
  const ranking = rankingDosMelhores(dados);
  const vagasMelhores = dados.torneio.melhoresVagas ?? 0;
  if (ranking?.definido && vagasMelhores > 0) {
    const qualificados = ranking.linhas.slice(0, vagasMelhores).map((l) => ({ equipeId: l.equipeId, grupo: l.grupo }));
    const adversario = (p: { origemGrupoA: number | null; origemPosA: number | null; origemMelhorA: number | null; origemGrupoB: number | null; origemPosB: number | null; origemMelhorB: number | null }, lado: "A" | "B") => {
      const g = lado === "A" ? p.origemGrupoB : p.origemGrupoA;
      const pos = lado === "A" ? p.origemPosB : p.origemPosA;
      return g !== null && pos !== null ? g : null;
    };
    const vagas: { numero: number; grupoAdversario: number | null }[] = [];
    for (const d of dados.torneio.disputas) {
      const p = d.partida;
      if (!p) continue;
      if (p.origemMelhorA !== null) vagas.push({ numero: p.origemMelhorA, grupoAdversario: adversario(p, "A") });
      if (p.origemMelhorB !== null) vagas.push({ numero: p.origemMelhorB, grupoAdversario: adversario(p, "B") });
    }
    for (const [vaga, equipeId] of distribuirMelhores(qualificados, vagas)) colocados.set(vaga, equipeId);
  }

  for (const d of dados.torneio.disputas) {
    const p = d.partida;
    if (!p) continue;
    const dados2: { equipeAId?: number | null; equipeBId?: number | null } = {};
    if (p.origemMelhorA !== null) {
      const novo = colocados.get(p.origemMelhorA) ?? null;
      if (novo !== p.equipeAId) dados2.equipeAId = novo;
    }
    if (p.origemMelhorB !== null) {
      const novo = colocados.get(p.origemMelhorB) ?? null;
      if (novo !== p.equipeBId) dados2.equipeBId = novo;
    }
    if (p.origemGrupoA !== null && p.origemPosA !== null) {
      const novo = definidas.get(p.origemGrupoA)?.get(p.origemPosA) ?? null;
      if (novo !== p.equipeAId) dados2.equipeAId = novo;
    }
    if (p.origemGrupoB !== null && p.origemPosB !== null) {
      const novo = definidas.get(p.origemGrupoB)?.get(p.origemPosB) ?? null;
      if (novo !== p.equipeBId) dados2.equipeBId = novo;
    }
    if (Object.keys(dados2).length > 0) await tx.partida.update({ where: { disputaId: d.id }, data: dados2 });
  }
}
