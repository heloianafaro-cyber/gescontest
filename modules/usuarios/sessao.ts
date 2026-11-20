import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const rotaInicial: Record<string, string> = {
  ATLETA: "/atleta",
  PROF: "/coordenador",
  STAFF: "/staff",
  TECNICO: "/tecnico",
  ADM: "/adm",
};

// Exige login e, se informado, um dos perfis permitidos.
export async function exigirPerfil(...perfis: string[]) {
  const sessao = await auth.api.getSession({ headers: await headers() });
  if (!sessao) redirect("/login");

  // RN142: conta com senha provisória só usa o sistema depois de trocá-la.
  const conta = await prisma.usuario.findUnique({
    where: { id: Number(sessao.user.id) },
    select: { precisaTrocarSenha: true },
  });
  if (conta?.precisaTrocarSenha) redirect("/trocar-senha");

  const tipo = sessao.user.tipo as string;
  if (perfis.length > 0 && !perfis.includes(tipo)) {
    redirect(rotaInicial[tipo] ?? "/login");
  }
  return sessao;
}