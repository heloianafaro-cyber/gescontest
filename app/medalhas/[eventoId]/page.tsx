import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { quadroDeMedalhas } from "@/modules/publico/medalhas-db";

export const instant = false;

const ICONE = { OURO: "🥇", PRATA: "🥈", BRONZE: "🥉" } as const;

// RN253-RN258: quadro de medalhas público, por delegação. Só nomes de delegações, nunca de pessoas.
export default async function QuadroDeMedalhas({ params }: { params: Promise<{ eventoId: string }> }) {
  const eventoId = Number((await params).eventoId);
  if (!Number.isInteger(eventoId)) notFound();

  const evento = await prisma.evento.findUnique({ where: { id: eventoId }, select: { nome: true } });
  if (!evento) notFound();
  const quadro = await quadroDeMedalhas(eventoId);
  if (!quadro) notFound();

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6 sm:p-8">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold">Quadro de medalhas — {evento.nome}</h1>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <Link href="/" className="underline">Início</Link>
          <Link href={`/jogos/${eventoId}`} className="underline">Jogos e resultados</Link>
          <Link href={`/classificacao/${eventoId}`} className="underline">Classificação e chaves</Link>
          <Link href={`/podio/${eventoId}`} className="underline">Pódio</Link>
        </div>
        {quadro.torneiosTotal > 0 && (
          <p className="text-sm text-muted-foreground">
            {quadro.torneiosEncerrados} de {quadro.torneiosTotal} torneio(s) encerrado(s). As medalhas entram aqui sozinhas quando o pódio de cada torneio fica pronto.
          </p>
        )}
      </header>

      {quadro.linhas.length === 0 && <p className="text-sm">Nenhuma medalha foi distribuída ainda.</p>}

      {quadro.linhas.length > 0 && (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-1 pr-2">#</th>
                  <th className="py-1 pr-2">Delegação</th>
                  <th className="py-1 pr-2 text-center" title="Ouro">🥇</th>
                  <th className="py-1 pr-2 text-center" title="Prata">🥈</th>
                  <th className="py-1 pr-2 text-center" title="Bronze">🥉</th>
                  <th className="py-1 text-center">Total</th>
                </tr>
              </thead>
              <tbody>
                {quadro.linhas.map((l) => (
                  <tr key={l.delegacaoId} className="border-b">
                    <td className="py-1 pr-2">{l.posicao}º</td>
                    <td className="py-1 pr-2 font-medium">{l.nome}</td>
                    <td className="py-1 pr-2 text-center">{l.ouro}</td>
                    <td className="py-1 pr-2 text-center">{l.prata}</td>
                    <td className="py-1 pr-2 text-center">{l.bronze}</td>
                    <td className="py-1 text-center font-medium">{l.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <section className="space-y-2">
            <h2 className="text-sm font-semibold">De onde vieram as medalhas</h2>
            {quadro.linhas.map((l) => (
              <details key={l.delegacaoId} className="rounded border p-2 text-sm">
                <summary className="cursor-pointer font-medium">{l.nome}</summary>
                <ul className="mt-2 space-y-1">
                  {l.detalhes.map((d, i) => (
                    <li key={`${d.torneioId}-${d.tipo}-${i}`} className="flex gap-2">
                      <span aria-hidden>{ICONE[d.tipo]}</span>
                      <span>
                        {d.modalidade} —{" "}
                        <Link href={`/classificacao/${eventoId}/${d.torneioId}`} className="underline">{d.torneio}</Link>
                      </span>
                    </li>
                  ))}
                </ul>
              </details>
            ))}
          </section>
          <p className="text-xs text-muted-foreground">
            Critério: mais ouros; em empate, mais pratas; depois mais bronzes. Cada pódio de torneio vale uma medalha por equipe (esporte coletivo não conta uma por atleta).
          </p>
        </>
      )}
    </main>
  );
}
