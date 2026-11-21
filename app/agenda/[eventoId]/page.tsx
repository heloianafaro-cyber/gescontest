import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { LinkAgenda } from "@/components/link-agenda";
import { InstrucoesAgenda } from "@/components/instrucoes-agenda";

export const instant = false;

export default async function AgendaDoEventoPublica({ params }: { params: Promise<{ eventoId: string }> }) {
  const eventoId = Number((await params).eventoId);
  if (!Number.isInteger(eventoId)) notFound();

  const evento = await prisma.evento.findUnique({
    where: { id: eventoId },
    select: {
      nome: true,
      modalidades: {
        orderBy: { nome: "asc" },
        select: {
          id: true,
          nome: true,
          mae: { select: { nome: true } },
          torneios: { orderBy: { nome: "asc" }, select: { id: true, nome: true } },
          equipes: {
            orderBy: { nome: "asc" },
            select: { id: true, nome: true, delegacao: { select: { id: true, nome: true } } },
          },
        },
      },
    },
  });
  if (!evento) notFound();

  // Delegações que têm equipes neste evento, com suas equipes.
  const delegacoes = new Map<number, { nome: string; equipes: { id: number; nome: string; modalidade: string }[] }>();
  for (const m of evento.modalidades) {
    for (const q of m.equipes) {
      const d = delegacoes.get(q.delegacao.id) ?? { nome: q.delegacao.nome, equipes: [] };
      d.equipes.push({ id: q.id, nome: q.nome, modalidade: m.nome });
      delegacoes.set(q.delegacao.id, d);
    }
  }
  const listaDelegacoes = [...delegacoes.entries()].sort((a, b) => a[1].nome.localeCompare(b[1].nome, "pt-BR"));
  const rotuloMod = (m: (typeof evento.modalidades)[number]) => (m.mae ? `${m.mae.nome} — ${m.nome}` : m.nome);
  const modalidades = [...evento.modalidades].sort((a, b) => rotuloMod(a).localeCompare(rotuloMod(b), "pt-BR"));

  return (
    <main className="space-y-6 p-8">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Agenda — {evento.nome}</h1>
        <Link href="/agenda" className="text-sm underline">Outros eventos</Link>
      </div>

      <InstrucoesAgenda />

      <section className="max-w-3xl space-y-2">
        <h2 className="font-medium">Evento inteiro</h2>
        <LinkAgenda caminho={`/calendario/evento/${eventoId}.ics`} rotulo={evento.nome} />
      </section>

      <section className="max-w-3xl space-y-2">
        <h2 className="font-medium">Por modalidade e torneio</h2>
        <div className="space-y-3">
          {modalidades.map((m) => (
            <div key={m.id} className="space-y-1">
              <LinkAgenda caminho={`/calendario/modalidade/${m.id}.ics`} rotulo={rotuloMod(m)} />
              {m.torneios.length > 1 &&
                m.torneios.map((t) => (
                  <div key={t.id} className="pl-6">
                    <LinkAgenda caminho={`/calendario/torneio/${t.id}.ics`} rotulo={t.nome} />
                  </div>
                ))}
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-3xl space-y-2">
        <h2 className="font-medium">Por delegação e equipe</h2>
        {listaDelegacoes.length === 0 && <p className="text-sm">Ainda não há equipes neste evento.</p>}
        <div className="space-y-3">
          {listaDelegacoes.map(([id, d]) => (
            <details key={id} className="space-y-1">
              <summary className="cursor-pointer text-sm font-medium">{d.nome}</summary>
              <div className="space-y-2 pl-4 pt-2">
                <LinkAgenda caminho={`/calendario/delegacao/${id}.ics`} rotulo={`Todas as equipes de ${d.nome}`} />
                {d.equipes.map((q) => (
                  <LinkAgenda key={q.id} caminho={`/calendario/equipe/${q.id}.ics`} rotulo={`${q.nome} (${q.modalidade})`} />
                ))}
              </div>
            </details>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          O calendário da delegação inclui os jogos dela em todos os eventos. Os calendários mostram só nomes de equipes.
        </p>
      </section>
    </main>
  );
}
