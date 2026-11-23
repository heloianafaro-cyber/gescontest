import { notFound } from "next/navigation";
import { exigirCoordenadorDoEvento } from "@/modules/eventos/acesso";
import { abrirDados } from "@/modules/dados-bancarios/consultas-db";
import { DadosBancariosAtleta } from "@/components/dados-bancarios-atleta";

export const instant = false;

export default async function DadosDoAtletaParaCoordenador({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; atletaId: string }>;
  searchParams: Promise<{ ver?: string }>;
}) {
  const { id, atletaId: idAtleta } = await params;
  const eventoId = Number(id);
  const atletaId = Number(idAtleta);
  if (!Number.isInteger(eventoId) || !Number.isInteger(atletaId)) notFound();
  const { sessao } = await exigirCoordenadorDoEvento(eventoId);
  const { ver } = await searchParams;

  const dados = await abrirDados({
    visorId: Number(sessao.user.id),
    perfil: "PROF",
    atletaId,
    eventoId,
    completo: ver === "1",
  });
  if (!dados) notFound();

  return (
    <DadosBancariosAtleta
      dados={dados}
      hrefMostrar={`/coordenador/eventos/${eventoId}/dados-bancarios/${atletaId}?ver=1`}
      hrefVoltar={`/coordenador/eventos/${eventoId}/dados-bancarios`}
    />
  );
}
