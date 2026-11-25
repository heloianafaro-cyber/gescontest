"use server";

import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { exigirCoordenadorDoEvento } from "@/modules/eventos/acesso";
import { termos } from "./exibicao";
import { rodizio, chaveEliminatoria, jogosDoMisto, expandirSeries, type Lado, type JogoPlano } from "./jogos";
import { potenciaDe2 } from "./sorteio";

// RN172, RN173, RN135: gera os jogos do torneio a partir do sorteio gravado. Os jogos nascem sem horário.
export async function gerarJogos(eventoId: number, modalidadeId: number, torneioId: number) {
  await exigirCoordenadorDoEvento(eventoId);
  const torneio = await prisma.torneio.findFirst({
    where: { id: torneioId, modalidadeId, modalidade: { eventoId } },
    include: { participantes: { orderBy: { posicao: "asc" } }, modalidade: { select: { formatoPlacar: true } } },
  });
  if (!torneio) notFound();
  const tm = termos(torneio.modalidade.formatoPlacar);

  const volta = `/coordenador/eventos/${eventoId}/modalidades/${modalidadeId}/torneios/${torneioId}/jogos`;
  const erro = (msg: string) => redirect(`${volta}?erro=${encodeURIComponent(msg)}`);

  const sistema = torneio.sistemaDisputa;
  const eliminatorio = sistema === "ELIMINATORIO";
  if (sistema !== "RODIZIO" && sistema !== "MISTO" && !eliminatorio) {
    erro(`A geração de ${tm.jogos} deste sistema de disputa ainda não está disponível.`);
  }
  if (!torneio.sorteioEm || torneio.participantes.some((p) => p.posicao === null)) {
    erro(`Faça e confirme o sorteio antes de gerar os ${tm.jogos}.`);
  }
  if (torneio.participantes.length < 2) erro("O torneio precisa de pelo menos 2 participantes.");
  if (eliminatorio && torneio.variante === "REPESCAGEM" && torneio.participantes.length < 4) {
    erro("A repescagem precisa de pelo menos 4 atletas. Use a eliminatória simples ou inclua mais participantes.");
  }

  const iniciados = await prisma.disputa.count({ where: { torneioId, NOT: { status: "AGENDADA" } } });
  if (iniciados > 0) erro(`Já há ${tm.jogos} iniciados ou com resultado neste torneio; não é possível gerar de novo.`);

  let total = 0;

  if (sistema === "RODIZIO") {
    const { confrontos } = rodizio(torneio.participantes.map((p) => p.equipeId), torneio.turnos);
    total = confrontos.length;
    await prisma.$transaction([
      prisma.disputa.deleteMany({ where: { torneioId } }), // gerar de novo substitui os jogos anteriores
      ...confrontos.map((c, i) =>
        prisma.disputa.create({
          data: {
            torneioId,
            rodada: c.rodada,
            numero: i + 1,
            fase: `Rodada ${c.rodada}`,
            duracaoMin: torneio.duracaoJogoMin,
            partida: { create: { equipeAId: c.a, equipeBId: c.b } },
          },
        })
      ),
    ]);
  } else {
    let plano: JogoPlano[];
    if (sistema === "MISTO") {
      // Grupos em rodízio + mata-mata com os classificados (RN179).
      const k = torneio.classificadosPorGrupo ?? 0;
      if (torneio.participantes.some((p) => p.grupo === null)) erro(`Faça o sorteio dos grupos antes de gerar os ${tm.jogos}.`);
      const mapa = new Map<number, number[]>();
      for (const p of torneio.participantes) mapa.set(p.grupo!, [...(mapa.get(p.grupo!) ?? []), p.equipeId]);
      const grupos = [...mapa.entries()].sort((x, y) => x[0] - y[0]).map(([, ids]) => ids);
      if (grupos.length < 2) erro("O sistema misto precisa de pelo menos 2 grupos.");
      if (k < 1 || grupos.some((g) => g.length < k)) {
        erro("Os classificados por grupo precisam ser pelo menos 1 e não maiores que o menor grupo.");
      }
      // RN237: melhores de uma posição entre os grupos (facultativo). A posição vem depois dos classificados diretos.
      const posMelhores = torneio.melhoresPosicao ?? 0;
      const vagasMelhores = torneio.melhoresVagas ?? 0;
      if (posMelhores > 0 || vagasMelhores > 0) {
        const menor = Math.min(...grupos.map((g) => g.length));
        if (posMelhores <= k) erro(`A posição dos melhores (${posMelhores}º) precisa vir depois dos ${k} classificados diretos de cada grupo.`);
        if (posMelhores > menor) erro(`O menor grupo tem ${menor} equipes: não há ${posMelhores}º colocado em todos os grupos.`);
        if (vagasMelhores < 1 || vagasMelhores >= grupos.length) {
          erro(`As vagas dos melhores ${posMelhores}º devem ser de 1 até ${grupos.length - 1} (menos que o número de grupos).`);
        }
      }
      plano = jogosDoMisto(grupos, k, torneio.terceiroLugar, torneio.melhoresPosicao && torneio.melhoresVagas ? vagasMelhores : 0);
    } else {
      // Eliminatória simples: a chave inteira, com as vagas dos jogos seguintes ainda vazias (RN135).
      const tamanho = potenciaDe2(torneio.participantes.length);
      const posicoes: (number | null)[] = new Array(tamanho).fill(null);
      for (const p of torneio.participantes) posicoes[p.posicao! - 1] = p.equipeId;
      plano = chaveEliminatoria(posicoes, torneio.terceiroLugar);
    }
    plano = expandirSeries(plano, torneio.jogosPorSerie, torneio.jogosPorSerieFinal);
    total = plano.length;

    await prisma.$transaction(
      async (tx) => {
        await tx.disputa.deleteMany({ where: { torneioId } });
        const ids: number[] = [];
        const lado = (l: Lado) =>
          "equipeId" in l
            ? { equipeId: l.equipeId, origem: null, grupo: null, pos: null, melhor: null }
            : "jogo" in l
              ? { equipeId: null, origem: ids[l.jogo], grupo: null, pos: null, melhor: null }
              : "melhor" in l
                ? { equipeId: null, origem: null, grupo: null, pos: null, melhor: l.melhor }
                : { equipeId: null, origem: null, grupo: l.grupo, pos: l.pos, melhor: null };
        for (let i = 0; i < plano.length; i++) {
          const j = plano[i];
          const a = lado(j.a);
          const b = lado(j.b);
          const d = await tx.disputa.create({
            data: {
              torneioId,
              rodada: j.rodada,
              numero: i + 1,
              fase: j.fase,
              serie: j.serie ?? null,
              jogoNaSerie: j.jogoNaSerie ?? null,
              duracaoMin: torneio.duracaoJogoMin,
              partida: {
                create: {
                  equipeAId: a.equipeId,
                  equipeBId: b.equipeId,
                  origemAId: a.origem,
                  origemBId: b.origem,
                  origemGrupoA: a.grupo,
                  origemPosA: a.pos,
                  origemGrupoB: b.grupo,
                  origemPosB: b.pos,
                  origemMelhorA: a.melhor,
                  origemMelhorB: b.melhor,
                  origemPerdedor: !!j.perdedores,
                },
              },
            },
          });
          ids.push(d.id);
        }
      },
      { timeout: 60_000, maxWait: 20_000 }
    );
  }

  revalidatePath(volta);
  redirect(`${volta}?ok=${total}`);
}
