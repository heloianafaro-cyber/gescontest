import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirCoordenadorDoEvento } from "@/modules/eventos/acesso";
import { listarRecursos } from "@/modules/recursos/lista-db";
import { rotuloDoJogo } from "@/modules/recursos/consultas-db";

export const instant = false;

const status = { ABERTO: "Em análise", DEFERIDO: "Deferido", INDEFERIDO: "Indeferido" } as const;
const cor = { ABERTO: "text-amber-700", DEFERIDO: "text-green-700", INDEFERIDO: "text-red-600" } as const;
const filtros = ["TODOS", "ABERTO", "DEFERIDO", "INDEFERIDO"] as const;

export default async function RecursosDoEvento({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ status?: string; ok?: string }>;
}) {
  const eventoId = Number((await params).id);
  if (!Number.isInteger(eventoId)) notFound();
  const { evento } = await exigirCoordenadorDoEvento(eventoId);
  const q = await searchParams;
  const filtro = filtros.find((f) => f === q.status) ?? "TODOS";

  const recursos = await listarRecursos({ eventoId, status: filtro === "TODOS" ? undefined : filtro });

  return (
    <main className="space-y-6 p-8">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Recursos de jogos · {evento.nome}</h1>
        <p className="text-sm text-muted-foreground">
          Só o coordenador decide. O Staff vê os recursos, mas não decide. Os recursos nunca são públicos.
        </p>
        <Link href={`/coordenador/eventos/${evento.id}/editar`} className="text-sm underline">Voltar ao evento</Link>
        {q.ok && <p className="text-sm text-green-700">Decisão registrada. Os envolvidos foram avisados.</p>}
      </div>

      <nav className="flex gap-4 text-sm">
        {filtros.map((f) => (
          <Link
            key={f}
            href={`/coordenador/eventos/${evento.id}/recursos?status=${f}`}
            className={f === filtro ? "font-bold underline" : "underline"}
          >
            {f === "TODOS" ? "Todos" : status[f]}
          </Link>
        ))}
      </nav>

      {recursos.length === 0 ? (
        <p className="text-sm">Nenhum recurso {filtro === "TODOS" ? "neste evento" : "com este estado"}.</p>
      ) : (
        <ul className="divide-y rounded-md border text-sm">
          {recursos.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-4 p-3">
              <div>
                <p className="font-medium">
                  {rotuloDoJogo({ numero: r.disputa.numero, fase: r.disputa.fase, dataHora: r.disputa.dataHora, partida: r.disputa.partida })}
                </p>
                <p className="text-xs text-muted-foreground">
                  {r.disputa.torneio.modalidade.nome} · {r.equipe.delegacao.nome}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <span className={cor[r.status]}>{status[r.status]}</span>
                <Link href={`/coordenador/eventos/${evento.id}/recursos/${r.id}`} className="underline">
                  {r.status === "ABERTO" ? "Analisar" : "Ver"}
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
