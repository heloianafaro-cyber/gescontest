   import { hojeISO } from "./idade";
   import { z } from "zod";

   function cpfValido(valor: string) {
     const d = valor.replace(/\D/g, "");
     if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
     const dv = (n: number) => {
       let soma = 0;
       for (let i = 0; i < n; i++) soma += Number(d[i]) * (n + 1 - i);
       const r = (soma * 10) % 11;
       return r === 10 ? 0 : r;
     };
     return dv(9) === Number(d[9]) && dv(10) === Number(d[10]);
   }

   export const cadastroSchema = z.object({
     nome: z.string().trim().min(3, "Informe o nome completo"),
     email: z.email("E-mail inválido"),
     senha: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres"),
     celular: z.string().trim().min(10, "Informe o celular com DDD"),
     cpf: z.string().refine(cpfValido, "CPF inválido"),
     matricula: z.string().trim().min(1, "Informe a matrícula"),
          dataNascimento: z
       .string()
       .refine(
         (v) => !Number.isNaN(Date.parse(v)) && v >= "1900-01-01" && v <= hojeISO(),
         "Informe uma data de nascimento válida"
       ),
   });

   export const loginSchema = z.object({
     email: z.email("E-mail inválido"),
     senha: z.string().min(1, "Informe a senha"),
   });