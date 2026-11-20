import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { exigirCoordenadorDoEvento } from "@/modules/eventos/acesso";
import { editarModalidade } from "@/modules/eventos/modalidades";
import { FormModalidade } from "@/components/form-modalidade";

export const instant = false;

export default async function EditarModalidade({
  params,
}: {
  params: Promise<{ id: string; modalidadeId: string }>;
}) {
  const { id, modalidadeId } = await params;
  const eventoId = Number(id);
  const idModalidade = Number(modalidadeId);
  if (!Number.isInteger(eventoId) || !Number.isInteger(idModalidade)) notFound();

  await exigirCoordenadorDoEvento(eventoId);

  const [modalidade, maes] = await Promise.all([
    prisma.modalidade.findFirst({ where: { id: idModalidade, eventoId } }),
    prisma.modalidadeMae.findMany({ where: { eventoId }, orderBy: { nome: "asc" } }),
  ]);
  if (!modalidade) notFound();

  return (
    <main className="space-y-4 p-8">
      <h1 className="text-xl font-semibold">Editar modalidade ou prova</h1>
      <Link href={`/coordenador/eventos/${eventoId}/modalidades`} className="text-sm underline">
        Voltar às modalidades
      </Link>
      <FormModalidade
        acao={editarModalidade.bind(null, eventoId, modalidade.id)}
        rotuloBotao="Salvar alterações"
        modalidade={modalidade}
        maes={maes.map((m) => ({ id: m.id, nome: m.nome }))}
      />
    </main>
  );
}