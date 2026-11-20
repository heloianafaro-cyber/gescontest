import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { exigirPerfil } from "@/modules/usuarios/sessao";
import { criarAuxiliar, excluirAuxiliar } from "@/modules/delegacoes/auxiliares";
import { FormAuxiliar } from "@/components/form-auxiliar";
import { BotaoConfirmar } from "@/components/botao-confirmar";

export const instant = false;

export default async function Auxiliares() {
  const sessao = await exigirPerfil("TECNICO");

  const chefe = await prisma.usuario.findUnique({
    where: { id: Number(sessao.user.id) },
    include: { delegacao: true },
  });

  if (!chefe?.delegacao) {
    return (
      <main className="space-y-3 p-8">
        <h1 className="text-xl font-semibold">Técnicos e assistentes</h1>
        <p>Sua conta ainda não está ligada a uma delegação. Fale com o coordenador.</p>
        <Link href="/tecnico" className="text-sm underline">Voltar</Link>
      </main>
    );
  }

  const auxiliares = await prisma.auxiliar.findMany({
    where: { delegacaoId: chefe.delegacao.id },
    orderBy: { nome: "asc" },
    include: { _count: { select: { equipes: true } } },
  });

  return (
    <main className="space-y-6 p-8">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Técnicos e assistentes — {chefe.delegacao.nome}</h1>
        <p className="max-w-xl text-sm text-muted-foreground">
          Eles não acessam o sistema. Depois poderão ser indicados como responsáveis pelas equipes.
        </p>
        <Link href="/tecnico" className="text-sm underline">Voltar</Link>
      </div>

      {auxiliares.length === 0 && <p>Nenhum técnico/assistente cadastrado.</p>}
      <ul className="max-w-xl space-y-3">
        {auxiliares.map((a) => (
          <li key={a.id} className="space-y-2 rounded-lg border p-4">
            <p className="font-medium">{a.nome}</p>
            <p className="text-sm text-muted-foreground">
              {a.celular ?? "sem celular"} · {a._count.equipes} equipes
            </p>
            <form action={excluirAuxiliar}>
              <input type="hidden" name="auxiliarId" value={a.id} />
              <BotaoConfirmar mensagem={`Excluir "${a.nome}"?`}>Excluir</BotaoConfirmar>
            </form>
          </li>
        ))}
      </ul>

      <div className="space-y-3">
        <h2 className="font-medium">Novo técnico/assistente</h2>
        <FormAuxiliar acao={criarAuxiliar} />
      </div>
    </main>
  );
}