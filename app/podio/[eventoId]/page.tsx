import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PodioTorneio } from "@/components/podio-torneio";
import { podioDoTorneio } from "@/modules/publico/podio-db";

export const instant = false;

// RN218: pódios dos torneios já encerrados.
export default async function PodiosDoEvento({ params }: { params: Promise<{ eventoId: string }> }) {
  const eventoId = Number((await params).eventoId);
  if (!Number.isInteger(eventoId)) notFound();

  const evento = await prisma.evento.findUnique({
    where: { id: eventoId },
    select: {
      nome: true,
      modalidades: {
        select: {
          id: true,
          nome: true,
          mae: { select: { nome: true } },
          torneios: { orderBy: { nome: "asc" }, where: { disputas: { some: { partida: { isNot: null } } } }, select: { id: true, nome: true } },
        },
      },
    },
  });
  if (!evento) notFound();

  const modalidades = evento.modalidades
    .map((m) => ({ ...m, rotulo: m.mae ? `${m.mae.nome} — ${m.nome}` : m.nome }))
    .sort((a, b) => a.rotulo.localeCompare(b.rotulo, "pt-BR"));

  let encerrados = 0;
  let total = 0;
  const blocos: { modalidade: string; torneios: { id: number; nome: string; podio: NonNullable<Awaited<ReturnType<typeof podioDoTorneio>>> }[] }[] = [];
  for (const m of modalidades) {
    const lista = [];
    for (const t of m.torneios) {
      total++;
      const podio = await podioDoTorneio(t.id);
      if (podio?.completo) {
        encerrados++;
        lista.push({ id: t.id, nome: t.nome, podio });
      }
    }
    if (lista.length > 0) blocos.push({ modalidade: m.rotulo, torneios: lista });
  }

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6 sm:p-8">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold">Pódio — {evento.nome}</h1>
        <div className="flex gap-4 text-sm">
          <Link href="/" className="underline">Início</Link>
          <Link href={`/classificacao/${eventoId}`} className="underline">Classificação e chaves</Link>
          <Link href={`/medalhas/${eventoId}`} className="underline">Quadro de medalhas</Link>
        </div>
        {total > 0 && (
          <p className="text-sm text-muted-foreground">
            {encerrados} de {total} torneio(s) encerrado(s). O pódio aparece quando todos os jogos do torneio terminam.
          </p>
        )}
      </header>

      {blocos.length === 0 && <p className="text-sm">Nenhum torneio foi encerrado ainda.</p>}

      {blocos.map((b) => (
        <section key={b.modalidade} className="space-y-3">
          <h2 className="border-b font-semibold">{b.modalidade}</h2>
          {b.torneios.map((t) => (
            <div key={t.id} className="space-y-1">
              <h3 className="text-sm font-medium">
                <Link href={`/classificacao/${eventoId}/${t.id}`} className="underline">{t.nome}</Link>
              </h3>
              <PodioTorneio podio={t.podio} />
            </div>
          ))}
        </section>
      ))}
    </main>
  );
}
