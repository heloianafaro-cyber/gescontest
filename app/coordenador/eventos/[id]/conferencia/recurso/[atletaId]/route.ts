import { prisma } from "@/lib/prisma";
import { linkTemporario } from "@/lib/storage";
import { exigirCoordenadorDoEvento } from "@/modules/eventos/acesso";

// PDF do recurso: só os coordenadores do evento abrem. O arquivo continua privado; o link vale 2 minutos.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; atletaId: string }> }
) {
  const { id, atletaId } = await params;
  const eventoId = Number(id);
  const atleta = Number(atletaId);
  if (!Number.isInteger(eventoId) || !Number.isInteger(atleta)) {
    return new Response("Não encontrado", { status: 404 });
  }

  await exigirCoordenadorDoEvento(eventoId);

  const imp = await prisma.impugnacao.findUnique({
    where: { eventoId_atletaId: { eventoId, atletaId: atleta } },
    select: { recursoArquivo: true },
  });
  if (!imp?.recursoArquivo) return new Response("Não encontrado", { status: 404 });

  return Response.redirect(await linkTemporario(imp.recursoArquivo, 120), 302);
}
