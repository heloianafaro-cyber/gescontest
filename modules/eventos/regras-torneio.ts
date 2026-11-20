import { z } from "zod";
import { torneioSchema, sistemasDoFormato, VARIANTES_ELIMINATORIO, TERCEIRO_LUGAR } from "./schemas-estrutura";

export type DadosTorneio = z.infer<typeof torneioSchema>;

// Critérios de categoria da modalidade de luta (RN157).
export type ConfigLuta = { catPeso: boolean; catIdade: boolean; catFaixa: boolean; faixas: string[] };

// Confere as regras que dependem do formato da modalidade e monta os dados do banco.
export function montarDados(formato: string | null, d: DadosTorneio, cfg: ConfigLuta) {
  const permitidos = sistemasDoFormato(formato).map((s) => s.valor);
  if (!permitidos.includes(d.sistemaDisputa)) {
    return { erro: "Sistema de disputa inválido para esta modalidade." };
  }

  const comPlacar = formato === "CORRIDO" || formato === "SETS";
  const rodizio = d.sistemaDisputa === "RODIZIO";
  const eliminatorio = d.sistemaDisputa === "ELIMINATORIO";
  const misto = d.sistemaDisputa === "MISTO";
  const temMataMata = eliminatorio || misto;
  const pontua = comPlacar && (rodizio || misto);

  // Rodízio
  const turnos = rodizio ? (d.turnos ?? 1) : 1;
  if (rodizio && turnos !== 1 && turnos !== 2) {
    return { erro: "Escolha turno simples ou turno e returno." };
  }

  // Misto (grupos + mata-mata)
  if (misto) {
    if (d.chaves === undefined || d.chaves < 2) return { erro: "Informe quantos grupos o torneio terá (mínimo 2)." };
    if (d.classificadosPorGrupo === undefined || d.classificadosPorGrupo < 1) {
      return { erro: "Informe quantos classificados avançam de cada grupo." };
    }
  }

  // Eliminatório
  let variante: string | null = null;
  let terceiroLugar: string | null = null;
  if (eliminatorio) {
    variante = d.variante ?? "SIMPLES";
    if (!VARIANTES_ELIMINATORIO.some((v) => v.valor === variante)) return { erro: "Variante inválida." };
    if (variante === "REPESCAGEM" && formato !== "LUTA") {
      return { erro: "A eliminatória com repescagem só existe em modalidades de luta." };
    }
  }
  if (temMataMata && variante !== "REPESCAGEM") {
    terceiroLugar = d.terceiroLugar ?? "DISPUTA_3LUGAR";
    if (!TERCEIRO_LUGAR.some((t) => t.valor === terceiroLugar)) return { erro: "Opção de 3º lugar inválida." };
  }

  // Série de jogos por confronto (play-off): só no mata-mata
  let jogosPorSerie: number | null = null;
  if (temMataMata && formato !== "LUTA" && d.jogosPorSerie !== undefined && d.jogosPorSerie > 1) {
    if (![3, 5, 7].includes(d.jogosPorSerie)) return { erro: "A série pode ter 3, 5 ou 7 jogos." };
    jogosPorSerie = d.jogosPorSerie;
  }
  // A final pode ter um tamanho de série diferente (só faz sentido se houver série).
  let jogosPorSerieFinal: number | null = null;
  if (jogosPorSerie && d.jogosPorSerieFinal !== undefined && d.jogosPorSerieFinal > 1) {
    if (![3, 5, 7].includes(d.jogosPorSerieFinal)) return { erro: "A série da final pode ter 3, 5 ou 7 jogos." };
    jogosPorSerieFinal = d.jogosPorSerieFinal;
  }

  if (formato === "SETS") {
    if (![2, 3, 4].includes(d.setsParaVencer ?? 0)) {
      return { erro: "Escolha se a partida é melhor de 3, 5 ou 7 sets." };
    }
    if (!d.pontosPorSet || d.pontosPorSet < 1) return { erro: "Informe até quantos pontos vai cada set." };
    if (!d.pontosSetDecisivo || d.pontosSetDecisivo < 1) {
      return { erro: "Informe até quantos pontos vai o set decisivo." };
    }
  }

  // Duração dos jogos (RN136): modalidades por marca ou sem placar não têm jogos
  const temJogos = comPlacar || formato === "LUTA";
  let numTempos: number | null = null;
  let duracaoTempoMin: number | null = null;
  let intervaloTemposMin: number | null = null;
  let duracaoJogoMin: number | null = null;
  if (formato === "CORRIDO") {
    numTempos = d.numTempos ?? 2;
    duracaoTempoMin = d.duracaoTempoMin ?? 20;
    intervaloTemposMin = d.intervaloTemposMin ?? 5;
    if (numTempos < 1 || numTempos > 4) return { erro: "O número de tempos deve ficar entre 1 e 4." };
    if (duracaoTempoMin < 1) return { erro: "Informe a duração de cada tempo, em minutos." };
    // Duração total = tempos + intervalos entre eles.
    duracaoJogoMin = numTempos * duracaoTempoMin + (numTempos - 1) * intervaloTemposMin;
  } else if (temJogos) {
    duracaoJogoMin = d.duracaoJogoMin ?? null;
    if (!duracaoJogoMin || duracaoJogoMin < 1) {
      return { erro: "Informe a duração estimada de cada jogo, em minutos." };
    }
  }

  // Lutas: categoria por peso, idade e/ou faixa (RN157) ou absoluto (sem limite)
  const luta = formato === "LUTA";
  const absoluto = luta && d.absoluto;
  const usaPeso = luta && !absoluto && cfg.catPeso;
  // RN162: o absoluto não tem peso, mas pode ter restrição de idade e/ou faixa (e naipe).
  const usaIdade = luta && cfg.catIdade;
  const usaFaixa = luta && cfg.catFaixa;

  if (usaPeso && d.pesoMin !== undefined && d.pesoMax !== undefined && d.pesoMax < d.pesoMin) {
    return { erro: "O peso máximo não pode ser menor que o mínimo." };
  }
  if (usaIdade) {
    if (!absoluto && d.idadeMin === undefined && d.idadeMax === undefined) {
      return { erro: "Informe a idade mínima e/ou a máxima da categoria." };
    }
    if (d.idadeMin !== undefined && d.idadeMax !== undefined && d.idadeMax < d.idadeMin) {
      return { erro: "A idade máxima não pode ser menor que a mínima." };
    }
  }
  if (usaFaixa) {
    const invalidas = d.faixas.filter((f) => !cfg.faixas.includes(f));
    if (invalidas.length > 0) return { erro: `Faixa não cadastrada na modalidade: ${invalidas.join(", ")}.` };
  }

  return {
    dados: {
      nome: d.nome,
      sistemaDisputa: d.sistemaDisputa,
      turnos,
      variante,
      terceiroLugar,
      jogosPorSerie,
      jogosPorSerieFinal,
      chaves: misto ? (d.chaves ?? null) : null,
      classificadosPorGrupo: misto ? (d.classificadosPorGrupo ?? null) : null,
      pontosVit: pontua ? (d.pontosVit ?? 3) : 3,
      pontosEmp: pontua ? (d.pontosEmp ?? 1) : 1,
      pontosDer: pontua ? (d.pontosDer ?? 0) : 0,
      setsParaVencer: formato === "SETS" ? (d.setsParaVencer ?? null) : null,
      pontosPorSet: formato === "SETS" ? (d.pontosPorSet ?? null) : null,
      pontosSetDecisivo: formato === "SETS" ? (d.pontosSetDecisivo ?? null) : null,
      diferencaMinima: formato === "SETS" ? (d.diferencaMinima ?? null) : null,
      woPlacarVencedor: comPlacar ? (d.woPlacarVencedor ?? null) : null,
      woPlacarPerdedor: comPlacar ? (d.woPlacarPerdedor ?? null) : null,
      woPontosSetVencedor: formato === "SETS" ? (d.woPontosSetVencedor ?? null) : null,
      numTempos,
      duracaoTempoMin,
      intervaloTemposMin,
      duracaoJogoMin,
      intervaloJogosMin: temJogos ? (d.intervaloJogosMin ?? 10) : 10,
      absoluto,
      pesoMin: usaPeso ? (d.pesoMin ?? null) : null,
      pesoMax: usaPeso ? (d.pesoMax ?? null) : null,
      naipe: d.naipe ?? null,
      idadeMin: usaIdade ? (d.idadeMin ?? null) : null,
      idadeMax: usaIdade ? (d.idadeMax ?? null) : null,
      faixas: usaFaixa ? d.faixas : [],
    },
  };
}
