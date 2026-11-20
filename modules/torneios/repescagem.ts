// RN186-RN188: planeja a repescagem tradicional e as lutas de bronze. Sem acesso ao banco (fácil de testar).
import { chaveDeLados, type JogoPlano, type Lado } from "./jogos";
import { potenciaDe2, ordemDaChave } from "./sorteio";

export type JogoPrincipal = {
  numero: number;
  rodada: number;
  fase: string;
  vencedor: number | null; // equipe vencedora (jogo encerrado)
  perdedor: number | null;
};

export type PlanoRepescagem = { plano: JogoPlano[]; bronzeSemLuta: number[] }; // equipes que levam o bronze sem lutar

export function ehJogoDeRepescagem(fase: string | null) {
  return !!fase && (fase.startsWith("Repescagem") || fase.startsWith("Disputa de bronze"));
}

export function planejarRepescagem(jogos: JogoPrincipal[]): { erro: string } | PlanoRepescagem {
  const semis = jogos.filter((j) => j.fase === "Semifinal").sort((a, b) => a.numero - b.numero);
  if (semis.length !== 2) return { erro: "A repescagem precisa de uma chave com duas semifinais (mínimo de 4 atletas)." };
  if (semis.some((s) => s.vencedor === null || s.perdedor === null)) {
    return { erro: "Termine as duas semifinais antes de gerar a repescagem." };
  }
  const finalistas = [semis[0].vencedor!, semis[1].vencedor!];
  const perdedoresSemi = [semis[0].perdedor!, semis[1].perdedor!];
  const rodadaBase = semis[0].rodada;

  const plano: JogoPlano[] = [];
  const vencedoresRepescagem: (Lado | null)[] = [];

  (["A", "B"] as const).forEach((lado, i) => {
    const finalista = finalistas[i];
    // Quem perdeu para o finalista deste lado, antes da semifinal, na ordem em que foi derrotado.
    const entrantes = jogos
      .filter((j) => j.fase !== "Semifinal" && j.fase !== "Final" && !ehJogoDeRepescagem(j.fase))
      .filter((j) => j.vencedor === finalista && j.perdedor !== null)
      .sort((a, b) => a.rodada - b.rodada || a.numero - b.numero)
      .map((j) => j.perdedor!);

    if (entrantes.length === 0) {
      vencedoresRepescagem.push(null);
    } else if (entrantes.length === 1) {
      vencedoresRepescagem.push({ equipeId: entrantes[0] });
    } else {
      const tamanho = potenciaDe2(entrantes.length);
      const entradas = ordemDaChave(tamanho).map((seed) =>
        seed <= entrantes.length ? ({ equipeId: entrantes[seed - 1] } as Lado) : null
      );
      const sub = chaveDeLados(entradas, null, rodadaBase);
      const deslocamento = plano.length;
      for (const j of sub) {
        const remap = (l: Lado): Lado => ("jogo" in l ? { jogo: l.jogo + deslocamento } : l);
        plano.push({ ...j, fase: `Repescagem ${lado} · ${j.fase}`, a: remap(j.a), b: remap(j.b) });
      }
      vencedoresRepescagem.push({ jogo: plano.length - 1 }); // o último jogo da repescagem é a sua final
    }
  });

  // Bronze cruzado: vencedor da repescagem de um lado x perdedor da semifinal do lado oposto.
  const rodadaBronze = plano.reduce((m, j) => Math.max(m, j.rodada), rodadaBase) + 1;
  const bronzeSemLuta: number[] = [];
  for (let i = 0; i < 2; i++) {
    const venc = vencedoresRepescagem[i];
    const oposto = perdedoresSemi[1 - i];
    if (venc === null) {
      bronzeSemLuta.push(oposto);
      continue;
    }
    plano.push({ fase: "Disputa de bronze", rodada: rodadaBronze, a: venc, b: { equipeId: oposto } });
  }
  return { plano, bronzeSemLuta };
}
