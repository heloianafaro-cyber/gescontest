import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const instant = false;

// Página pública: qualquer pessoa escolhe um evento e leva os jogos para a própria agenda.
export default async function AgendaPublica() {
  const eventos = await prisma.evento.findMany({
    orderBy: { dataInicio: "desc" },
    select: { id: true, nome: true, dataInicio: true, dataFim: true },
  });
  const formatar = (d: Date) => d.toLocaleDateString("pt-BR", { timeZone: "UTC" });

  return (
    <main className="space-y-4 p-8">
      <h1 className="text-xl font-semibold">Agenda de jogos</h1>
      <p className="max-w-2xl text-sm text-muted-foreground">
        Escolha um evento para levar os jogos para o Google Agenda, o Outlook ou a agenda do celular.
      </p>
      <Link href="/" className="text-sm underline">Início</Link>
      {eventos.length === 0 && <p>Nenhum evento cadastrado.</p>}
      <ul className="max-w-xl space-y-2">
        {eventos.map((e) => (
          <li key={e.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
            <div className="text-sm">
              <p className="font-medium">{e.nome}</p>
              <p className="text-muted-foreground">{formatar(e.dataInicio)} a {formatar(e.dataFim)}</p>
            </div>
            <Link href={`/agenda/${e.id}`} className="text-sm underline">Abrir</Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
