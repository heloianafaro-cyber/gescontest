import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { exigirPerfil } from "@/modules/usuarios/sessao";

export const instant = false;

export default async function ListasEventos() {
  await exigirPerfil("STAFF");
  const eventos = await prisma.evento.findMany({
    orderBy: { dataInicio: "desc" },
    select: { id: true, nome: true },
  });

  return (
    <main className="space-y-4 p-8">
      <h1 className="text-xl font-semibold">Listas de atletas por torneio</h1>
      <Link href="/staff" className="text-sm underline">Voltar</Link>
      {eventos.length === 0 && <p>Nenhum evento cadastrado.</p>}
      <ul className="max-w-xl space-y-2">
        {eventos.map((e) => (
          <li key={e.id} className="flex items-center justify-between rounded-lg border p-3">
            <p className="text-sm font-medium">{e.nome}</p>
            <Link href={`/staff/listas/${e.id}`} className="text-sm underline">Abrir</Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
