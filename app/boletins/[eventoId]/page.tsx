import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

export const instant = false;

// RN220: só boletins publicados pelo coordenador.
export default async function BoletinsPublicos({ params }: { params: Promise<{ eventoId: string }> }) {
  const eventoId = Number((await params).eventoId);
  if (!Number.isInteger(eventoId)) notFound();
  const evento = await prisma.evento.findUnique({
    where: { id: eventoId },
    select: {
      nome: true,
      boletins: {
        where: { status: "PUBLICADO" },
        orderBy: [{ dia: "desc" }, { id: "desc" }],
        select: { id: true, nome: true, tipo: true, dataPublicacao: true },
      },
    },
  });
  if (!evento) notFound();

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6 sm:p-8">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold">Boletins — {evento.nome}</h1>
        <div className="flex gap-4 text-sm">
          <Link href="/" className="underline">Início</Link>
          <Link href={`/jogos/${eventoId}`} className="underline">Jogos e resultados</Link>
        </div>
      </header>
      {evento.boletins.length === 0 && <p className="text-sm">Nenhum boletim publicado ainda.</p>}
      <ul className="space-y-2 text-sm">
        {evento.boletins.map((b) => (
          <li key={b.id}>
            <Link href={`/boletins/${eventoId}/${b.id}`} className="underline">{b.nome}</Link>
            {b.tipo === "FINAL" && <span className="text-muted-foreground"> · final</span>}
          </li>
        ))}
      </ul>
    </main>
  );
}
