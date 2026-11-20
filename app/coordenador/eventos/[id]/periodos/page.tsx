import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { exigirCoordenadorDoEvento } from "@/modules/eventos/acesso";
import { adicionarPeriodo, removerPeriodo } from "@/modules/eventos/periodos";
import { FormPeriodo } from "@/components/form-periodo";
import { BotaoConfirmar } from "@/components/botao-confirmar";

export const instant = false;

export default async function Periodos({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const eventoId = Number(id);
  if (!Number.isInteger(eventoId)) notFound();

  const { evento } = await exigirCoordenadorDoEvento(eventoId);
  const periodos = await prisma.periodoJogos.findMany({
    where: { eventoId },
    orderBy: { horaInicio: "asc" },
  });

  return (
    <main className="space-y-6 p-8">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Períodos dos jogos: {evento.nome}</h1>
        <Link href={`/coordenador/eventos/${eventoId}/editar`} className="text-sm underline">
          Voltar ao evento
        </Link>
        <p className="text-sm text-muted-foreground">
          São as faixas de horário em que os jogos podem acontecer. A agenda usa estes períodos.
        </p>
      </div>

      {periodos.length === 0 && <p>Nenhum período cadastrado.</p>}

      <ul className="max-w-md space-y-2">
        {periodos.map((p) => (
          <li key={p.id} className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="font-medium">{p.nome}</p>
              <p className="text-sm">
                {p.horaInicio} às {p.horaFim}
                {p.maxJogosPorLocal ? ` · até ${p.maxJogosPorLocal} jogos por local` : ""}
              </p>
            </div>
            <form action={removerPeriodo.bind(null, eventoId)}>
              <input type="hidden" name="periodoId" value={p.id} />
              <BotaoConfirmar mensagem={`Remover o período "${p.nome}"?`}>Remover</BotaoConfirmar>
            </form>
          </li>
        ))}
      </ul>

      <FormPeriodo acao={adicionarPeriodo.bind(null, eventoId)} />
    </main>
  );
}