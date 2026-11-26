// lib/auth.ts
import "server-only";

import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@/lib/prisma";

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  advanced: { database: { generateId: "serial" } },
  emailAndPassword: { enabled: true },
  user: {
    modelName: "usuario",
    fields: {
      name: "nome",
      emailVerified: "emailVerificado",
      createdAt: "criadoEm",
      updatedAt: "atualizadoEm",
    },
    additionalFields: {
      tipo: { type: "string", required: true, defaultValue: "ATLETA", input: false },
      celular: { type: "string", required: false },
      cpf: { type: "string", required: false },
      matricula: { type: "string", required: false },
      dataNascimento: { type: "date", required: false },
    },
  },
  session: { modelName: "sessao" },
  account: { modelName: "conta" },
  verification: { modelName: "verificacao" },
  // RN242: conta desativada não consegue entrar (a sessão nem chega a ser criada).
  databaseHooks: {
    session: {
      create: {
        before: async (sessao) => {
          const conta = await prisma.usuario.findUnique({
            where: { id: Number(sessao.userId) },
            select: { ativo: true },
          });
          if (conta && !conta.ativo) return false;
        },
      },
    },
  },
});
