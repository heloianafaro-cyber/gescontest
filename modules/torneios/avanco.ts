import { prisma } from "@/lib/prisma";
import { interpretarResultado, type EntradaResultado, type Lado } from "./resultado";
import { planejarVagas } from "./vagas";
import { preencherClassificados } from "./classificacao-db";

// Lógica de servidor do registro de resultados (RN181-RN184). Não é "use server": só é chamada pelas ações.

export type Papel = "COORDENADOR" | "STAFF";
type Tx = Omit<typeof prisma, "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends">;

export const FORMAS_LUTA = [
  { valor: "IPPON", rotulo: "Ippon" },
  { valor: "PONTOS", rotulo: "Pontos" },
  { valor: "FINALIZACAO", rotulo: "Finalização" },
  { valor: "DECISAO", rotulo: "Decisão" },
  { valor: "DESCLASSIFICACAO", rotulo: "Desclassificação" },
];

const COM_RESULTADO = ["ENCERRADA", "WO", "EM_ANDAMENTO", "ANULADA"];

// Volta um jogo a "agendado", sem resultado (usado quando as equipes dele mudam ou ficam sem definição).
async function zerarResultado(tx: Tx, disputaId: number) {
  await tx.partida.update({
    where: { disputaId },
    data: { placarA: null, placarB: null, vencedorId: null, formaVitoria: null, woEquipeId: null, decididoPor: null, penaltisA: null, penaltisB: null },
  });
  await tx.setPartida.deleteMany({ where: { partidaId: disputaId } });
  await tx.disputa.update({ where: { id: disputaId }, data: { status: "AGENDADA", motivoAnulacao: null } });
}

// Recalcula, a partir dos resultados, quem ocupa cada vaga e quais jogos de série ficam cancelados (RN183).
// Um jogo cujas equipes mudam (ou deixam de estar definidas) perde o resultado, porque ele valia para outro confronto (RN223).
export async function sincronizarTorneio(tx: Tx, torneioId: number) {
  // Primeiro os classificados dos grupos (misto); depois o avanço do mata-mata a partir deles.
  await preencherClassificados(tx, torneioId);

  for (let volta = 0; volta < 12; volta++) {
    const lista = await tx.disputa.findMany({ where: { torneioId }, include: { partida: true } });
    let zerou = false;

    // Jogo com resultado, mas sem as duas equipes definidas: resultado órfão (de uma correção anterior).
    for (const d of lista) {
      if (!d.partida || !COM_RESULTADO.includes(d.status as string)) continue;
      if (d.partida.equipeAId === null || d.partida.equipeBId === null) {
        await zerarResultado(tx, d.id);
        zerou = true;
      }
    }
    if (zerou) continue;

    const entrada = lista
      .filter((d) => d.partida)
      .map((d) => ({
        id: d.id,
        serie: d.serie,
        jogoNaSerie: d.jogoNaSerie,
        status: d.status as string,
        equipeAId: d.partida!.equipeAId,
        equipeBId: d.partida!.equipeBId,
        origemAId: d.partida!.origemAId,
        origemBId: d.partida!.origemBId,
        origemPerdedor: d.partida!.origemPerdedor,
        vencedorId: d.partida!.vencedorId,
      }));
    const mudancas = planejarVagas(entrada);
    for (const m of mudancas) {
      const atual = lista.find((d) => d.id === m.id);
      if (!atual?.partida) continue;
      const novaA = "equipeAId" in m ? (m.equipeAId ?? null) : atual.partida.equipeAId;
      const novaB = "equipeBId" in m ? (m.equipeBId ?? null) : atual.partida.equipeBId;
      const trocou = novaA !== atual.partida.equipeAId || novaB !== atual.partida.equipeBId;

      const dados: { equipeAId?: number | null; equipeBId?: number | null } = {};
      if ("equipeAId" in m) dados.equipeAId = m.equipeAId ?? null;
      if ("equipeBId" in m) dados.equipeBId = m.equipeBId ?? null;
      if (Object.keys(dados).length > 0) await tx.partida.update({ where: { disputaId: m.id }, data: dados });

      if (trocou && COM_RESULTADO.includes(atual.status as string)) {
        await zerarResultado(tx, m.id);
        zerou = true;
      }
      if (m.status) await tx.disputa.update({ where: { id: m.id }, data: { status: m.status as never } });
    }
    // Se algum jogo perdeu o resultado, os jogos que dependiam dele precisam ser recalculados.
    if (!zerou) break;
  }
}

