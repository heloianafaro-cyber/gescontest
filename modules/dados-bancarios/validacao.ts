import { z } from "zod";

const texto = (min: number, max: number, msg: string) =>
  z.string().trim().min(min, msg).max(max, "Texto longo demais");

// Agência: 1 a 6 dígitos, com dígito verificador opcional (ex.: 1234 ou 1234-5).
// Conta: 1 a 12 dígitos, com dígito verificador (ex.: 12345-6; alguns bancos usam letra).
export const dadosBancariosSchema = z.object({
  banco: texto(2, 60, "Informe o banco"),
  tipoConta: z.enum(["CORRENTE", "POUPANCA"], { message: "Escolha corrente ou poupança" }),
  agencia: z
    .string()
    .trim()
    .regex(/^\d{1,6}(-?[0-9Xx])?$/, "Agência inválida (ex.: 1234 ou 1234-5)"),
  conta: z
    .string()
    .trim()
    .regex(/^\d{1,12}(-?[0-9A-Za-z])?$/, "Conta inválida (ex.: 12345-6)"),
  titular: texto(3, 100, "Informe o nome do titular da conta"),
  ciencia: z.literal("on", { message: "Marque a ciência sobre o uso dos dados" }),
});

export type DadosBancarios = z.infer<typeof dadosBancariosSchema>;
