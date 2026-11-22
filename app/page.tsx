import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { JogoLinha } from "@/components/jogo-publico";
import { eventoAtualId, jogosDoEvento } from "@/modules/publico/consultas";
import { chaveDia } from "@/modules/publico/formato";

export const instant = false;

const datas = (d: Date) => d.toLocaleDateString("pt-BR", { timeZone: "UTC" });

// RN215-RN217: página inicial pública, sem login e sem nomes de pessoas.
export default async function Home() {
  const eventos = await prisma.evento.findMany({
    orderBy: { dataInicio: "desc" },
    select: { id: true, nome: true, dataInicio: true, dataFim: true },
  });
  const atualId = await eventoAtualId();
  const atual = eventos.find((e) => e.id === atualId) ?? null;
  const outros = eventos.filter((e) => e.id !== atualId);

  const jogos = atual ? await jogosDoEvento(atual.id) : [];
  const hoje = chaveDia(new Date());
  const agora = Date.now();
  const deHoje = jogos.filter((j) => j.dataHora && chaveDia(j.dataHora) === hoje && j.resultado.status !== "CANCELADA");
  const proximos = jogos
    .filter((j) => j.dataHora && j.dataHora.getTime() >= agora && j.resultado.status === "AGENDADA" && chaveDia(j.dataHora) !== hoje)
    .slice(0, 8);
  const recentes = jogos
    .filter((j) => j.resultado.status === "ENCERRADA" || j.resultado.status === "WO")
    .sort((a, b) => (b.dataHora?.getTime() ?? 0) - (a.dataHora?.getTime() ?? 0))
    .slice(0, 8);

  return (
    <main className="mx-auto max-w-4xl space-y-8 p-6 sm:p-8">
      <header className="space-y-1">
        <p className="text-sm font-medium text-muted-foreground">GesContest</p>
        <h1 className="text-2xl font-semibold">{atual ? atual.nome : "Eventos esportivos escolares"}</h1>
        {atual && (
          <p className="text-sm text-muted-foreground">
            {datas(atual.dataInicio)} a {datas(atual.dataFim)}
          </p>
        )}
      </header>

      {!atual && <p>Nenhum evento cadastrado ainda.</p>}

      {atual && (
        <>
          <nav className="flex flex-wrap gap-x-5 gap-y-2 text-sm" aria-label="Atalhos do evento">
            <Link href={`/jogos/${atual.id}`} className="underline">Todos os jogos</Link>
            <Link href={`/classificacao/${atual.id}`} className="underline">Classificação e chaves</Link>
            <Link href={`/podio/${atual.id}`} className="underline">Pódio</Link>
            <Link href={`/boletins/${atual.id}`} className="underline">Boletins</Link>
            <Link href={`/agenda/${atual.id}`} className="underline">Levar para minha agenda</Link>
            <Link href="/regulamentos" className="underline">Regulamentos</Link>
          </nav>

          <section className="space-y-1">
            <h2 className="text-lg font-semibold">Jogos de hoje</h2>
            {deHoje.length === 0 ? (
              <p className="text-sm text-muted-foreground">Não há jogos hoje.</p>
            ) : (
              <ul>{deHoje.map((j) => <JogoLinha key={j.id} jogo={j} />)}</ul>
            )}
          </section>

          {proximos.length > 0 && (
            <section className="space-y-1">
              <h2 className="text-lg font-semibold">Próximos jogos</h2>
              <ul>
                {proximos.map((j) => (
                  <JogoLinha key={j.id} jogo={j} />
                ))}
              </ul>
            </section>
          )}

          {recentes.length > 0 && (
            <section className="space-y-1">
              <h2 className="text-lg font-semibold">Últimos resultados</h2>
              <ul>
                {recentes.map((j) => (
                  <JogoLinha key={j.id} jogo={j} />
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      {outros.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Outros eventos</h2>
          <ul className="space-y-1 text-sm">
            {outros.map((e) => (
              <li key={e.id}>
                <Link href={`/jogos/${e.id}`} className="underline">{e.nome}</Link>
                <span className="text-muted-foreground"> · {datas(e.dataInicio)} a {datas(e.dataFim)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
