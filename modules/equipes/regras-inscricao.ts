import { prisma } from "@/lib/prisma";
import { situacaoInscricao } from "@/modules/eventos/inscricoes";
import { atribuirCategoria } from "./categoria";
import { avisarSeAbaixoDoMinimo } from "@/modules/eventos/minimos";

type Alvo = { modalidadeId: number } | { equipeId: number };

type Pedido = {
  atletaId: number;
  quemId: number; // quem está inscrevendo (chefe ou o próprio atleta)
  alvo: Alvo; // modalidade individual OU equipe de modalidade coletiva
  pesoKg?: number | null;
  naipe?: string | null; // prova individual: MASCULINO ou FEMININO (RN161)
  faixa?: string | null; // lutas que categorizam por faixa (RN161)
  delegacaoDoChefe?: number; // quando é o chefe quem inscreve: o atleta precisa ser dessa delegação
};

// "bloqueio" indica os casos em que o chefe deve ser avisado quando o próprio atleta tenta se inscrever.
export type ResultadoInscricao = { erro: string; bloqueio?: "IDADE" | "LIMITE" };

// RN104-106, RN100-103, RN148, RN149, RN151, RN161. Devolve { erro: "" } quando deu certo.
export async function inscreverAtleta(p: Pedido): Promise<ResultadoInscricao> {
  const atleta = await prisma.usuario.findUnique({
    where: { id: p.atletaId },
    select: { id: true, tipo: true, nome: true, delegacaoId: true, dataNascimento: true, fichaStatus: true },
  });
  if (!atleta || atleta.tipo !== "ATLETA") return { erro: "Atleta não encontrado." };
  if (!atleta.delegacaoId) return { erro: "O atleta ainda não tem delegação." };
  if (p.delegacaoDoChefe !== undefined && atleta.delegacaoId !== p.delegacaoDoChefe) {
    return { erro: "Este atleta não é da sua delegação." };
  }
  // Ficha recusada = cadastro inválido: bloqueia a inclusão em equipes.
  if (atleta.fichaStatus === "RECUSADA") {
    return { erro: "Cadastro inválido: a ficha de autorização foi recusada. O atleta precisa enviar outra ficha." };
  }

  // Descobre a modalidade (e a equipe, se for coletiva).
  let equipeId: number | null = null;
  let modalidade;
  if ("equipeId" in p.alvo) {
    const equipe = await prisma.equipe.findUnique({
      where: { id: p.alvo.equipeId },
      include: { modalidade: { include: { evento: true, mae: true } } },
    });
    if (!equipe) return { erro: "Equipe não encontrada." };
    if (equipe.delegacaoId !== atleta.delegacaoId) return { erro: "Esta equipe é de outra delegação." };
    equipeId = equipe.id;
    modalidade = equipe.modalidade;
  } else {
    const m = await prisma.modalidade.findUnique({
      where: { id: p.alvo.modalidadeId },
      include: { evento: true, mae: true },
    });
    if (!m) return { erro: "Modalidade não encontrada." };
    if (m.tipo !== "INDIVIDUAL") return { erro: "Em modalidade coletiva, escolha uma equipe." };
    modalidade = m;
  }
  const evento = modalidade.evento;

  // RN198/RN203: atleta com inscrição indeferida ou bloqueado no evento não se inscreve de novo.
  const barrado = await prisma.impugnacao.findFirst({
    where: { eventoId: evento.id, atletaId: atleta.id, status: "INDEFERIDO" },
    select: { id: true },
  });
  if (barrado) {
    return { erro: "Este atleta teve a inscrição indeferida ou foi bloqueado neste evento. Fale com o coordenador." };
  }

  // RN151: prazo.
  const prazo = situacaoInscricao(evento);
  if (!prazo.aberta) return { erro: prazo.motivo };

  // Idade: conta só o ano de nascimento.
  if (evento.idadeLimite != null && atleta.dataNascimento) {
    const idade = evento.dataInicio.getUTCFullYear() - atleta.dataNascimento.getUTCFullYear();
    if (idade > evento.idadeLimite) {
      return {
        erro: `Atleta acima da idade limite do evento (${evento.idadeLimite} anos, contados pelo ano de nascimento).`,
        bloqueio: "IDADE",
      };
    }
  }

  // Só uma equipe por modalidade.
  const jaNaModalidade = await prisma.equipeAtleta.findFirst({
    where: { atletaId: atleta.id, modalidadeId: modalidade.id },
  });
  if (jaNaModalidade) return { erro: "O atleta já está inscrito nesta modalidade." };

  // RN104-106 e RN156: os limites contam por modalidade-mãe (prova avulsa conta por conta própria),
  // e o tipo da contagem é o da modalidade-mãe, quando existe.
  const atuais = await prisma.equipeAtleta.findMany({
    where: { atletaId: atleta.id, equipe: { modalidade: { eventoId: evento.id } } },
    select: {
      equipe: {
        select: {
          modalidade: { select: { id: true, tipo: true, maeId: true, mae: { select: { tipo: true } } } },
        },
      },
    },
  });
  const chave = (m: { id: number; maeId: number | null }) => (m.maeId ? `mae-${m.maeId}` : `prova-${m.id}`);
  const tipoDaContagem = (m: { tipo: string; mae: { tipo: string } | null }) => m.mae?.tipo ?? m.tipo;

  const grupos = new Map<string, string>(); // chave -> tipo usado na contagem
  for (const a of atuais) grupos.set(chave(a.equipe.modalidade), tipoDaContagem(a.equipe.modalidade));

  const novaChave = chave(modalidade);
  const novoTipo = tipoDaContagem(modalidade);
  // Se o atleta já está em outra prova da mesma modalidade, a nova prova não conta de novo.
  if (!grupos.has(novaChave)) {
    const total = grupos.size;
    const individuais = [...grupos.values()].filter((t) => t === "INDIVIDUAL").length;
    const coletivas = total - individuais;
    if (evento.maxModTotal != null && total + 1 > evento.maxModTotal) {
      return { erro: `Limite do evento: no máximo ${evento.maxModTotal} modalidades por atleta.`, bloqueio: "LIMITE" };
    }
    if (novoTipo === "INDIVIDUAL" && evento.maxModInd != null && individuais + 1 > evento.maxModInd) {
      return { erro: `Limite do evento: no máximo ${evento.maxModInd} modalidades individuais por atleta.`, bloqueio: "LIMITE" };
    }
    if (novoTipo === "COLETIVA" && evento.maxModCol != null && coletivas + 1 > evento.maxModCol) {
      return { erro: `Limite do evento: no máximo ${evento.maxModCol} modalidades coletivas por atleta.`, bloqueio: "LIMITE" };
    }
  }

  const luta = modalidade.formatoPlacar === "LUTA";

  // RN149: lutas categorizadas por peso exigem o peso informado na inscrição.
  let pesoKg: number | null = null;
  if (luta && modalidade.catPeso) {
    if (!p.pesoKg || p.pesoKg <= 0) return { erro: "Informe o peso do atleta (kg) para esta modalidade de luta." };
    pesoKg = p.pesoKg;
  }

  // RN161: naipe (provas individuais) e faixa (lutas que categorizam por faixa).
  let naipe: "MASCULINO" | "FEMININO" | null = null;
  if (!equipeId) {
    if (p.naipe !== "MASCULINO" && p.naipe !== "FEMININO") return { erro: "Informe o naipe (masculino ou feminino)." };
    naipe = p.naipe;
  }
  let faixa: string | null = null;
  if (luta && modalidade.catFaixa) {
    if (!p.faixa || !modalidade.faixas.includes(p.faixa)) return { erro: "Escolha a cor da faixa do atleta." };
    faixa = p.faixa;
  }

  // Vaga na equipe.
  if (equipeId) {
    const ocupadas = await prisma.equipeAtleta.count({ where: { equipeId } });
    if (ocupadas >= modalidade.maxAtletas) return { erro: "A equipe já está completa." };
  }

  // RN148: modalidade individual cria a equipe de 1 atleta sozinha.
  if (!equipeId) {
    const nova = await prisma.$transaction(async (tx) => {
      const equipe = await tx.equipe.create({
        data: {
          nome: atleta.nome,
          naipe: naipe!,
          modalidadeId: modalidade.id,
          delegacaoId: atleta.delegacaoId!,
          criadorId: p.quemId,
        },
      });
      await tx.equipeAtleta.create({
        data: { atletaId: atleta.id, equipeId: equipe.id, modalidadeId: modalidade.id, pesoKg, faixa },
      });
      return equipe;
    });
    // RN157: coloca o atleta na categoria que combina com naipe/peso/idade/faixa (se houver uma só).
    await atribuirCategoria(nova.id);
  } else {
    await prisma.equipeAtleta.create({
      data: { atletaId: atleta.id, equipeId, modalidadeId: modalidade.id, pesoKg, faixa },
    });
  }
}

