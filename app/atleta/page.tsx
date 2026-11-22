import { exigirPerfil } from "@/modules/usuarios/sessao";
import { prisma } from "@/lib/prisma";
import { calcularIdade } from "@/modules/usuarios/idade";
import { PaginaProvisoria } from "@/components/pagina-provisoria";
import { EnviarFicha } from "@/components/enviar-ficha";

export const instant = false;

export default async function Atleta() {
  const sessao = await exigirPerfil("ATLETA");
  const atleta = await prisma.usuario.findUnique({
    where: { id: Number(sessao.user.id) },
  });

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

  return (
    <>
      <PaginaProvisoria titulo="Área do atleta" nome={sessao.user.name} />
      {aviso && <p className="px-8 text-amber-700">{aviso}</p>}
      {podeEnviar && <EnviarFicha />}
    </>
  );
}