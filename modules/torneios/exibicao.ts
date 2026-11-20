// Textos de exibição que dependem do tipo de modalidade (sem acesso ao banco).

// Nas lutas (judô, jiu-jitsu, karatê, taekwondo) não há "jogos", há "combates".
export function termos(formato: string | null | undefined) {
  const luta = formato === "LUTA";
  return {
    jogo: luta ? "combate" : "jogo",
    jogos: luta ? "combates" : "jogos",
    Jogo: luta ? "Combate" : "Jogo",
    Jogos: luta ? "Combates" : "Jogos",
  };
}

const FORMAS: Record<string, string> = {
  IPPON: "Ippon",
  PONTOS: "Pontos",
  FINALIZACAO: "Finalização",
  DECISAO: "Decisão",
  DESCLASSIFICACAO: "Desclassificação",
  WO: "W.O.",
};

type PartidaResumo = {
  placarA: number | null;
  placarB: number | null;
  vencedorId: number | null;
  equipeAId: number | null;
  equipeBId: number | null;
  formaVitoria: string | null;
  penaltisA: number | null;
  penaltisB: number | null;
};

// Texto do resultado ao lado do confronto. Luta: "Vencedor: Fulano" (e "(10x0)" só quando a vitória foi por pontos).
// Demais formatos: "2 x 1" (com os pênaltis, se houve).
export function resumoResultado(
  formato: string | null,
  status: string,
  p: PartidaResumo | null | undefined,
  nomeA: string | null | undefined,
  nomeB: string | null | undefined
): string | null {
  if (!p || (status !== "ENCERRADA" && status !== "WO")) return null;

  if (formato === "LUTA") {
    if (p.vencedorId === null) return null;
    const venceuA = p.vencedorId === p.equipeAId;
    const nome = (venceuA ? nomeA : nomeB) ?? "—";
    let texto = `Vencedor: ${nome}`;
    if (p.formaVitoria === "PONTOS" && p.placarA !== null && p.placarB !== null) {
      texto += ` (${venceuA ? p.placarA : p.placarB}x${venceuA ? p.placarB : p.placarA})`;
    }
    if (p.formaVitoria && FORMAS[p.formaVitoria]) texto += ` · ${FORMAS[p.formaVitoria]}`;
    return texto;
  }

  if (p.placarA === null || p.placarB === null) return null;
  let texto = `${p.placarA} x ${p.placarB}`;
  if (p.penaltisA !== null && p.penaltisB !== null) texto += ` (pên. ${p.penaltisA} x ${p.penaltisB})`;
  if (status === "WO") texto += " · W.O.";
  return texto;
}
