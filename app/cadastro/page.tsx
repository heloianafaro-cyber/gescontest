import { prisma } from "@/lib/prisma";
import { FormCadastro } from "@/components/form-cadastro";

export const instant = false;

export default async function Cadastro() {
  const delegacoes = await prisma.delegacao.findMany({
    orderBy: { nome: "asc" },
    select: { id: true, nome: true },
  });
  return <FormCadastro delegacoes={delegacoes} />;
}