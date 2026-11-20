import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { exigirPerfil } from "@/modules/usuarios/sessao";
import { FormDelegacaoAtleta } from "@/components/form-delegacao-atleta";

export const instant = false;

export default async function MinhaDelegacao() {
  const sessao = await exigirPerfil("ATLETA");

  const [atleta, delegacoes] = await Promise.all([
    prisma.usuario.findUnique({
      where: { id: Number(sessao.user.id) },
      select: { delegacaoId: true },
    }),
    prisma.delegacao.findMany({ orderBy: { nome: "asc" }, select: { id: true, nome: true } }),
  ]);

  return (
    <main className="space-y-4 p-8">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Minha delegação</h1>
        <Link href="/atleta" className="text-sm underline">Voltar</Link>
      </div>
      {delegacoes.length === 0 ? (
        <p>Ainda não há delegações cadastradas. Fale com o coordenador.</p>
      ) : (
        <FormDelegacaoAtleta delegacoes={delegacoes} atualId={atleta?.delegacaoId ?? null} />
      )}
    </main>
  );
}