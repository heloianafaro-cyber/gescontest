import Link from "next/link";
import { exigirPerfil } from "@/modules/usuarios/sessao";
import { prisma } from "@/lib/prisma";
import { calcularIdade } from "@/modules/usuarios/idade";
import { PaginaProvisoria } from "@/components/pagina-provisoria";
import { EnviarFicha } from "@/components/enviar-ficha";

export const instant = false;

export default async function Atleta() {
  const sessao = await exigirPerfil("ATLETA");
  const atletaId = Number(sessao.user.id);
  const [atleta, dadoBancario, pedemBanco] = await Promise.all([
    prisma.usuario.findUnique({ where: { id: atletaId } }),
    prisma.dadoBancario.findUnique({ where: { usuarioId: atletaId }, select: { usuarioId: true } }),
    // RN225: eventos em que o atleta está inscrito e que pedem dados bancários.
    prisma.equipeAtleta.count({
      where: { atletaId, equipe: { modalidade: { evento: { pedeDadosBancarios: true } } } },
    }),
  ]);

  const menor = atleta?.dataNascimento ? calcularIdade(atleta.dataNascimento) < 18 : false;

  let aviso = "";
  if (menor && !atleta?.fichaArquivo) {
    aviso = "Você é menor de 18 anos: envie a ficha de autorização para concluir o cadastro.";
  } else if (atleta?.fichaStatus === "PENDENTE") {
    aviso = "Sua ficha foi enviada e está em análise.";
  } else if (atleta?.fichaStatus === "RECUSADA") {
    aviso = `Sua ficha foi recusada. Motivo: ${atleta.fichaMotivoRecusa ?? "não informado"}. Envie uma nova ficha.`;
  } else if (atleta?.fichaStatus === "APROVADA") {
    aviso = "Sua ficha foi aprovada.";
  }

  const podeEnviar = (menor && !atleta?.fichaArquivo) || atleta?.fichaStatus === "RECUSADA";
  const pendenteBanco = pedemBanco > 0 && !dadoBancario;

  return (
    <>
      <PaginaProvisoria titulo="Área do atleta" nome={sessao.user.name} />
      <p className="px-8 pt-2 text-sm">
        <Link href="/atleta/inscricoes" className="underline">Minhas inscrições</Link>
      </p>
      {aviso && <p className="px-8 text-amber-700">{aviso}</p>}
      {podeEnviar && <EnviarFicha />}
      {pendenteBanco && (
        <p className="px-8 pt-2 text-amber-700">
          Um evento em que você está inscrito pede dados bancários.{" "}
          <Link href="/atleta/dados-bancarios" className="underline">Informar agora</Link>
        </p>
      )}
      {(dadoBancario || pedemBanco > 0) && (
        <p className="px-8 pt-2 text-sm">
          <Link href="/atleta/dados-bancarios" className="underline">Dados bancários</Link>
        </p>
      )}
    </>
  );
}
