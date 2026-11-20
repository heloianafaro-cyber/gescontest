import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { exigirPerfil } from "@/modules/usuarios/sessao";
import { Button } from "@/components/ui/button";

export const instant = false;

const formatar = (d: Date) => d.toLocaleDateString("pt-BR", { timeZone: "UTC" });
const limite = (n: number | null) => (n === null ? "sem limite" : String(n));

export default async function Eventos() {
  const sessao = await exigirPerfil("PROF");
  const eventos = await prisma.evento.findMany({
    where: { coordenadores: { some: { usuarioId: Number(sessao.user.id) } } },
    orderBy: { dataInicio: "desc" },
  });

  return (
    <main className="space-y-4 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Eventos</h1>
        <Button render={<Link href="/coordenador/eventos/novo" />}>Novo evento</Button>
      </div>

      {eventos.length === 0 && <p>Nenhum evento cadastrado.</p>}

      <ul className="space-y-3">
        {eventos.map((e) => (
          <li key={e.id} className="rounded-lg border p-4">
            <p className="font-medium">{e.nome}</p>
            <p className="text-sm">
              {formatar(e.dataInicio)} a {formatar(e.dataFim)}
            </p>
            <p className="text-sm">
              Idade limite: {limite(e.idadeLimite)} · Total: {limite(e.maxModTotal)} · Individuais:{" "}
              {limite(e.maxModInd)} · Coletivas: {limite(e.maxModCol)}
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              <Link href={`/coordenador/eventos/${e.id}/editar`} className="text-sm underline">
                Editar ou excluir
              </Link>
              <Link href={`/coordenador/eventos/${e.id}/regulamentos`} className="text-sm underline">
                Regulamentos
              </Link>
              <Link href={`/coordenador/eventos/${e.id}/conferencia`} className="text-sm underline">
                Conferência
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
