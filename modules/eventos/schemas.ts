import { z } from "zod";

// Campo numérico opcional: vazio vira "sem valor".
const inteiroOpcional = z.preprocess(
  (v) => (v === "" || v == null ? undefined : v),
  z.coerce.number().int("Use números inteiros").positive("Use números maiores que zero").optional()
);

const data = z.string().refine((v) => !Number.isNaN(Date.parse(v)), "Informe uma data válida");

// Data opcional: vazio vira "sem valor".
const dataOpcional = z.preprocess(
  (v) => (v === "" || v == null ? undefined : v),
  data.optional()
);

export const eventoSchema = z
  .object({
    nome: z.string().trim().min(3, "Informe o nome do evento"),
    dataInicio: data,
    dataFim: data,
    // RN151: prazo de inscrições (vazio = sem prazo definido).
    inscricaoInicio: dataOpcional,
    inscricaoFim: dataOpcional,
    // RN191/RN195: conferência das inscrições (facultativa) e prazo de recurso.
    conferenciaInicio: dataOpcional,
    conferenciaFim: dataOpcional,
    recursoFim: dataOpcional,
    // RN150: o que acontece com o atleta acima do limite de peso na pesagem.
    pesoExcedente: z.enum(["SUBIR_CATEGORIA", "ELIMINAR"]).default("SUBIR_CATEGORIA"),
    // RN225: o evento pede dados bancários dos atletas (ex.: bolsas). Caixa marcada chega como "on".
    pedeDadosBancarios: z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean()),
    idadeLimite: inteiroOpcional,
    maxModTotal: inteiroOpcional,
    maxModInd: inteiroOpcional,
    maxModCol: inteiroOpcional,
  })
  .refine((d) => d.dataFim >= d.dataInicio, {
    message: "A data final não pode ser anterior à data inicial",
    path: ["dataFim"],
  })
  .refine((d) => !d.inscricaoInicio || !d.inscricaoFim || d.inscricaoFim >= d.inscricaoInicio, {
    message: "O fim das inscrições não pode ser anterior ao início",
    path: ["inscricaoFim"],
  })
  .refine((d) => !d.inscricaoFim || d.inscricaoFim <= d.dataFim, {
    message: "As inscrições não podem terminar depois do fim do evento",
    path: ["inscricaoFim"],
  })
  // Conferência: início e fim juntos (ou nenhum dos dois).
  .refine((d) => Boolean(d.conferenciaInicio) === Boolean(d.conferenciaFim), {
    message: "Informe o início e o fim da conferência, ou deixe os dois em branco",
    path: ["conferenciaFim"],
  })
  .refine((d) => !d.conferenciaInicio || !d.conferenciaFim || d.conferenciaFim >= d.conferenciaInicio, {
    message: "O fim da conferência não pode ser anterior ao início",
    path: ["conferenciaFim"],
  })
  .refine((d) => !d.conferenciaInicio || !d.inscricaoFim || d.conferenciaInicio >= d.inscricaoFim, {
    message: "A conferência só pode começar depois do fim das inscrições",
    path: ["conferenciaInicio"],
  })
  .refine((d) => !d.recursoFim || Boolean(d.conferenciaFim), {
    message: "O prazo de recurso só existe quando há conferência",
    path: ["recursoFim"],
  })
  .refine((d) => !d.recursoFim || !d.conferenciaFim || d.recursoFim >= d.conferenciaFim, {
    message: "O prazo de recurso não pode terminar antes da conferência",
    path: ["recursoFim"],
  })
  .refine((d) => !(d.recursoFim ?? d.conferenciaFim) || (d.recursoFim ?? d.conferenciaFim)! <= d.dataFim, {
    message: "A conferência e o recurso não podem terminar depois do fim do evento",
    path: ["recursoFim"],
  });
