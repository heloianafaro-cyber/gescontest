import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirCoordenadorDoEvento } from "@/modules/eventos/acesso";
import { listarRecursos } from "@/modules/recursos/lista-db";
import { decidirRecurso } from "@/modules/recursos/acoes-decisao";
import { RecursoDetalhe } from "@/components/recurso-detalhe";
import { FormDecisaoRecurso } from "@/components/form-decisao-recurso";

export const instant = false;

export default async function AnalisarRecurso({ params }: { params: Promise<{ id: string; recursoId: string }> }) {
  const { id, recursoId: rid } = await params;
  const eventoId = Number(id);
  const recursoId = Number(rid);
  if (!Number.isInteger(eventoId) || !Number.isInteger(recursoId)) notFound();
  await exigirCoordenadorDoEvento(eventoId);

  const recurso = (await listarRecursos({ eventoId })).find((r) => r.id === recursoId);
  if (!recurso) notFound();
  const t = recurso.disputa;

  return (
    <main className="space-y-6 p-8">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Recurso</h1>
        <Link href={`/coordenador/eventos/${eventoId}/recursos`} className="text-sm underline">Voltar</Link>
      </div>

      <div className="max-w-xl">
        <RecursoDetalhe r={recurso} />
      </div>

      <p className="text-sm">
        <Link
          href={`/coordenador/eventos/${eventoId}/modalidades/${t.torneio.modalidadeId}/torneios/${t.torneioId}/jogos`}
          className="underline"
        >
          Abrir os jogos deste torneio (para corrigir ou anular o resultado)
        </Link>
      </p>

      {recurso.status === "ABERTO" && (
        <section className="space-y-3">
          <h2 className="font-medium">Decidir</h2>
          <FormDecisaoRecurso acao={decidirRecurso.bind(null, eventoId, recursoId)} />
        </section>
      )}
    </main>
  );
}
