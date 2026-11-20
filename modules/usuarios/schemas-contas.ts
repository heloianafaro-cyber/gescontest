import { z } from "zod";

export const contaSchema = z.object({
  nome: z.string().trim().min(3, "Informe o nome completo").max(100, "O nome é muito longo"),
  email: z.string().trim().toLowerCase().pipe(z.email("Informe um e-mail válido")),
  celular: z.preprocess((v) => (v === "" || v == null ? undefined : v), z.string().trim().max(20).optional()),
  delegacaoId: z.preprocess(
    (v) => (v === "" || v == null ? undefined : v),
    z.coerce.number().int().positive().optional()
  ),
});

export const trocaSenhaSchema = z
  .object({
    senhaAtual: z.string().min(1, "Informe a senha atual"),
    novaSenha: z.string().min(8, "A nova senha precisa ter pelo menos 8 caracteres").max(128, "Senha longa demais"),
    confirmacao: z.string(),
  })
  .refine((d) => d.novaSenha === d.confirmacao, {
    message: "A confirmação não é igual à nova senha",
    path: ["confirmacao"],
  })
  .refine((d) => d.novaSenha !== d.senhaAtual, {
    message: "A nova senha precisa ser diferente da provisória",
    path: ["novaSenha"],
  });