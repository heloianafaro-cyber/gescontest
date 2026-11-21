import { notFound } from "next/navigation";
import { carregarListaDelegacao, delegacaoDoChefe } from "@/modules/eventos/lista-delegacao";
import { contarAvisos } from "@/modules/eventos/lista-delegacao-csv";
import { ListaDelegacaoView } from "@/components/lista-delegacao";

export const instant = false;

export default async function ListaDaDelegacao({ params }: { params: Promise<{ eventoId: string }> }) {
  const eventoId = Number((await params).eventoId);
  if (!Number.isInteger(eventoId)) notFound();
  const delegacao = await delegacaoDoChefe();
  if (!delegacao) notFound();

  const lista = await carregarListaDelegacao(eventoId, delegacao);
  if (!lista) notFound();

  const avisos = contarAvisos(lista);
  return (
    <>
      {avisos > 0 && (
        <p className="mx-8 mt-8 rounded-lg border border-amber-500 p-3 text-sm font-medium text-amber-700 print:hidden">
          ⚠ {avisos} equipe(s) da sua delegação não atingiram o mínimo de inscritos. Veja os avisos abaixo.
        </p>
      )}
      <ListaDelegacaoView lista={lista} voltarHref="/tecnico/listas" csvHref={`/tecnico/listas/${eventoId}/csv`} />
    </>
  );
}
