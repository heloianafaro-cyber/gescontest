import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

export const instant = false;

const SISTEMAS: Record<string, string> = {
  RODIZIO: "Rodízio",
  ELIMINATORIO: "Eliminatória",
  MISTO: "Grupos e mata-mata",
  PLAYOFF: "Play-off",
  PLAY_OFF: "Play-off",
};

// Índice público: escolha o torneio para ver classificação e chave.
export default async function ClassificacaoDoEvento({ params }: { params: Promise<{ eventoId: string }> }) {
  const eventoId = Number((await params).eventoId);
  if (!Number.isInteger(eventoId)) notFound();

  const evento = await prisma.evento.findUnique({
    where: { id: eventoId },
    select: {
      nome: true,
      modalidades: {
        orderBy: { nome: "asc" },
        select: {
          id: true,
          nome: true,
          mae: { select: { nome: true } },
          torneios: {
            orderBy: { nome: "asc" },
            where: { disputas: { some: { partida: { isNot: null } } } },
            select: { id: true, nome: true, sistemaDisputa: true },
          },
        },
      },
    },
  });
  if (!evento) notFound();

  const modalidades = evento.modalidades
    .filter((m) => m.torneios.length > 0)
    .map((m) => ({ ...m, rotulo: m.mae ? `${m.mae.nome} — ${m.nome}` : m.nome }))
    .sort((a, b) => a.rotulo.localeCompare(b.rotulo, "pt-BR"));

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6 sm:p-8">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold">Classificação e chaves — {evento.nome}</h1>
        <div className="flex gap-4 text-sm">
          <Link href="/" className="underline">Início</Link>
          <Link href={`/jogos/${eventoId}`} className="underline">Jogos e resultados</Link>
          <Link href={`/podio/${eventoId}`} className="underline">Pódio</Link>
        </div>
      </header>

      {modalidades.length === 0 && <p className="text-sm">Os torneios deste evento ainda não foram divulgados.</p>}

      {modalidades.map((m) => (
        <section key={m.id} className="space-y-1">
          <h2 className="border-b font-semibold">{m.rotulo}</h2>
          <ul className="space-y-1 text-sm">
            {m.torneios.map((t) => (
              <li key={t.id}>
                <Link href={`/classificacao/${eventoId}/${t.id}`} className="underline">{t.nome}</Link>
                <span className="text-muted-foreground"> · {SISTEMAS[t.sistemaDisputa] ?? t.sistemaDisputa}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
