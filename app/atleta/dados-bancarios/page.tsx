import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { exigirPerfil } from "@/modules/usuarios/sessao";
import { decifrar, mascarar } from "@/modules/seguranca/cifra";
import { apagarDadosBancarios } from "@/modules/dados-bancarios/acoes";
import { FormDadosBancarios } from "@/components/form-dados-bancarios";
import { BotaoConfirmar } from "@/components/botao-confirmar";

export const instant = false;

function resumo(dado: { agenciaCifrada: string; contaCifrada: string }) {
  try {
    return { agencia: mascarar(decifrar(dado.agenciaCifrada), 1), conta: mascarar(decifrar(dado.contaCifrada), 2) };
  } catch {
    return null;
  }
}

export default async function DadosBancarios() {
  const sessao = await exigirPerfil("ATLETA");
  const atletaId = Number(sessao.user.id);

  const [dado, vinculos] = await Promise.all([
    prisma.dadoBancario.findUnique({ where: { usuarioId: atletaId } }),
    prisma.equipeAtleta.findMany({
      where: { atletaId, equipe: { modalidade: { evento: { pedeDadosBancarios: true } } } },
      select: { equipe: { select: { modalidade: { select: { evento: { select: { id: true, nome: true } } } } } } },
    }),
  ]);

  const eventos = [...new Map(vinculos.map((v) => [v.equipe.modalidade.evento.id, v.equipe.modalidade.evento.nome])).values()];
  const mascarado = dado ? resumo(dado) : null;

  return (
    <main className="max-w-xl space-y-6 p-8">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Dados bancários</h1>
        <Link href="/atleta" className="text-sm underline">Voltar</Link>
      </div>

      {eventos.length > 0 ? (
        <p className="text-sm">
          Pedem dados bancários (por exemplo, para pagamento de bolsas): <strong>{eventos.join(", ")}</strong>.
        </p>
      ) : (
        !dado && (
          <p className="text-sm text-muted-foreground">
            Nenhum evento em que você está inscrito pede dados bancários. Não precisa informar nada.
          </p>
        )
      )}

      {dado && (
        <section className="space-y-2 rounded-md border p-4 text-sm">
          <p className="font-medium">Dados informados em {dado.informadoEm.toLocaleDateString("pt-BR", { timeZone: "UTC" })}</p>
          <p>
            {dado.banco} · {dado.tipoConta === "CORRENTE" ? "Conta corrente" : "Poupança"}
          </p>
          {mascarado ? (
            <p className="text-muted-foreground">
              Agência {mascarado.agencia} · Conta {mascarado.conta}
            </p>
          ) : (
            <p className="text-red-600">Não foi possível exibir os dados. Informe-os novamente.</p>
          )}
          <form action={apagarDadosBancarios}>
            <BotaoConfirmar mensagem="Apagar os seus dados bancários?">
              Apagar meus dados bancários
            </BotaoConfirmar>
          </form>
        </section>
      )}

      {(eventos.length > 0 || dado) && (
        <section className="space-y-3">
          <h2 className="font-medium">{dado ? "Atualizar dados" : "Informar dados"}</h2>
          <FormDadosBancarios rotuloBotao={dado ? "Atualizar" : "Salvar"} />
        </section>
      )}
    </main>
  );
}
