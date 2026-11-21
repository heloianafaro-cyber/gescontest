// RN215: agrupa os jogos de um torneio por fase (rodada, grupo, oitavas, semifinal, final...). Lógica pura.

export type JogoDeFase = { id: number; fase: string | null; numero: number | null; rodada: number | null };

export function agruparPorFase<T extends JogoDeFase>(jogos: T[]): { fase: string; jogos: T[] }[] {
  const mapa = new Map<string, T[]>();
  for (const j of jogos) {
    const nome = j.fase ?? (j.rodada !== null ? `Rodada ${j.rodada}` : "Jogos");
    mapa.set(nome, [...(mapa.get(nome) ?? []), j]);
  }
  const ordem = (j: T) => j.numero ?? j.id;
  return [...mapa.entries()]
    .map(([fase, lista]) => ({ fase, jogos: [...lista].sort((a, b) => ordem(a) - ordem(b)) }))
    .sort((a, b) => ordem(a.jogos[0]) - ordem(b.jogos[0]));
}
