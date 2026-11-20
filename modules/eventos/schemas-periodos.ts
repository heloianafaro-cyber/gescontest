import { z } from "zod";

const hora = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use o formato HH:MM, ex.: 08:00");

export const periodoSchema = z
  .object({
    nome: z.string().trim().min(2, "Informe o nome do período").max(40, "O nome é muito longo"),
    horaInicio: hora,
    horaFim: hora,
    maxJogosPorLocal: z.preprocess(
      (v) => (v === "" || v == null ? undefined : v),
      z.coerce
        .number({ error: "Máximo de jogos: informe um número" })
        .int("Máximo de jogos: use números inteiros")
        .min(1, "Máximo de jogos: o mínimo é 1")
        .optional()
    ),
  })
  .refine((d) => d.horaFim > d.horaInicio, {
    message: "O horário final precisa ser depois do inicial",
    path: ["horaFim"],
  });