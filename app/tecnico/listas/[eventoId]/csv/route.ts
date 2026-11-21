import { carregarListaDelegacao, delegacaoDoChefe } from "@/modules/eventos/lista-delegacao";
import { listaDelegacaoParaCsv, nomeDeArquivoDelegacao } from "@/modules/eventos/lista-delegacao-csv";

export async function GET(_req: Request, { params }: { params: Promise<{ eventoId: string }> }) {
  const eventoId = Number((await params).eventoId);
  if (!Number.isInteger(eventoId)) return new Response("Não encontrado", { status: 404 });

  const delegacao = await delegacaoDoChefe();
  if (!delegacao) return new Response("Não encontrado", { status: 404 });

  const lista = await carregarListaDelegacao(eventoId, delegacao);
  if (!lista) return new Response("Não encontrado", { status: 404 });

  return new Response(listaDelegacaoParaCsv(lista), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nomeDeArquivoDelegacao(lista)}"`,
      "Cache-Control": "no-store",
    },
  });
}
