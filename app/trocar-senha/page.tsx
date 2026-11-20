import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rotaInicial } from "@/modules/usuarios/sessao";
import { FormTrocarSenha } from "@/components/form-trocar-senha";
import { BotaoSair } from "@/components/botao-sair";

export const instant = false;

export default async function TrocarSenha() {
  const sessao = await auth.api.getSession({ headers: await headers() });
  if (!sessao) redirect("/login");

  const conta = await prisma.usuario.findUnique({
    where: { id: Number(sessao.user.id) },
    select: { precisaTrocarSenha: true },
  });
  if (!conta?.precisaTrocarSenha) redirect(rotaInicial[sessao.user.tipo as string] ?? "/painel");

  return (
    <main className="space-y-4 p-8">
      <h1 className="text-xl font-semibold">Troque a sua senha</h1>
      <p className="max-w-md text-sm">
        Este é o seu primeiro acesso, com uma senha provisória. Escolha uma senha nova para continuar.
      </p>
      <FormTrocarSenha />
      <BotaoSair />
    </main>
  );
}