import { notFound } from "next/navigation";
import { exigirPerfil } from "@/modules/usuarios/sessao";
import { abrirDados } from "@/modules/dados-bancarios/consultas-db";
import { DadosBancariosAtleta } from "@/components/dados-bancarios-atleta";

export const instant = false;

export default async function DadosDoAtletaParaChefe({
  params,
  searchParams,
}: {
  params: Promise<{ atletaId: string }>;
  searchParams: Promise<{ evento?: string; ver?: string }>;
}) {
  const sessao = await exigirPerfil("TECNICO");
  const atletaId = Number((await params).atletaId);
  const { evento, ver } = await searchParams;
  const eventoId = Number(evento);
  if (!Number.isInteger(atletaId) || !Number.isInteger(eventoId)) notFound();

  const dados = await abrirDados({
    visorId: Number(sessao.user.id),
    perfil: "TECNICO",
    atletaId,
    eventoId,
    completo: ver === "1",
  });
  if (!dados) notFound();

  return (
    <DadosBancariosAtleta
      dados={dados}
      hrefMostrar={`/tecnico/dados-bancarios/${atletaId}?evento=${eventoId}&ver=1`}
      hrefVoltar="/tecnico/dados-bancarios"
    />
  );
}
