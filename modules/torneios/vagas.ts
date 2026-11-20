// RN183: dado o estado dos jogos de um torneio, calcula quem ocupa cada vaga do mata-mata
// e quais jogos de série ficam cancelados. Sem acesso ao banco (fácil de testar).

export type DisputaVaga = {
  id: number;
  serie: number | null;
  jogoNaSerie: number | null;
  status: string;
  equipeAId: number | null;
  equipeBId: number | null;
  origemAId: number | null;
  origemBId: number | null;
  origemPerdedor: boolean;
  vencedorId: number | null;
};

export type Mudanca = { id: number; equipeAId?: number | null; equipeBId?: number | null; status?: string };

const FECHADO = ["ENCERRADA", "WO"];

// Resultado de um jogo ou de uma série inteira (a referência aponta para o 1º jogo da série).
function resultadoDe(origem: DisputaVaga, todos: Map<number, DisputaVaga>, series: Map<number, DisputaVaga[]>) {
  const jogos = origem.serie ? (series.get(origem.serie) ?? [origem]) : [origem];
  if (!origem.serie) {
    if (!FECHADO.includes(origem.status) || origem.vencedorId === null) return null;
    const perdedor = origem.equipeAId === origem.vencedorId ? origem.equipeBId : origem.equipeAId;
    return { vencedor: origem.vencedorId, perdedor };
  }
  const precisa = Math.floor(jogos.length / 2) + 1;
  const vitorias = new Map<number, number>();
  const times = new Set<number>();
  for (const j of jogos) {
    if (j.equipeAId !== null) times.add(j.equipeAId);
    if (j.equipeBId !== null) times.add(j.equipeBId);
    if (FECHADO.includes(j.status) && j.vencedorId !== null) {
      vitorias.set(j.vencedorId, (vitorias.get(j.vencedorId) ?? 0) + 1);
    }
  }
  for (const [equipe, n] of vitorias) {
    if (n >= precisa) {
      const outros = [...times].filter((t) => t !== equipe);
      return { vencedor: equipe, perdedor: outros.length === 1 ? outros[0] : null };
    }
  }
  void todos;
  return null;
}

export function planejarVagas(entrada: DisputaVaga[]): Mudanca[] {
  const disputas = entrada.map((d) => ({ ...d })); // trabalha numa cópia
  const todos = new Map(disputas.map((d) => [d.id, d]));
  const series = new Map<number, DisputaVaga[]>();
  for (const d of disputas) {
    if (d.serie) series.set(d.serie, [...(series.get(d.serie) ?? []), d]);
  }
  for (const lista of series.values()) lista.sort((x, y) => (x.jogoNaSerie ?? 0) - (y.jogoNaSerie ?? 0));

  const mudancas = new Map<number, Mudanca>();
  const marcar = (id: number, parte: Partial<Mudanca>) =>
    mudancas.set(id, { ...(mudancas.get(id) ?? { id }), ...parte });

  // Repete até estabilizar: uma vaga preenchida pode decidir a vaga seguinte.
  for (let volta = 0; volta < 12; volta++) {
    let mudou = false;

    for (const d of disputas) {
      for (const lado of ["A", "B"] as const) {
        const origemId = lado === "A" ? d.origemAId : d.origemBId;
        if (origemId === null) continue;
        const origem = todos.get(origemId);
        if (!origem) continue;
        const r = resultadoDe(origem, todos, series);
        const novo = r ? (d.origemPerdedor ? r.perdedor : r.vencedor) : null;
        const campo = lado === "A" ? "equipeAId" : "equipeBId";
        if (d[campo] !== novo) {
          d[campo] = novo;
          marcar(d.id, { [campo]: novo });
          mudou = true;
        }
      }
    }

    // Série decidida: os jogos que não foram disputados ficam cancelados; se a série reabrir, voltam.
    for (const lista of series.values()) {
      const decidida = resultadoDe(lista[0], todos, series) !== null;
      for (const j of lista) {
        if (decidida && j.status === "AGENDADA") {
          j.status = "CANCELADA";
          marcar(j.id, { status: "CANCELADA" });
          mudou = true;
        } else if (!decidida && j.status === "CANCELADA") {
          j.status = "AGENDADA";
          marcar(j.id, { status: "AGENDADA" });
          mudou = true;
        }
      }
    }
    if (!mudou) break;
  }
  return [...mudancas.values()];
}