// Cancela a inscrição do atleta em uma equipe/modalidade. Em prova individual, a equipe de 1 some junto.
export async function cancelarInscricaoAtleta(p: {
  atletaId: number;
  equipeId: number;
  delegacaoDoChefe?: number;
}): Promise<{ erro: string }> {
  const vinculo = await prisma.equipeAtleta.findUnique({
    where: { atletaId_equipeId: { atletaId: p.atletaId, equipeId: p.equipeId } },
    include: {
      equipe: {
        include: {
          modalidade: { include: { evento: true } },
          _count: { select: { partidasA: true, partidasB: true } },
        },
      },
    },
  });
  if (!vinculo) return { erro: "Inscrição não encontrada." };
  const { equipe } = vinculo;

  if (p.delegacaoDoChefe !== undefined && equipe.delegacaoId !== p.delegacaoDoChefe) {
    return { erro: "Esta inscrição é de outra delegação." };
  }
  const prazo = situacaoInscricao(equipe.modalidade.evento);
  if (!prazo.aberta) return { erro: prazo.motivo };
  if (equipe._count.partidasA + equipe._count.partidasB > 0) {
    return { erro: "A equipe já tem jogos marcados; fale com o coordenador." };
  }

    if (equipe.modalidade.tipo === "INDIVIDUAL") {
    await prisma.equipe.delete({ where: { id: equipe.id } }); // apaga junto o vínculo (cascata)
  } else {
    await prisma.equipeAtleta.delete({
      where: { atletaId_equipeId: { atletaId: p.atletaId, equipeId: p.equipeId } },
    });
    await avisarSeAbaixoDoMinimo(p.equipeId);
  }
  return { erro: "" };
}