// Dados para as telas de registro.
export async function carregarJogo(disputaId: number) {
  return prisma.disputa.findUnique({
    where: { id: disputaId },
    include: {
      partida: {
        include: {
          equipeA: { select: { id: true, nome: true } },
          equipeB: { select: { id: true, nome: true } },
          sets: { orderBy: { numero: "asc" } },
        },
      },
      torneio: { include: { modalidade: true } },
    },
  });
}

const numero = (v: FormDataEntryValue | null) => {
  const t = String(v ?? "").trim();
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : Number.NaN;
};
const lado = (v: FormDataEntryValue | null): Lado | null => (v === "A" || v === "B" ? v : null);

export type Acao = "iniciar" | "encerrar" | "wo" | "anular" | "limpar";

export async function aplicarAcao(disputaId: number, papel: Papel, formData: FormData): Promise<{ erro?: string }> {
  const acao = String(formData.get("acao") ?? "") as Acao;
  if (!["iniciar", "encerrar", "wo", "anular", "limpar"].includes(acao)) return { erro: "Ação inválida." };
  if (acao === "anular" && papel !== "COORDENADOR") return { erro: "Só o coordenador pode anular uma partida." };

  const d = await carregarJogo(disputaId);
  if (!d || !d.partida) return { erro: "Jogo não encontrado." };
  const p = d.partida;
  const t = d.torneio;
  const status = d.status as string;

  if (p.equipeAId === null || p.equipeBId === null) {
    return { erro: "As duas equipes ainda não estão definidas neste jogo." };
  }
  if (status === "CANCELADA") return { erro: "Este jogo foi cancelado porque a série já está decidida." };
  if (status === "ANULADA" && papel !== "COORDENADOR") return { erro: "Partida anulada: só o coordenador pode alterá-la." };

  // RN184: o Staff só corrige enquanto nenhum jogo que dependa deste tiver começado.
  const fechado = status === "ENCERRADA" || status === "WO";
  if (papel === "STAFF" && fechado) {
    const primeiro = d.serie
      ? await prisma.disputa.findFirst({ where: { torneioId: t.id, serie: d.serie }, orderBy: { jogoNaSerie: "asc" } })
      : d;
    const refId = primeiro?.id ?? d.id;
    const dependentes = await prisma.disputa.count({
      where: {
        torneioId: t.id,
        status: { notIn: ["AGENDADA", "CANCELADA"] },
        partida: { OR: [{ origemAId: refId }, { origemBId: refId }] },
      },
    });
    // Na série de play-off, os jogos seguintes da mesma série também dependem deste resultado.
    const seguintesNaSerie = d.serie
      ? await prisma.disputa.count({
          where: {
            torneioId: t.id,
            serie: d.serie,
            jogoNaSerie: { gt: d.jogoNaSerie ?? 0 },
            status: { notIn: ["AGENDADA", "CANCELADA"] },
          },
        })
      : 0;
    if (dependentes + seguintesNaSerie > 0) {
      return { erro: "Um jogo seguinte já começou; só o coordenador pode corrigir este resultado." };
    }
  }

  // ---- limpar resultado: o jogo volta a "agendado" (lançado por engano, jogo remarcado etc.) ----
  if (acao === "limpar") {
    if (status === "AGENDADA") return { erro: "Este jogo não tem resultado para limpar." };
    await prisma.$transaction(async (tx) => {
      await tx.partida.update({
        where: { disputaId: d.id },
        data: {
          placarA: null,
          placarB: null,
          vencedorId: null,
          formaVitoria: null,
          woEquipeId: null,
          decididoPor: null,
          penaltisA: null,
          penaltisB: null,
        },
      });
      await tx.setPartida.deleteMany({ where: { partidaId: d.id } });
      await tx.disputa.update({ where: { id: d.id }, data: { status: "AGENDADA", motivoAnulacao: null } });
      await sincronizarTorneio(tx, t.id);
    });
    return {};
  }

  // ---- iniciar ----
  if (acao === "iniciar") {
    if (status !== "AGENDADA") return { erro: "Só é possível iniciar um jogo agendado." };
    await prisma.disputa.update({ where: { id: d.id }, data: { status: "EM_ANDAMENTO" } });
    return {};
  }

  // ---- anular (RN184) ----
  if (acao === "anular") {
    const motivo = String(formData.get("motivo") ?? "").trim();
    if (motivo.length < 5) return { erro: "Informe o motivo da anulação." };
    await prisma.$transaction(async (tx) => {
      await tx.disputa.update({ where: { id: d.id }, data: { status: "ANULADA", motivoAnulacao: motivo } });
      await tx.partida.update({
        where: { disputaId: d.id },
        data: { vencedorId: null, woEquipeId: null, decididoPor: null, penaltisA: null, penaltisB: null },
      });
      await sincronizarTorneio(tx, t.id);
    });
    return {};
  }

  // ---- encerrar / W.O. ----
  const sets: { a: number; b: number }[] = [];
  for (let i = 1; i <= 7; i++) {
    const a = numero(formData.get(`set${i}A`));
    const b = numero(formData.get(`set${i}B`));
    if (a === null && b === null) continue;
    sets.push({ a: a ?? Number.NaN, b: b ?? Number.NaN });
  }
  const mataMata = t.sistemaDisputa === "ELIMINATORIO" || (t.sistemaDisputa === "MISTO" && !(d.fase ?? "").startsWith("Grupo"));
  const entrada: EntradaResultado = {
    formato: t.modalidade.formatoPlacar,
    mataMata,
    acao,
    setsParaVencer: t.setsParaVencer,
    desempate: t.modalidade.desempateMataMata,
    woPlacarVencedor: t.woPlacarVencedor,
    woPlacarPerdedor: t.woPlacarPerdedor,
    placarA: numero(formData.get("placarA")),
    placarB: numero(formData.get("placarB")),
    sets,
    prorrogacao: formData.get("prorrogacao") === "on",
    vencedorDesempate: lado(formData.get("vencedorDesempate")),
    penaltisA: numero(formData.get("penaltisA")),
    penaltisB: numero(formData.get("penaltisB")),
    vencedorLuta: lado(formData.get("vencedorLuta")),
    forma: String(formData.get("forma") ?? "") || null,
    woLado: lado(formData.get("woLado")),
  };
  const r = interpretarResultado(entrada);
  if ("erro" in r) return { erro: r.erro };
  const v = r.resultado;
  const idLado = (l: Lado | null) => (l === "A" ? p.equipeAId : l === "B" ? p.equipeBId : null);

  await prisma.$transaction(async (tx) => {
    await tx.partida.update({
      where: { disputaId: d.id },
      data: {
        placarA: v.placarA,
        placarB: v.placarB,
        vencedorId: idLado(v.vencedor),
        formaVitoria: (v.forma as never) ?? null,
        woEquipeId: idLado(v.woLado),
        decididoPor: v.decididoPor,
        penaltisA: v.penaltisA,
        penaltisB: v.penaltisB,
      },
    });
    await tx.setPartida.deleteMany({ where: { partidaId: d.id } });
    if (v.sets.length > 0) {
      await tx.setPartida.createMany({
        data: v.sets.map((s, i) => ({ partidaId: d.id, numero: i + 1, pontosA: s.a, pontosB: s.b })),
      });
    }
    await tx.disputa.update({
      where: { id: d.id },
      data: { status: acao === "wo" ? "WO" : "ENCERRADA", motivoAnulacao: null },
    });
    await sincronizarTorneio(tx, t.id);
  });
  return {};
}
