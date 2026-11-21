import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { carregarListaDelegacao, delegacaoDoChefe } from "@/modules/eventos/lista-delegacao";
import { contarAvisos } from "@/modules/eventos/lista-delegacao-csv";

export const instant = false;

export default async function ListasDaDelegacao() {
  const delegacao = await delegacaoDoChefe();
  if (!delegacao) {
    return (
      <main className="space-y-4 p-8">
        <h1 className="text-xl font-semibold">Listas da delegação</h1>
        <p>Sua conta ainda não está ligada a uma delegação.</p>
      </main>
    );
  }

  const eventos = await prisma.evento.findMany({ orderBy: { dataInicio: "desc" }, select: { id: true, nome: true } });
  const itens = await Promise.all(
    eventos.map(async (e) => {
      const l = await carregarListaDelegacao(e.id, delegacao);
      return { ...e, avisos: l ? contarAvisos(l) : 0 };
    })
  );

  return (
    <main className="space-y-4 p-8">
      <h1 className="text-xl font-semibold">Listas da delegação</h1>
      <p className="text-sm text-muted-foreground">Delegação: {delegacao.nome}</p>
      <Link href="/tecnico" className="text-sm underline">Voltar</Link>
      {itens.length === 0 && <p>Nenhum evento cadastrado.</p>}
      <ul className="max-w-xl space-y-2">
        {itens.map((e) => (
          <li key={e.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
            <div className="text-sm">
              <p className="font-medium">{e.nome}</p>
              {e.avisos > 0 && (
                <p className="font-medium text-amber-700">
                  ⚠ {e.avisos} equipe(s) não atingiram o mínimo de inscritos
                </p>
              )}
            </div>
            <Link href={`/tecnico/listas/${e.id}`} className="text-sm underline">Abrir</Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
