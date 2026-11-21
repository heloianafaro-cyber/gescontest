import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { exigirCoordenadorDoEvento } from "@/modules/eventos/acesso";

export const instant = false;

const hora = (d: Date) =>
  new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Bahia", hour: "2-digit", minute: "2-digit" }).format(d);
const dia = (d: Date) =>
  new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Bahia", weekday: "long", day: "2-digit", month: "2-digit" }).format(d);

export default async function AgendaDeJogos({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string }>;
}) {
  const eventoId = Number((await params).id);
  if (!Number.isInteger(eventoId)) notFound();
  const aviso = await searchParams;
  const { evento } = await exigirCoordenadorDoEvento(eventoId);

  const disputas = await prisma.disputa.findMany({
    where: { torneio: { modalidade: { eventoId } }, partida: { isNot: null }, status: { not: "CANCELADA" } },
    orderBy: [{ dataHora: "asc" }, { id: "asc" }],
    select: {
      id: true,
      dataHora: true,
      duracaoMin: true,
      fase: true,
      status: true,
      travada: true,
      local: { select: { nome: true } },
      torneio: { select: { nome: true, modalidade: { select: { nome: true } } } },
      partida: { select: { equipeA: { select: { nome: true } }, equipeB: { select: { nome: true } } } },
    },
  });

  const comHorario = disputas.filter((d) => d.dataHora !== null);
  const semHorario = disputas.filter((d) => d.dataHora === null);

  const porDia = new Map<string, typeof comHorario>();
  for (const d of comHorario) {
    const k = dia(d.dataHora!);
    porDia.set(k, [...(porDia.get(k) ?? []), d]);
  }
  const confronto = (d: (typeof disputas)[number]) =>
    `${d.partida?.equipeA?.nome ?? "A definir"} × ${d.partida?.equipeB?.nome ?? "A definir"}`;

  return (
    <main className="space-y-6 p-8">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Agenda de jogos — {evento.nome}</h1>
        <div className="flex gap-4 text-sm">
          <Link href={`/coordenador/eventos/${eventoId}/agenda`} className="underline">Configuração</Link>
          <Link href={`/coordenador/eventos/${eventoId}/agenda/distribuir`} className="underline">Distribuir jogos</Link>
        </div>
      </div>

      {aviso.ok && <p className="text-sm text-green-700">{aviso.ok}</p>}

      {disputas.length === 0 && <p className="text-sm">Este evento ainda não tem jogos gerados.</p>}

      <div className="max-w-4xl space-y-4">
        {[...porDia.entries()].map(([d, linhas]) => (
          <section key={d} className="space-y-1">
            <h2 className="text-sm font-semibold capitalize">{d}</h2>
            <table className="w-full border-collapse text-sm">
              <tbody>
                {linhas.map((l) => (
                  <tr key={l.id} className="border-b">
                    <td className="w-28 py-1 pr-3">
                      {hora(l.dataHora!)}–{hora(new Date(l.dataHora!.getTime() + (l.duracaoMin ?? 30) * 60000))}
                    </td>
                    <td className="w-40 py-1 pr-3">{l.local?.nome ?? "—"}</td>
                    <td className="py-1 pr-3">
                      {l.torneio.modalidade.nome} — {l.torneio.nome} · {l.fase}
                    </td>
                    <td className="py-1 pr-3">{confronto(l)}</td>
                    <td className="w-24 py-1 text-xs text-muted-foreground">
                      {l.travada ? "travado" : ""} {l.status !== "AGENDADA" ? l.status.toLowerCase() : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))}
      </div>

      {semHorario.length > 0 && (
        <section className="max-w-4xl space-y-1">
          <h2 className="text-sm font-semibold">Sem horário ({semHorario.length})</h2>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {semHorario.map((d) => (
              <li key={d.id}>
                {d.torneio.modalidade.nome} — {d.torneio.nome} · {d.fase} · {confronto(d)}
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
