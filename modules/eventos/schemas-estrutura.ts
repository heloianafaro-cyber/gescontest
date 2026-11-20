import { z } from "zod";
import { CRITERIOS } from "../torneios/classificacao";

export const localSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome do local").max(80, "O nome é muito longo"),
});

// Texto "branca, amarela, azul" (ou uma por linha) vira lista sem repetições.
export const listaDeTexto = z.preprocess(
  (v) => (typeof v === "string" ? [...new Set(v.split(/[,\n]/).map((s) => s.trim()).filter(Boolean))] : []),
  z.array(z.string().max(30, "Nome de faixa longo demais"))
);

const caixaMarcada = z.preprocess((v) => v === "on" || v === "true", z.boolean());

export const modalidadeSchema = z
  .object({
    nome: z.string().trim().min(2, "Informe o nome da modalidade").max(80, "O nome é muito longo"),
    tipo: z.enum(["INDIVIDUAL", "COLETIVA"], { error: "Escolha o tipo da modalidade" }),
    minAtletas: z.coerce.number().int("Use números inteiros").min(1, "O mínimo de atletas é 1"),
    maxAtletas: z.coerce.number().int("Use números inteiros").min(1, "O máximo de atletas é 1"),
    // RN168: mínimo de equipes (ou atletas, nas provas individuais) para os torneios acontecerem.
    minEquipes: z.preprocess(
      (v) => (v === "" || v == null ? 2 : v),
      z.coerce.number().int("Use números inteiros").min(2, "O mínimo de equipes é 2")
    ),
    // Vazio = modalidade sem placar (por colocação, sem marca).
    formatoPlacar: z.preprocess(
      (v) => (v === "" ? undefined : v),
      z.enum(["CORRIDO", "SETS", "MARCA", "LUTA"]).optional()
    ),
    // Só vale para o formato MARCA: "menor" = tempo; "maior" = distância ou peso.
    sentidoMarca: z.preprocess(
      (v) => (v === "" ? undefined : v),
      z.enum(["menor", "maior"]).optional()
    ),
    // RN182: só placar corrido. Vazio = sem regra (o vencedor do empate é informado à mão).
    desempateMataMata: z.preprocess(
      (v) => (v === "" ? undefined : v),
      z.enum(["PENALTIS", "PRORROGACAO_PENALTIS"]).optional()
    ),
    prorrogacaoMin: z.preprocess(
      (v) => (v === "" || v == null ? undefined : v),
      z.coerce.number().int("Use números inteiros").min(1, "A prorrogação deve ter pelo menos 1 minuto").max(120, "Duração de prorrogação alta demais").optional()
    ),
    // RN185: critérios de desempate, na ordem (até 6). Vazio = padrão.
    criterio1: z.preprocess((v) => (v === "" || v == null ? undefined : v), z.string().optional()),
    criterio2: z.preprocess((v) => (v === "" || v == null ? undefined : v), z.string().optional()),
    criterio3: z.preprocess((v) => (v === "" || v == null ? undefined : v), z.string().optional()),
    criterio4: z.preprocess((v) => (v === "" || v == null ? undefined : v), z.string().optional()),
    criterio5: z.preprocess((v) => (v === "" || v == null ? undefined : v), z.string().optional()),
    criterio6: z.preprocess((v) => (v === "" || v == null ? undefined : v), z.string().optional()),
    // RN155: modalidade-mãe da prova (vazio = modalidade avulsa).
    maeId: z.preprocess(
      (v) => (v === "" || v == null ? undefined : v),
      z.coerce.number().int().positive().optional()
    ),
    // RN157: só lutas. Como as categorias são formadas.
    catPeso: caixaMarcada,
    catIdade: caixaMarcada,
    catFaixa: caixaMarcada,
    faixas: listaDeTexto,
  })
  .refine((d) => d.maxAtletas >= d.minAtletas, {
    message: "O máximo de atletas não pode ser menor que o mínimo",
    path: ["maxAtletas"],
  })
  .refine((d) => d.formatoPlacar !== "MARCA" || d.sentidoMarca !== undefined, {
    message: "Informe se, na marca, o menor ou o maior valor é o melhor",
    path: ["sentidoMarca"],
  })
  .refine(
    (d) => {
      const lista = [d.criterio1, d.criterio2, d.criterio3, d.criterio4, d.criterio5, d.criterio6].filter(Boolean);
      return new Set(lista).size === lista.length;
    },
    { message: "Não repita o mesmo critério de desempate", path: ["criterio1"] }
  )
  .refine(
    (d) => {
      const lista = [d.criterio1, d.criterio2, d.criterio3, d.criterio4, d.criterio5, d.criterio6].filter(Boolean) as string[];
      return lista.every((c) => CRITERIOS.some((x) => x.codigo === c && x.formatos.includes(d.formatoPlacar ?? "")));
    },
    { message: "Critério de desempate inválido para este formato", path: ["criterio1"] }
  )
  .refine((d) => d.desempateMataMata !== "PRORROGACAO_PENALTIS" || d.formatoPlacar !== "CORRIDO" || d.prorrogacaoMin !== undefined, {
    message: "Informe a duração da prorrogação, em minutos",
    path: ["prorrogacaoMin"],
  })
  .refine((d) => d.formatoPlacar !== "LUTA" || !d.catFaixa || d.faixas.length >= 2, {
    message: "Informe pelo menos duas cores de faixa (separadas por vírgula)",
    path: ["faixas"],
  });

  // Modalidade-mãe (RN155/RN156): agrupa as provas e define o tipo usado na contagem dos limites.
