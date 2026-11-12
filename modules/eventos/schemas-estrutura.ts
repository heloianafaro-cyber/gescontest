   import { z } from "zod";

   export const localSchema = z.object({
     nome: z.string().trim().min(2, "Informe o nome do local").max(80, "O nome é muito longo"),
   });

   export const modalidadeSchema = z
     .object({
       nome: z.string().trim().min(2, "Informe o nome da modalidade").max(80, "O nome é muito longo"),
       tipo: z.enum(["INDIVIDUAL", "COLETIVA"], { error: "Escolha o tipo da modalidade" }),
       minAtletas: z.coerce.number().int("Use números inteiros").min(1, "O mínimo de atletas é 1"),
       maxAtletas: z.coerce.number().int("Use números inteiros").min(1, "O máximo de atletas é 1"),
       // Vazio = modalidade sem placar (por marca ou colocação, como no atletismo).
       formatoPlacar: z.preprocess(
         (v) => (v === "" ? undefined : v),
         z.enum(["CORRIDO", "SETS"]).optional()
       ),
     })
     .refine((d) => d.maxAtletas >= d.minAtletas, {
       message: "O máximo de atletas não pode ser menor que o mínimo",
       path: ["maxAtletas"],
     });