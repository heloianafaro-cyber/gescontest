import { exigirCoordenadorDoEvento } from "@/modules/eventos/acesso";
import { registrarComoCoordenador } from "@/modules/torneios/acoes-resultados";
import { PaginaResultado } from "@/components/pagina-resultado";

export const instant = false;

export default async function ResultadoCoordenador({
  params,
}: {
  params: Promise<{ id: string; modalidadeId: string; torneioId: string; disputaId: string }>;
}) {
  const { id, modalidadeId, torneioId, disputaId } = await params;
  const eventoId = Number(id);
  await exigirCoordenadorDoEvento(eventoId);

  return (
    <PaginaResultado
      disputaId={Number(disputaId)}
      eventoId={eventoId}
      papel="COORDENADOR"
      voltar={`/coordenador/eventos/${eventoId}/modalidades/${modalidadeId}/torneios/${torneioId}/jogos`}
      acao={registrarComoCoordenador.bind(null, eventoId, Number(disputaId))}
    />
  );
}
