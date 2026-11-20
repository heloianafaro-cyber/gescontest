import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { exigirPerfil } from "@/modules/usuarios/sessao";
import { situacaoInscricao } from "@/modules/eventos/inscricoes";

export const instant = false;

export default async function EventosDoChefe() {
  await exigirPerfil("TECNICO");

  const eventos = await prisma.evento.findMany({ orderBy: { dataInicio: "desc" } });

  return (
    <main className="space-y-6 p-8">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Equipes — escolha o evento</h1>
        <Link href="/tecnico" className="text-sm underline">Voltar</Link>
      </div>

      {eventos.length === 0 && <p>Nenhum evento cadastrado.</p>}
      <ul className="max-w-xl space-y-3">
        {eventos.map((e) => {
          const s = situacaoInscricao(e);
          return (
            <li key={e.id} className="space-y-1 rounded-lg border p-4">
              <p className="font-medium">{e.nome}</p>
              <p className="text-sm text-muted-foreground">
                {s.aberta ? "Inscrições abertas" : s.motivo}
              </p>
              <Link href={`/tecnico/equipes/${e.id}`} className="text-sm underline">
                Abrir equipes deste evento
              </Link>
            </li>
          );
        })}
      </ul>
    </main>
  );
}