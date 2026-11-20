import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { exigirPerfil } from "@/modules/usuarios/sessao";

export const instant = false;

export default async function PesagemEventos() {
  await exigirPerfil("STAFF");

  const eventos = await prisma.evento.findMany({
    orderBy: { dataInicio: "desc" },
    include: {
      modalidades: {
        where: { formatoPlacar: "LUTA", tipo: "INDIVIDUAL" },
        select: { id: true, _count: { select: { equipes: true } } },
      },
    },
  });
  const comLutas = eventos.filter((e) => e.modalidades.length > 0);

  return (
    <main className="space-y-4 p-8">
      <h1 className="text-xl font-semibold">Pesagem</h1>
      <Link href="/staff" className="text-sm underline">Voltar</Link>

      {comLutas.length === 0 && <p>Nenhum evento com lutas individuais.</p>}
      <ul className="max-w-xl space-y-2">
        {comLutas.map((e) => {
          const inscritos = e.modalidades.reduce((soma, m) => soma + m._count.equipes, 0);
          return (
            <li key={e.id} className="flex items-center justify-between rounded-lg border p-3">
              <div className="text-sm">
                <p className="font-medium">{e.nome}</p>
                <p className="text-muted-foreground">{inscritos} atleta(s) inscrito(s) em lutas</p>
              </div>
              <Link href={`/staff/pesagem/${e.id}`} className="text-sm underline">Abrir pesagem</Link>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
