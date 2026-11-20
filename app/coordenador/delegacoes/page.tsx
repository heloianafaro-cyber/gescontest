import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { exigirPerfil } from "@/modules/usuarios/sessao";
import { criarDelegacao, renomearDelegacao, excluirDelegacao } from "@/modules/delegacoes/acoes";
import { FormDelegacao } from "@/components/form-delegacao";
import { BotaoConfirmar } from "@/components/botao-confirmar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const instant = false;

export default async function Delegacoes() {
  await exigirPerfil("PROF");

  const delegacoes = await prisma.delegacao.findMany({
    orderBy: { nome: "asc" },
    include: { _count: { select: { membros: true, equipes: true, auxiliares: true } } },
  });

  return (
    <main className="space-y-6 p-8">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Delegações</h1>
        <Link href="/coordenador" className="text-sm underline">Voltar</Link>
      </div>

      {delegacoes.length === 0 && <p>Nenhuma delegação cadastrada.</p>}

      <ul className="max-w-xl space-y-3">
        {delegacoes.map((d) => {
          const emUso = d._count.membros + d._count.equipes + d._count.auxiliares > 0;
          return (
            <li key={d.id} className="space-y-2 rounded-lg border p-4">
              <form action={renomearDelegacao} className="flex gap-2">
                <input type="hidden" name="delegacaoId" value={d.id} />
                <Input name="nome" defaultValue={d.nome} required />
                <Button type="submit" variant="outline">Renomear</Button>
              </form>
              <p className="text-sm text-muted-foreground">
                {d._count.membros} membros · {d._count.equipes} equipes · {d._count.auxiliares} auxiliares
              </p>
              {emUso ? (
                <p className="text-xs text-muted-foreground">Em uso: não pode ser excluída.</p>
              ) : (
                <form action={excluirDelegacao}>
                  <input type="hidden" name="delegacaoId" value={d.id} />
                  <BotaoConfirmar mensagem={`Excluir a delegação "${d.nome}"?`}>Excluir</BotaoConfirmar>
                </form>
              )}
            </li>
          );
        })}
      </ul>

      <div className="space-y-3">
        <h2 className="font-medium">Nova delegação</h2>
        <FormDelegacao acao={criarDelegacao} />
      </div>
    </main>
  );
}