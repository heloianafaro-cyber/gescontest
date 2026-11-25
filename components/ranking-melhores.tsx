import type { RankingMelhores } from "@/modules/torneios/melhores";

// RN237-RN239: tabela dos melhores de uma posição entre os grupos (ex.: melhores terceiros).
export function RankingMelhoresTabela({
  ranking,
  nomes,
  posicao,
  vagas,
}: {
  ranking: RankingMelhores;
  nomes: Map<number, string>;
  posicao: number;
  vagas: number;
}) {
  const nome = (id: number) => nomes.get(id) ?? `Equipe ${id}`;
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-semibold">Melhores {posicao}º colocados</h2>
      <p className="text-xs text-muted-foreground">
        Avançam os {vagas} melhores. Mesmos critérios de desempate do torneio
        {ranking.descartados > 0 ? "; nos grupos maiores, os jogos contra o último colocado não contam" : ""}.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[28rem] text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="py-1 pr-2">#</th>
              <th className="pr-2">Equipe</th>
              <th className="pr-2">Grupo</th>
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
            {ranking.linhas.map((l) => (
              <tr key={l.equipeId} className={`border-b ${l.posicao <= vagas ? "bg-muted font-bold" : ""}`}>
                <td className="py-1 pr-2">
                  {l.posicao}º{l.empatada ? " ⚠" : ""}
                </td>
                <td className="pr-2">
                  {nome(l.equipeId)}
                  {l.posicao <= vagas && (
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      {ranking.definido ? "classificado" : "dentro do corte"}
                    </span>
                  )}
                </td>
                <td className="pr-2">{String.fromCharCode(64 + l.grupo)}</td>
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
      {!ranking.definido && ranking.pendencia && (
        <p className="text-xs text-muted-foreground">Ranking provisório: {ranking.pendencia}</p>
      )}
    </section>
  );
}
