import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { JogoLinha } from "@/components/jogo-publico";
import { jogosDoTorneio } from "@/modules/publico/consultas";
import { agruparPorFase } from "@/modules/publico/chave";
import { tabelasDoTorneio } from "@/modules/torneios/classificacao-db";
import { podioDoTorneio } from "@/modules/publico/podio-db";
import { PodioTorneio } from "@/components/podio-torneio";

export const instant = false;

// RN215: classificação (rodízio e grupos) e jogos por fase (chave), só com nomes de equipes.
export default async function TorneioPublico({ params }: { params: Promise<{ eventoId: string; torneioId: string }> }) {
  const p = await params;
  const eventoId = Number(p.eventoId);
  const torneioId = Number(p.torneioId);
  if (!Number.isInteger(eventoId) || !Number.isInteger(torneioId)) notFound();

  const dados = await tabelasDoTorneio(prisma, torneioId);
  if (!dados || dados.torneio.modalidade.eventoId !== eventoId) notFound();

  const t = dados.torneio;
  const nome = (id: number) => dados.nomes.get(id) ?? "—";
  const k = t.classificadosPorGrupo ?? 0;

  const jogos = (await jogosDoTorneio(torneioId)).filter((j) => j.resultado.status !== "CANCELADA");
  const porId = new Map(t.disputas.map((d) => [d.id, d]));
  const fases = agruparPorFase(jogos.map((j) => ({ ...j, numero: porId.get(j.id)?.numero ?? null, rodada: porId.get(j.id)?.rodada ?? null })));

  const modalidade = t.modalidade.nome;
  const podio = await podioDoTorneio(torneioId);

  return (
    <main className="mx-auto max-w-4xl space-y-8 p-6 sm:p-8">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold">{modalidade} · {t.nome}</h1>
        <div className="flex gap-4 text-sm">
          <Link href={`/classificacao/${eventoId}`} className="underline">Outros torneios</Link>
          <Link href={`/jogos/${eventoId}?modalidade=${t.modalidadeId}`} className="underline">Jogos desta modalidade</Link>
        </div>
      </header>

      {podio?.completo && (
        <section className="space-y-2 rounded-lg border p-4">
          <h2 className="text-lg font-semibold">Pódio</h2>
          <PodioTorneio podio={podio} />
        </section>
      )}

      {dados.tabelas.map((tab) => (
        <section key={tab.grupo ?? 0} className="space-y-2">
          <h2 className="text-lg font-semibold">
            {tab.grupo !== null ? `Grupo ${String.fromCharCode(64 + tab.grupo)}` : "Classificação"}
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[28rem] text-sm">
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
                  <tr key={l.equipeId} className={`border-b ${tab.grupo !== null && l.posicao <= k ? "bg-muted font-bold" : ""}`}>
                    <td className="py-1 pr-2">{l.posicao}º</td>
                    <td className="pr-2">
                      {nome(l.equipeId)}
                      {tab.grupo !== null && l.posicao <= k && <span className="ml-2 text-xs font-normal text-muted-foreground">classificado</span>}
                    </td>
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
          </div>
          {tab.grupo !== null && k > 0 && (
            <p className="text-xs text-muted-foreground">Em negrito e com fundo: classificados para o mata-mata ({k} por grupo).</p>
          )}
        </section>
      ))}

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">
          {t.sistemaDisputa === "RODIZIO" ? "Jogos por rodada" : "Jogos e chave"}
        </h2>
        {fases.length === 0 && <p className="text-sm">Os jogos deste torneio ainda não foram gerados.</p>}
        {fases.map((f) => (
          <div key={f.fase} className="space-y-1">
            <h3 className="border-b text-sm font-semibold">{f.fase}</h3>
            <ul>
              {f.jogos.map((j) => (
                <JogoLinha key={j.id} jogo={j} mostrarModalidade={false} />
              ))}
            </ul>
          </div>
        ))}
      </section>
    </main>
  );
}
