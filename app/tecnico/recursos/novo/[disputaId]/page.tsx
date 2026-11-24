import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { exigirPerfil } from "@/modules/usuarios/sessao";
import { abrirRecurso } from "@/modules/recursos/acoes";
import { equipesDoJogo, rotuloDoJogo, selecaoDoJogo } from "@/modules/recursos/consultas-db";
import { prazoEncerrado } from "@/modules/recursos/regras";
import { FormRecursoJogo } from "@/components/form-recurso-jogo";

export const instant = false;

export default async function NovoRecurso({ params }: { params: Promise<{ disputaId: string }> }) {
  const sessao = await exigirPerfil("TECNICO");
  const disputaId = Number((await params).disputaId);
  if (!Number.isInteger(disputaId)) notFound();

  const [eu, jogo] = await Promise.all([
    prisma.usuario.findUnique({ where: { id: Number(sessao.user.id) }, select: { delegacaoId: true } }),
    prisma.disputa.findUnique({ where: { id: disputaId }, select: selecaoDoJogo }),
  ]);
  if (!eu?.delegacaoId || !jogo) notFound();

  const minha = (await equipesDoJogo(disputaId)).find((e) => e.delegacaoId === eu.delegacaoId);
  if (!minha) notFound();

  const horas = jogo.torneio.modalidade.evento.recursoPartidaHoras;
  const encerrado = prazoEncerrado({ horas, resultadoEm: jogo.resultadoEm, status: jogo.status });
  const jaAbriu = await prisma.recursoDisputa.findUnique({
    where: { disputaId_equipeId: { disputaId, equipeId: minha.id } },
    select: { id: true },
  });

  return (
    <main className="space-y-6 p-8">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Abrir recurso</h1>
        <p className="text-sm">
          {jogo.torneio.modalidade.evento.nome} · {jogo.torneio.modalidade.nome} · {jogo.torneio.nome}
        </p>
        <p className="text-sm font-medium">{rotuloDoJogo(jogo)}</p>
        <Link href="/tecnico/recursos" className="text-sm underline">Voltar</Link>
      </div>
      {jaAbriu ? (
        <p className="text-sm text-amber-700">Sua equipe já abriu recurso neste jogo. Acompanhe na lista de recursos.</p>
      ) : encerrado ? (
        <p className="text-sm text-amber-700">O prazo para recurso deste jogo já terminou.</p>
      ) : (
        <>
          {horas != null && (
            <p className="text-xs text-muted-foreground">Prazo: {horas} hora(s) depois do registro do resultado.</p>
          )}
          <FormRecursoJogo acao={abrirRecurso.bind(null, disputaId)} />
        </>
      )}
    </main>
  );
}
