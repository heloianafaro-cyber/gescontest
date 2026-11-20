import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { exigirPerfil } from "@/modules/usuarios/sessao";
import { resumoResultado, termos } from "@/modules/torneios/exibicao";

export const instant = false;

const rotulo: Record<string, string> = {
  AGENDADA: "Agendada",
  EM_ANDAMENTO: "Em andamento",
  ENCERRADA: "Encerrada",
  WO: "W.O.",
  CANCELADA: "Cancelada",
  ANULADA: "Anulada",
};

export default async function JogosDoEvento({ params }: { params: Promise<{ eventoId: string }> }) {
  await exigirPerfil("STAFF");
  const eventoId = Number((await params).eventoId);

  const evento = await prisma.evento.findUnique({ where: { id: eventoId }, select: { id: true, nome: true } });
  if (!evento) notFound();

  const torneios = await prisma.torneio.findMany({
    where: { modalidade: { eventoId }, disputas: { some: {} } },
    orderBy: [{ modalidade: { nome: "asc" } }, { nome: "asc" }],
    include: {
      modalidade: { select: { nome: true, formatoPlacar: true } },
      disputas: {
        orderBy: [{ numero: "asc" }, { id: "asc" }],
        include: {
          partida: {
            include: { equipeA: { select: { nome: true } }, equipeB: { select: { nome: true } } },
          },
        },
      },
    },
  });

  const nome = (e: { nome: string } | null | undefined) => e?.nome ?? "a definir";

  return (
    <main className="space-y-6 p-8">
      <h1 className="text-xl font-semibold">Jogos e combates · {evento.nome}</h1>
      <Link href="/staff/jogos" className="text-sm underline">Voltar</Link>

      {torneios.map((t) => (
        <section key={t.id} className="space-y-2">
          <h2 className="font-medium">{t.modalidade.nome} · {t.nome}</h2>
          <ul className="max-w-2xl space-y-1">
            {t.disputas.map((d) => {
              const p = d.partida;
              const tm = termos(t.modalidade.formatoPlacar);
              const resumo = resumoResultado(t.modalidade.formatoPlacar, d.status, p, p?.equipeA?.nome, p?.equipeB?.nome);
              const pronto = p?.equipeAId && p?.equipeBId && d.status !== "CANCELADA";
              return (
                <li key={d.id} className="flex items-center justify-between rounded-lg border p-2 text-sm">
                  <div>
                    <span className="mr-2 text-xs text-muted-foreground">
                      {d.fase}{d.serie ? ` · ${tm.jogo} ${d.jogoNaSerie}` : ""}
                    </span>
                    {nome(p?.equipeA)} <span className="text-muted-foreground">x</span> {nome(p?.equipeB)}
                    {resumo && <span className="ml-2 font-medium">{resumo}</span>}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">{rotulo[d.status] ?? d.status}</span>
                    {pronto && (
                      <Link href={`/staff/jogos/${eventoId}/${d.id}`} className="underline">
                        {d.status === "ENCERRADA" || d.status === "WO" ? "Corrigir" : "Registrar"}
                      </Link>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </main>
  );
}
