import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { exigirPerfil } from "@/modules/usuarios/sessao";
import { criarProf, redefinirSenha } from "@/modules/usuarios/contas";
import { FormConta } from "@/components/form-conta";
import { FormRedefinir } from "@/components/form-redefinir";

export const instant = false;

export default async function ContasAdm() {
  await exigirPerfil("ADM");

  const profs = await prisma.usuario.findMany({ where: { tipo: "PROF" }, orderBy: { nome: "asc" } });

  return (
    <main className="space-y-6 p-8">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Contas de Prof/Coordenador</h1>
        <Link href="/adm" className="text-sm underline">Voltar</Link>
      </div>

      {profs.length === 0 && <p>Nenhum Prof cadastrado.</p>}
      <ul className="max-w-xl space-y-3">
        {profs.map((u) => (
          <li key={u.id} className="space-y-1 rounded-lg border p-4">
            <p className="font-medium">{u.nome}</p>
            <p className="text-sm">
              {u.email}
              {u.precisaTrocarSenha && " · ainda não trocou a senha provisória"}
            </p>
            <FormRedefinir acao={redefinirSenha} usuarioId={u.id} />
          </li>
        ))}
      </ul>

      <div className="space-y-3">
        <h2 className="font-medium">Novo Prof/Coordenador</h2>
        <FormConta acao={criarProf} rotuloBotao="Criar conta de Prof" />
      </div>
    </main>
  );
}