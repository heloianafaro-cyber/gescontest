import { prisma } from "@/lib/prisma";
import { categoriaDoAviso } from "./importancia";
import { emailConfigurado, enviarEmail } from "./enviar";

// Margem de segurança sobre os 100 e-mails por dia do plano gratuito do Resend (dia em UTC).
const LIMITE_DIARIO = 90;

type Aviso = { notificacaoId: number; usuarioId: number; mensagem: string };

function inicioDoDiaUtc() {
  const agora = new Date();
  return new Date(Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), agora.getUTCDate()));
}

// RN247-RN250: e-mail curto, com a categoria e o link para o sistema. Nunca leva CPF, dados bancários,
// peso, nomes de atletas nem o texto do aviso: os detalhes exigem login.
export function montarEmail(categoria: string) {
  const base = (process.env.BETTER_AUTH_URL ?? "").replace(/\/$/, "");
  const link = base ? `${base}/notificacoes` : "o sistema GesContest";
  return {
    assunto: `GesContest: aviso importante (${categoria})`,
    texto: [
      "Olá!",
      "",
      `Você tem um aviso novo no GesContest sobre: ${categoria}.`,
      "",
      `Para ver os detalhes, entre no sistema: ${link}`,
      "",
      "Este é um aviso automático. Por segurança, o e-mail não traz os detalhes.",
    ].join("\n"),
  };
}

// forcar: true envia mesmo sem casar com as regras; false não envia; undefined decide pela regra.
export async function enviarAvisosPorEmail(avisos: Aviso[], forcar?: boolean) {
  if (!emailConfigurado() || forcar === false) return;

  const candidatos = avisos
    .map((a) => ({ ...a, categoria: categoriaDoAviso(a.mensagem) ?? (forcar ? "Aviso do sistema" : null) }))
    .filter((a): a is Aviso & { categoria: string } => a.categoria !== null);
  if (candidatos.length === 0) return;

  const enviadosHoje = await prisma.notificacao.count({
    where: { emailEnviado: true, dataHora: { gte: inicioDoDiaUtc() } },
  });
  const folga = Math.max(0, LIMITE_DIARIO - enviadosHoje);
  if (folga === 0) {
    console.warn("[email] limite diário atingido; os avisos ficam só no sistema.");
    return;
  }

  const usuarios = await prisma.usuario.findMany({
    where: { id: { in: candidatos.map((c) => c.usuarioId) }, ativo: true },
    select: { id: true, email: true },
  });
  const emailDe = new Map(usuarios.map((u) => [u.id, u.email]));

  const fila = candidatos.filter((c) => emailDe.has(c.usuarioId)).slice(0, folga);
  const enviados: number[] = [];

  for (let i = 0; i < fila.length; i += 5) {
    const lote = fila.slice(i, i + 5);
    const resultados = await Promise.all(
      lote.map(async (c) => {
        const { assunto, texto } = montarEmail(c.categoria);
        const r = await enviarEmail({ para: emailDe.get(c.usuarioId)!, assunto, texto });
        if (!r.ok) console.error("[email]", r.erro);
        return r.ok ? c.notificacaoId : null;
      })
    );
    for (const id of resultados) if (id !== null) enviados.push(id);
  }

  if (enviados.length > 0) {
    await prisma.notificacao.updateMany({ where: { id: { in: enviados } }, data: { emailEnviado: true } });
  }
}
