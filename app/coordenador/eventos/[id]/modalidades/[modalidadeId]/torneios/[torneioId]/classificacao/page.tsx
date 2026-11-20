import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { exigirCoordenadorDoEvento } from "@/modules/eventos/acesso";
import { tabelasDoTorneio } from "@/modules/torneios/classificacao-db";
import { salvarDesempate } from "@/modules/torneios/acoes-classificacao";
import { Button } from "@/components/ui/button";

export const instant = false;

export default async function Classificacao({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; modalidadeId: string; torneioId: string }>;
  searchParams: Promise<{ erro?: string; ok?: string }>;
}) {
  const { id, modalidadeId, torneioId } = await params;
  const { erro, ok } = await searchParams;
  const eventoId = Number(id);
  const idModalidade = Number(modalidadeId);
  const idTorneio = Number(torneioId);
  if (![eventoId, idModalidade, idTorneio].every(Number.isInteger)) notFound();

  await exigirCoordenadorDoEvento(eventoId);

  const dados = await tabelasDoTorneio(prisma, idTorneio);
  if (!dados || dados.torneio.modalidadeId !== idModalidade || dados.torneio.modalidade.eventoId !== eventoId) notFound();

  const t = dados.torneio;
  const voltar = `/coordenador/eventos/${eventoId}/modalidades/${idModalidade}/torneios/${idTorneio}/jogos`;
  const nome = (equipeId: number) => dados.nomes.get(equipeId) ?? `Equipe ${equipeId}`;
  const manual = new Map(t.participantes.map((p) => [p.equipeId, p.desempateManual]));
  const k = t.classificadosPorGrupo ?? 0;
  const empatadas = dados.tabelas.flatMap((tab) => tab.linhas.filter((l) => l.empatada));
  const acao = salvarDesempate.bind(null, eventoId, idModalidade, idTorneio);

  return (
    <main className="space-y-6 p-8">
      <h1 className="text-xl font-semibold">Classificação · {t.nome}</h1>
      <Link href={voltar} className="text-sm underline">Voltar aos jogos</Link>

      {erro && <p className="text-sm text-red-600">{erro}</p>}
      {ok && <p className="text-sm text-green-700">Ordem de desempate salva.</p>}

      {dados.tabelas.length === 0 && (
        <p className="text-sm">Este torneio não tem tabela de classificação (só rodízio e grupos do misto têm).</p>
      )}

      {dados.tabelas.map((tab) => (
        <section key={tab.grupo ?? 0} className="space-y-2">
          {tab.grupo !== null && (
            <h2 className="font-medium">
              Grupo {String.fromCharCode(64 + tab.grupo)} {tab.completa ? "· encerrado" : "· em andamento"}
            </h2>
          )}
          <table className="w-full max-w-3xl text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-1 pr-2">#</th>
                <th className="pr-2">Equipe</th>
                <th className="pr-2">P</th>
                <th className="pr-2">J</th>
                <th className="pr-2">V</th>
                <th className="pr-2">E</th>
                <th className="pr-2">D</th>
                <th className="pr-2">+</th>
                <th className="pr-2">-</th>
                <th className="pr-2">Saldo</th>
              </tr>
            </thead>
            <tbody>
              {tab.linhas.map((l) => (
                <tr
                  key={l.equipeId}
                  className={`border-b ${tab.grupo !== null && l.posicao <= k ? "font-medium" : ""}`}
                >
                  <td className="py-1 pr-2">{l.posicao}º{l.empatada ? " ⚠" : ""}</td>
                  <td className="pr-2">{nome(l.equipeId)}</td>
                  <td className="pr-2">{l.pontos}</td>
                  <td className="pr-2">{l.jogos}</td>
                  <td className="pr-2">{l.vitorias}</td>
                  <td className="pr-2">{l.empates}</td>
                  <td className="pr-2">{l.derrotas}</td>
                  <td className="pr-2">{l.pro}</td>
                  <td className="pr-2">{l.contra}</td>
                  <td className="pr-2">{l.saldo}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {tab.grupo !== null && (
            <p className="text-xs text-muted-foreground">Em negrito: classificados para o mata-mata ({k} por grupo).</p>
          )}
        </section>
      ))}

      {empatadas.length > 0 && (
        <section className="max-w-xl space-y-3 rounded-lg border border-amber-300 p-4">
          <p className="text-sm font-medium">⚠ Empate que os critérios não resolveram</p>
          <p className="text-sm text-muted-foreground">
            Defina a ordem das equipes abaixo (1 = fica na frente). No misto, os classificados só entram no mata-mata
            quando as posições estiverem decididas.
          </p>
          <form action={acao} className="space-y-2">
            {empatadas.map((l) => (
              <div key={l.equipeId} className="flex items-center gap-3 text-sm">
                <input
                  name={`ordem_${l.equipeId}`}
                  type="number"
                  min={1}
                  defaultValue={manual.get(l.equipeId) ?? ""}
                  className="h-9 w-20 rounded-md border border-input bg-transparent px-2"
                />
                <span>{nome(l.equipeId)}</span>
              </div>
            ))}
            <Button type="submit">Salvar ordem</Button>
          </form>
        </section>
      )}
    </main>
  );
}
