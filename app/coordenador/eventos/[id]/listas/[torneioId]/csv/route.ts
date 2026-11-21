import { exigirCoordenadorDoEvento } from "@/modules/eventos/acesso";
import { carregarLista } from "@/modules/eventos/listas";
import { listaParaCsv, nomeDeArquivo } from "@/modules/eventos/listas-csv";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; torneioId: string }> }
) {
  const p = await params;
  const eventoId = Number(p.id);
  const torneioId = Number(p.torneioId);
  if (!Number.isInteger(eventoId) || !Number.isInteger(torneioId)) {
    return new Response("Não encontrado", { status: 404 });
  }
  await exigirCoordenadorDoEvento(eventoId);

  const lista = await carregarLista(eventoId, torneioId);
  if (!lista) return new Response("Não encontrado", { status: 404 });

  return new Response(listaParaCsv(lista), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nomeDeArquivo(lista)}"`,
      "Cache-Control": "no-store",
    },
  });
}
