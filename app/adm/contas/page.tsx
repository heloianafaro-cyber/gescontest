import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { exigirPerfil } from "@/modules/usuarios/sessao";
import { criarProf, criarAdm, redefinirSenha, alternarAtivo } from "@/modules/usuarios/contas";
import { FormConta } from "@/components/form-conta";
import { FormRedefinir } from "@/components/form-redefinir";
import { BotaoConfirmar } from "@/components/botao-confirmar";

export const instant = false;

const POR_PAGINA = 30;

const ROTULOS: Record<string, string> = {
  PROF: "Prof/Coordenador",
  STAFF: "Staff",
  TECNICO: "Chefe de delegação",
  ATLETA: "Atleta",
  ADM: "Administrador",
};

// RN241: o Administrador só gerencia contas. Aqui aparecem nome, e-mail, perfil e situação,
// nunca dados de atletas, resultados ou dados bancários.
export default async function ContasAdm({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tipo?: string; pagina?: string; ok?: string; erro?: string }>;
}) {
  const sessao = await exigirPerfil("ADM");
  const meuId = Number(sessao.user.id);

  const { q = "", tipo = "", pagina = "1", ok, erro } = await searchParams;
  const busca = q.trim();
  const tipoValido = Object.keys(ROTULOS).includes(tipo) ? tipo : "";
  const numeroPagina = Math.max(1, Number.parseInt(pagina, 10) || 1);

  const modo = "insensitive" as const;
  const where = {
    ...(tipoValido ? { tipo: tipoValido as "PROF" | "STAFF" | "TECNICO" | "ATLETA" | "ADM" } : {}),
    ...(busca
      ? {
          OR: [
            { nome: { contains: busca, mode: modo } },
            { email: { contains: busca, mode: modo } },
          ],
        }
      : {}),
  };

  const [total, usuarios] = await Promise.all([
    prisma.usuario.count({ where }),
    prisma.usuario.findMany({
      where,
      orderBy: [{ tipo: "asc" }, { nome: "asc" }],
      skip: (numeroPagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
      select: { id: true, nome: true, email: true, tipo: true, ativo: true, precisaTrocarSenha: true },
    }),
  ]);
  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA));

  const link = (p: number) => {
    const params = new URLSearchParams();
    if (busca) params.set("q", busca);
    if (tipoValido) params.set("tipo", tipoValido);
    if (p > 1) params.set("pagina", String(p));
    const texto = params.toString();
    return texto ? `/adm/contas?${texto}` : "/adm/contas";
  };

  return (
    <main className="space-y-6 p-8">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Contas de usuários</h1>
        <Link href="/adm" className="text-sm underline">
          Voltar
        </Link>
      </div>

      {ok && <p className="max-w-xl rounded-md border border-green-600 p-3 text-sm">{ok}</p>}
      {erro && <p className="max-w-xl rounded-md border border-red-600 p-3 text-sm">{erro}</p>}

      <form method="get" className="flex max-w-2xl flex-wrap items-end gap-3">
        <label className="space-y-1 text-sm">
          <span className="block">Buscar por nome ou e-mail</span>
          <input
            name="q"
            defaultValue={busca}
            className="h-9 w-64 rounded-md border border-input bg-transparent px-3"
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="block">Perfil</span>
          <select
            name="tipo"
            defaultValue={tipoValido}
            className="h-9 rounded-md border border-input bg-transparent px-3"
          >
            <option value="">Todos</option>
            {Object.entries(ROTULOS).map(([valor, rotulo]) => (
              <option key={valor} value={valor}>
                {rotulo}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="h-9 rounded-md border px-4 text-sm font-medium hover:bg-muted">
          Buscar
        </button>
      </form>

      <p className="text-sm text-muted-foreground">
        {total} {total === 1 ? "conta" : "contas"}
        {totalPaginas > 1 ? ` · página ${numeroPagina} de ${totalPaginas}` : ""}
      </p>

      {usuarios.length === 0 && <p>Nenhuma conta encontrada.</p>}
      <ul className="max-w-2xl space-y-3">
        {usuarios.map((u) => {
          const euMesmo = u.id === meuId;
          return (
            <li key={u.id} className="space-y-2 rounded-lg border p-4">
              <p className="font-medium">
                {u.nome}
                {euMesmo && <span className="ml-2 text-xs font-normal text-muted-foreground">(você)</span>}
              </p>
              <p className="text-sm">
                {u.email} · {ROTULOS[u.tipo] ?? u.tipo}
                {!u.ativo && <span className="ml-2 font-medium text-red-600">· conta desativada</span>}
                {u.precisaTrocarSenha && " · ainda não trocou a senha provisória"}
              </p>
              {!euMesmo && (
                <div className="flex flex-wrap items-start gap-4">
                  <FormRedefinir acao={redefinirSenha} usuarioId={u.id} />
                  <form action={alternarAtivo}>
                    <input type="hidden" name="usuarioId" value={u.id} />
                    <input type="hidden" name="ativar" value={u.ativo ? "0" : "1"} />
                    <input type="hidden" name="volta" value="/adm/contas" />
                    {u.ativo ? (
                      <BotaoConfirmar mensagem={`Desativar a conta de ${u.nome}? Ela perde o acesso na hora, mas o histórico fica.`}>
                        Desativar conta
                      </BotaoConfirmar>
                    ) : (
                      <BotaoConfirmar mensagem={`Reativar a conta de ${u.nome}?`}>Reativar conta</BotaoConfirmar>
                    )}
                  </form>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {totalPaginas > 1 && (
        <nav className="flex gap-4 text-sm">
          {numeroPagina > 1 && (
            <Link href={link(numeroPagina - 1)} className="underline">
              ← Anterior
            </Link>
          )}
          {numeroPagina < totalPaginas && (
            <Link href={link(numeroPagina + 1)} className="underline">
              Próxima →
            </Link>
          )}
        </nav>
      )}

      <div className="max-w-xl space-y-3">
        <h2 className="font-medium">Novo Prof/Coordenador</h2>
        <FormConta acao={criarProf} rotuloBotao="Criar conta de Prof" />
      </div>

      <div className="max-w-xl space-y-3">
        <h2 className="font-medium">Novo administrador</h2>
        <p className="text-sm text-muted-foreground">
          O administrador só gerencia contas: não vê dados de eventos, atletas nem dados bancários. A senha provisória
          aparece uma única vez e a troca é obrigatória no primeiro acesso.
        </p>
        <FormConta acao={criarAdm} rotuloBotao="Criar conta de administrador" />
      </div>
    </main>
  );
}
