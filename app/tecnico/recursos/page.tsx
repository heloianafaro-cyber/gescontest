import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { exigirPerfil } from "@/modules/usuarios/sessao";
import { rotuloDoJogo, selecaoDoJogo } from "@/modules/recursos/consultas-db";
import { prazoEncerrado } from "@/modules/recursos/regras";

export const instant = false;

const rotuloStatus = { ABERTO: "Em análise", DEFERIDO: "Deferido", INDEFERIDO: "Indeferido" } as const;

export default async function RecursosDoChefe({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  const sessao = await exigirPerfil("TECNICO");
  const { ok } = await searchParams;
  const eu = await prisma.usuario.findUnique({ where: { id: Number(sessao.user.id) }, select: { delegacaoId: true } });
  const delegacaoId = eu?.delegacaoId ?? null;

  const [recursos, partidas] = delegacaoId
    ? await Promise.all([
        prisma.recursoDisputa.findMany({
          where: { equipe: { delegacaoId } },
          orderBy: { id: "desc" },
          select: {
            id: true,
            assunto: true,
            status: true,
            decisaoTexto: true,
            disputa: { select: selecaoDoJogo },
          },
        }),
        prisma.partida.findMany({
          where: {
            OR: [{ equipeA: { delegacaoId } }, { equipeB: { delegacaoId } }],
            disputa: { status: { not: "CANCELADA" } },
          },
          orderBy: { disputaId: "desc" },
          take: 60,
          select: {
            disputaId: true,
            disputa: { select: { ...selecaoDoJogo, recursos: { where: { equipe: { delegacaoId } }, select: { id: true } } } },
          },
        }),
      ])
    : [[], []];

  return (
    <main className="space-y-8 p-8">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Recursos de jogos</h1>
        <p className="text-sm text-muted-foreground">
          Abra um recurso para contestar a organização ou a atuação da arbitragem em um jogo da sua delegação. Quem decide é
          o coordenador do evento.
        </p>
        <Link href="/tecnico" className="text-sm underline">Voltar</Link>
        {ok && <p className="text-sm text-green-700">Recurso enviado. O coordenador foi avisado.</p>}
      </div>

      {!delegacaoId && <p className="text-sm">Sua conta ainda não tem delegação.</p>}

      <section className="space-y-2">
        <h2 className="font-medium">Meus recursos</h2>
        {recursos.length === 0 ? (
          <p className="text-sm text-muted-foreground">Você ainda não abriu nenhum recurso.</p>
        ) : (
          <ul className="divide-y rounded-md border text-sm">
            {recursos.map((r) => (
              <li key={r.id} className="space-y-1 p-3">
                <p className="font-medium">{rotuloDoJogo({ ...r.disputa, partida: r.disputa.partida })}</p>
                <p className="text-xs text-muted-foreground">
                  {r.disputa.torneio.modalidade.evento.nome} · {r.disputa.torneio.modalidade.nome}
                </p>
                <p>
                  <span className={r.status === "ABERTO" ? "text-amber-700" : r.status === "DEFERIDO" ? "text-green-700" : "text-red-600"}>
                    {rotuloStatus[r.status]}
                  </span>
                </p>
                {r.decisaoTexto && <p className="text-muted-foreground">Decisão: {r.decisaoTexto}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="font-medium">Jogos da minha delegação</h2>
        {partidas.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum jogo da sua delegação ainda.</p>
        ) : (
          <ul className="divide-y rounded-md border text-sm">
            {partidas.map((p) => {
              const j = p.disputa;
              const encerrado = prazoEncerrado({
                horas: j.torneio.modalidade.evento.recursoPartidaHoras,
                resultadoEm: j.resultadoEm,
                status: j.status,
              });
              return (
                <li key={p.disputaId} className="flex items-center justify-between gap-4 p-3">
                  <div>
                    <p className="font-medium">{rotuloDoJogo({ ...j, partida: j.partida })}</p>
                    <p className="text-xs text-muted-foreground">
                      {j.torneio.modalidade.evento.nome} · {j.torneio.modalidade.nome} · {j.torneio.nome}
                    </p>
                  </div>
                  {j.recursos.length > 0 ? (
                    <span className="text-muted-foreground">Recurso aberto</span>
                  ) : encerrado ? (
                    <span className="text-muted-foreground">Prazo encerrado</span>
                  ) : (
                    <Link href={`/tecnico/recursos/novo/${p.disputaId}`} className="underline">Abrir recurso</Link>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
