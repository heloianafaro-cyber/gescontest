   import { z } from "zod";

   // Campo numérico opcional: vazio vira "sem valor".
   const inteiroOpcional = z.preprocess(
     (v) => (v === "" || v == null ? undefined : v),
     z.coerce.number().int("Use números inteiros").positive("Use números maiores que zero").optional()
   );

   const data = z.string().refine((v) => !Number.isNaN(Date.parse(v)), "Informe uma data válida");

   export const eventoSchema = z
     .object({
       nome: z.string().trim().min(3, "Informe o nome do evento"),
       dataInicio: data,
       dataFim: data,
       idadeLimite: inteiroOpcional,
       maxModTotal: inteiroOpcional,
       maxModInd: inteiroOpcional,
       maxModCol: inteiroOpcional,
     })
     .refine((d) => d.dataFim >= d.dataInicio, {
       message: "A data final não pode ser anterior à data inicial",
       path: ["dataFim"],
     });