export const maeSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome da modalidade").max(80, "O nome é muito longo"),
  tipo: z.enum(["INDIVIDUAL", "COLETIVA"], { error: "Escolha o tipo da modalidade" }),
});

// ---------- Torneios ----------

// Sistemas de disputa que cada formato de modalidade aceita (o banco guarda o código).
export const SISTEMAS_POR_FORMATO: Record<string, { valor: string; rotulo: string }[]> = {
  CORRIDO: [
    { valor: "RODIZIO", rotulo: "Sistema de Rodízio (todos contra todos)" },
    { valor: "ELIMINATORIO", rotulo: "Sistema Eliminatório (mata-mata / chave olímpica)" },
    { valor: "MISTO", rotulo: "Sistema Misto ou Combinado (grupos + mata-mata)" },
  ],
  SETS: [
    { valor: "RODIZIO", rotulo: "Sistema de Rodízio (todos contra todos)" },
    { valor: "ELIMINATORIO", rotulo: "Sistema Eliminatório (mata-mata / chave olímpica)" },
    { valor: "MISTO", rotulo: "Sistema Misto ou Combinado (grupos + mata-mata)" },
  ],
  LUTA: [
    { valor: "ELIMINATORIO", rotulo: "Sistema Eliminatório (mata-mata / chave olímpica)" },
    { valor: "RODIZIO", rotulo: "Sistema de Rodízio (todos contra todos)" },
  ],
  SEM_JOGOS: [{ valor: "CLASSIFICACAO", rotulo: "Classificação por marca ou colocação" }],
};

// MARCA e "sem placar" não têm partidas: usam a mesma lista.
export function sistemasDoFormato(formato: string | null) {
  return SISTEMAS_POR_FORMATO[formato ?? ""] ?? SISTEMAS_POR_FORMATO.SEM_JOGOS;
}

export const VARIANTES_ELIMINATORIO = [
  { valor: "SIMPLES", rotulo: "Eliminatória simples (quem perde está fora)" },
  { valor: "REPESCAGEM", rotulo: "Eliminatória com repescagem (tradicional, como no judô)" },
];

export const TERCEIRO_LUGAR = [
  { valor: "DISPUTA_3LUGAR", rotulo: "Disputa de 3º lugar" },
  { valor: "DOIS_BRONZES", rotulo: "Sem disputa: os dois semifinalistas perdedores dividem o 3º (dois bronzes)" },
  { valor: "SEM_DISPUTA", rotulo: "Sem 3º lugar" },
];

const inteiroOpcional = (rotulo: string) =>
  z.preprocess(
    (v) => (v === "" || v == null ? undefined : v),
    z.coerce
      .number({ error: `${rotulo}: informe um número` })
      .int(`${rotulo}: use números inteiros`)
      .min(0, `${rotulo}: não pode ser negativo`)
      .optional()
  );

const decimalOpcional = (rotulo: string) =>
  z.preprocess(
    (v) => (v === "" || v == null ? undefined : typeof v === "string" ? v.replace(",", ".") : v),
    z.coerce
      .number({ error: `${rotulo}: informe um número` })
      .min(0, `${rotulo}: não pode ser negativo`)
      .max(999.99, `${rotulo}: valor alto demais`)
      .optional()
  );

const textoOpcional = z.preprocess((v) => (v === "" || v == null ? undefined : v), z.string().optional());

export const torneioSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome do torneio").max(80, "O nome é muito longo"),
  sistemaDisputa: z.string().min(1, "Escolha o sistema de disputa"),
  absoluto: z.preprocess((v) => v === "on" || v === "true", z.boolean()),
  turnos: inteiroOpcional("Turnos"),
  variante: textoOpcional,
  terceiroLugar: textoOpcional,
  jogosPorSerie: inteiroOpcional("Jogos por confronto"),
  jogosPorSerieFinal: inteiroOpcional("Jogos por confronto na final"),
  numTempos: inteiroOpcional("Número de tempos"),
  duracaoTempoMin: inteiroOpcional("Duração do tempo"),
  intervaloTemposMin: inteiroOpcional("Intervalo entre os tempos"),
  duracaoJogoMin: inteiroOpcional("Duração do jogo"),
  intervaloJogosMin: inteiroOpcional("Intervalo entre os jogos"),
  chaves: inteiroOpcional("Grupos"),
  classificadosPorGrupo: inteiroOpcional("Classificados por grupo"),
  pontosVit: inteiroOpcional("Pontos da vitória"),
  pontosEmp: inteiroOpcional("Pontos do empate"),
  pontosDer: inteiroOpcional("Pontos da derrota"),
  setsParaVencer: inteiroOpcional("Sets para vencer"),
  pontosPorSet: inteiroOpcional("Pontos por set"),
  pontosSetDecisivo: inteiroOpcional("Pontos do set decisivo"),
  diferencaMinima: inteiroOpcional("Diferença mínima"),
  woPlacarVencedor: inteiroOpcional("Placar do W.O. (vencedor)"),
  woPlacarPerdedor: inteiroOpcional("Placar do W.O. (perdedor)"),
  woPontosSetVencedor: inteiroOpcional("Pontos por set no W.O."),
  pesoMin: decimalOpcional("Peso mínimo"),
  pesoMax: decimalOpcional("Peso máximo"),
    // RN157: demais critérios da categoria.
  naipe: z.preprocess(
    (v) => (v === "" || v == null ? undefined : v),
    z.enum(["MASCULINO", "FEMININO", "MISTO"]).optional()
  ),
  idadeMin: inteiroOpcional("Idade mínima"),
  idadeMax: inteiroOpcional("Idade máxima"),
  faixas: listaDeTexto,
});
