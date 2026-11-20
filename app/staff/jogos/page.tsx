import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { exigirPerfil } from "@/modules/usuarios/sessao";

export const instant = false;

export default async function JogosEventos() {
  await exigirPerfil("STAFF");

  const eventos = await prisma.evento.findMany({
    orderBy: { dataInicio: "desc" },
    select: {
      id: true,
      nome: true,
      modalidades: { select: { torneios: { select: { _count: { select: { disputas: true } } } } } },
    },
  });
  const comJogos = eventos
    .map((e) => ({
      id: e.id,
      nome: e.nome,
      jogos: e.modalidades.reduce((s, m) => s + m.torneios.reduce((x, t) => x + t._count.disputas, 0), 0),
    }))
    .filter((e) => e.jogos > 0);

  return (
    <main className="space-y-4 p-8">
      <h1 className="text-xl font-semibold">Resultados de jogos e combates</h1>
      <Link href="/staff" className="text-sm underline">Voltar</Link>
      {comJogos.length === 0 && <p>Nenhum evento com jogos gerados.</p>}
      <ul className="max-w-xl space-y-2">
        {comJogos.map((e) => (
          <li key={e.id} className="flex items-center justify-between rounded-lg border p-3">
            <div className="text-sm">
              <p className="font-medium">{e.nome}</p>
              <p className="text-muted-foreground">{e.jogos} jogo(s) e combate(s)</p>
            </div>
            <Link href={`/staff/jogos/${e.id}`} className="text-sm underline">Abrir</Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
