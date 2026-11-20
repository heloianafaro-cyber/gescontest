import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { exigirPerfil } from "@/modules/usuarios/sessao";
import { criarStaff, criarChefe, redefinirSenha } from "@/modules/usuarios/contas";
import { FormConta } from "@/components/form-conta";
import { FormRedefinir } from "@/components/form-redefinir";

export const instant = false;

export default async function Contas() {
  await exigirPerfil("PROF");

  const [staff, chefes, delegacoes] = await Promise.all([
    prisma.usuario.findMany({ where: { tipo: "STAFF" }, orderBy: { nome: "asc" } }),
    prisma.usuario.findMany({ where: { tipo: "TECNICO" }, orderBy: { nome: "asc" }, include: { delegacao: true } }),
    prisma.delegacao.findMany({ orderBy: { nome: "asc" } }),
  ]);
  const opcoes = delegacoes.map((d) => ({ id: d.id, nome: d.nome }));

  return (
    <main className="space-y-8 p-8">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Contas de Staff e Chefes de delegação</h1>
        <Link href="/coordenador" className="text-sm underline">Voltar</Link>
      </div>

      <section className="space-y-3">
        <h2 className="font-medium">Staff</h2>
        {staff.length === 0 && <p>Nenhum Staff cadastrado.</p>}
        <ul className="max-w-xl space-y-3">
          {staff.map((u) => (
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
        <h3 className="text-sm font-medium">Novo Staff</h3>
        <FormConta acao={criarStaff} rotuloBotao="Criar conta de Staff" />
      </section>

      <section className="space-y-3">
        <h2 className="font-medium">Chefes de delegação</h2>
        {chefes.length === 0 && <p>Nenhum chefe de delegação cadastrado.</p>}
        <ul className="max-w-xl space-y-3">
          {chefes.map((u) => (
            <li key={u.id} className="space-y-1 rounded-lg border p-4">
              <p className="font-medium">{u.nome}</p>
              <p className="text-sm">
                {u.email} · {u.delegacao?.nome ?? "sem delegação"}
                {u.precisaTrocarSenha && " · ainda não trocou a senha provisória"}
              </p>
              <FormRedefinir acao={redefinirSenha} usuarioId={u.id} />
            </li>
          ))}
        </ul>
        <h3 className="text-sm font-medium">Novo chefe de delegação</h3>
        {opcoes.length === 0 ? (
          <p className="text-sm">
            Cadastre antes uma delegação em{" "}
            <Link href="/coordenador/delegacoes" className="underline">Delegações</Link>.
          </p>
        ) : (
          <FormConta acao={criarChefe} rotuloBotao="Criar conta de chefe" delegacoes={opcoes} />
        )}
      </section>
    </main>
  );
}