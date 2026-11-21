import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { exigirPerfil } from "@/modules/usuarios/sessao";
import { listarTorneiosDoEvento } from "@/modules/eventos/listas";
import { IndiceListas } from "@/components/indice-listas";

export const instant = false;

export default async function ListasDoEventoStaff({ params }: { params: Promise<{ eventoId: string }> }) {
  await exigirPerfil("STAFF");
  const eventoId = Number((await params).eventoId);
  if (!Number.isInteger(eventoId)) notFound();

  const evento = await prisma.evento.findUnique({ where: { id: eventoId }, select: { nome: true } });
  if (!evento) notFound();
  const torneios = await listarTorneiosDoEvento(eventoId);

  return (
    <main className="space-y-4 p-8">
      <h1 className="text-xl font-semibold">Listas de atletas — {evento.nome}</h1>
      <Link href="/staff/listas" className="text-sm underline">Voltar</Link>
      <IndiceListas torneios={torneios} base={`/staff/listas/${eventoId}`} />
    </main>
  );
}
