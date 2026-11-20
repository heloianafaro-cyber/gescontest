import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { exigirPerfil } from "@/modules/usuarios/sessao";
import { FormIncluirAtleta } from "@/components/form-incluir-atleta";

export const instant = false;

const rotuloFicha = { PENDENTE: "ficha pendente", APROVADA: "ficha aprovada", RECUSADA: "ficha recusada" } as const;

export default async function AtletasDaDelegacao() {
  const sessao = await exigirPerfil("TECNICO");

  const chefe = await prisma.usuario.findUnique({
    where: { id: Number(sessao.user.id) },
    select: { delegacaoId: true, delegacao: true },
  });
  if (!chefe?.delegacaoId) {
    return (
      <main className="space-y-3 p-8">
        <h1 className="text-xl font-semibold">Atletas</h1>
        <p>Sua conta ainda não está ligada a uma delegação. Fale com o coordenador.</p>
        <Link href="/tecnico" className="text-sm underline">Voltar</Link>
      </main>
    );
  }

  const atletas = await prisma.usuario.findMany({
    where: { tipo: "ATLETA", delegacaoId: chefe.delegacaoId },
    orderBy: { nome: "asc" },
    select: { id: true, nome: true, matricula: true, fichaStatus: true },
  });

  const contagens = await prisma.equipeAtleta.groupBy({
    by: ["atletaId"],
    where: { atletaId: { in: atletas.map((a) => a.id) } },
    _count: { _all: true },
  });
  const inscricoes = new Map(contagens.map((c) => [c.atletaId, c._count._all]));

  return (
    <main className="space-y-6 p-8">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Atletas — {chefe.delegacao?.nome}</h1>
        <Link href="/tecnico" className="text-sm underline">Voltar</Link>
      </div>

      {atletas.length === 0 && <p>Nenhum atleta na delegação ainda.</p>}
      <ul className="max-w-xl space-y-3">
        {atletas.map((a) => (
          <li key={a.id} className="space-y-1 rounded-lg border p-4">
            <p className="font-medium">{a.nome}</p>
            <p className="text-sm text-muted-foreground">
              Matrícula {a.matricula ?? "—"}
              {a.fichaStatus ? ` · ${rotuloFicha[a.fichaStatus]}` : ""} · {inscricoes.get(a.id) ?? 0} inscrições
            </p>
            <Link href={`/tecnico/atletas/${a.id}`} className="text-sm underline">
              Ver e alterar inscrições
            </Link>
          </li>
        ))}
      </ul>

      <div className="space-y-3">
        <h2 className="font-medium">Incluir atleta na delegação</h2>
        <FormIncluirAtleta />
      </div>
    </main>
  );
}