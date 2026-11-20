import { prisma } from "@/lib/prisma";
import { linkTemporario } from "@/lib/storage";

// Rota pública: o arquivo continua privado no armazenamento; o sistema entrega um link que vale poucos minutos.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return new Response("Regulamento não encontrado.", { status: 404 });

  const r = await prisma.regulamento.findUnique({ where: { id }, select: { chave: true } });
  if (!r) return new Response("Regulamento não encontrado.", { status: 404 });

  return Response.redirect(await linkTemporario(r.chave, 120), 302);
}
