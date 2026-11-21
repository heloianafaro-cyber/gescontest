import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { exigirCoordenadorDoEvento } from "@/modules/eventos/acesso";
import { duracaoDoJogo } from "@/modules/agenda/distribuir";

export const instant = false;

const hora = (d: Date) =>
  new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Bahia", hour: "2-digit", minute: "2-digit" }).format(d);
const dia = (d: Date) =>
  new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Bahia", weekday: "short", day: "2-digit", month: "2-digit" }).format(d);

export default async function AgendaDeJogos({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; modalidade?: string; torneio?: string }>;
}) {
  const eventoId = Number((await params).id);
  if (!Number.isInteger(eventoId)) notFound();
  const filtro = await searchParams;
  const { evento } = await exigirCoordenadorDoEvento(eventoId);
  const modalidadeEscolhida = Number(filtro.modalidade) || null;
  const torneioEscolhido = Number(filtro.torneio) || null;

  const disputas = await prisma.disputa.findMany({
    where: { torneio: { modalidade: { eventoId } }, partida: { isNot: null }, status: { not: "CANCELADA" } },
    orderBy: [{ id: "asc" }],
    select: {
      id: true,
      dataHora: true,
      duracaoMin: true,
      fase: true,
      numero: true,
      status: true,
      travada: true,
      torneioId: true,
      local: { select: { nome: true } },
      torneio: {
        select: {
          nome: true,
          numTempos: true,
          duracaoTempoMin: true,
          intervaloTemposMin: true,
          duracaoJogoMin: true,
          modalidadeId: true,
          modalidade: { select: { nome: true, mae: { select: { nome: true } } } },
        },
      },
      partida: { select: { equipeA: { select: { nome: true } }, equipeB: { select: { nome: true } } } },
    },
  });

  type Jogo = (typeof disputas)[number];
  const duracao = (d: Jogo) =>
    duracaoDoJogo({
      numTempos: d.torneio.numTempos,
      duracaoTempoMin: d.torneio.duracaoTempoMin,
      intervaloTemposMin: d.torneio.intervaloTemposMin,
      duracaoJogoMin: d.torneio.duracaoJogoMin,
      duracaoDoJogoGravada: d.duracaoMin,
    });
  const confronto = (d: Jogo) => `${d.partida?.equipeA?.nome ?? "A definir"} × ${d.partida?.equipeB?.nome ?? "A definir"}`;

  // Agrupa: modalidade -> torneio -> jogos.
  const modalidades = new Map<number, { nome: string; torneios: Map<number, { nome: string; jogos: Jogo[] }> }>();
  for (const d of disputas) {
    const mId = d.torneio.modalidadeId;
    const nomeMod = d.torneio.modalidade.mae ? `${d.torneio.modalidade.mae.nome} — ${d.torneio.modalidade.nome}` : d.torneio.modalidade.nome;
    const m = modalidades.get(mId) ?? { nome: nomeMod, torneios: new Map() };
    const t = m.torneios.get(d.torneioId) ?? { nome: d.torneio.nome, jogos: [] };
    t.jogos.push(d);
    m.torneios.set(d.torneioId, t);
    modalidades.set(mId, m);
  }
  const listaModalidades = [...modalidades.entries()].sort((a, b) => a[1].nome.localeCompare(b[1].nome, "pt-BR"));

  // Filtro: um torneio, uma modalidade ou tudo.
  const visiveis = listaModalidades
    .map(([id, m]) => ({
      id,
      nome: m.nome,
      torneios: [...m.torneios.entries()]
        .filter(([tId]) => (torneioEscolhido ? tId === torneioEscolhido : true))
        .sort((a, b) => a[1].nome.localeCompare(b[1].nome, "pt-BR")),
    }))
    .filter((m) => (modalidadeEscolhida ? m.id === modalidadeEscolhida : true))
    .filter((m) => m.torneios.length > 0);

  // Dentro do torneio: primeiro os com horário (em ordem), depois os sem horário.
  const ordenar = (jogos: Jogo[]) =>
    [...jogos].sort((a, b) => {
      if (a.dataHora && b.dataHora) return a.dataHora.getTime() - b.dataHora.getTime() || a.id - b.id;
      if (a.dataHora) return -1;
      if (b.dataHora) return 1;
      return (a.numero ?? 0) - (b.numero ?? 0) || a.id - b.id;
    });

  const base = `/coordenador/eventos/${eventoId}/agenda/jogos`;
  const semFiltro = !modalidadeEscolhida && !torneioEscolhido;

  return (
    <main className="space-y-6 p-8">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Agenda de jogos — {evento.nome}</h1>
        <div className="flex gap-4 text-sm">
          <Link href={`/coordenador/eventos/${eventoId}/agenda`} className="underline">Configuração</Link>
          <Link href={`/coordenador/eventos/${eventoId}/agenda/distribuir`} className="underline">Distribuir jogos</Link>
        </div>
      </div>

      {filtro.ok && <p className="text-sm text-green-700">{filtro.ok}</p>}
      {disputas.length === 0 && <p className="text-sm">Este evento ainda não tem jogos gerados.</p>}

      {disputas.length > 0 && (
        <nav className="max-w-4xl space-y-2 rounded-lg border p-3 text-sm" aria-label="Escolher modalidade e torneio">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="font-medium">Mostrar:</span>
            <Link href={base} className={semFiltro ? "font-semibold underline" : "underline"}>Tudo</Link>
          </div>
          <ul className="space-y-1">
            {listaModalidades.map(([mId, m]) => {
              const torneios = [...m.torneios.entries()].sort((a, b) => a[1].nome.localeCompare(b[1].nome, "pt-BR"));
              const total = torneios.reduce((s, [, t]) => s + t.jogos.length, 0);
              const sem = torneios.reduce((s, [, t]) => s + t.jogos.filter((j) => !j.dataHora).length, 0);
              return (
                <li key={mId} className="flex flex-wrap items-baseline gap-x-3">
                  <Link
                    href={`${base}?modalidade=${mId}`}
                    className={modalidadeEscolhida === mId && !torneioEscolhido ? "font-semibold underline" : "underline"}
                  >
                    {m.nome}
                  </Link>
                  <span className="text-xs text-muted-foreground">
                    {total} jogo(s){sem > 0 ? `, ${sem} sem horário` : ""}
                  </span>
                  {torneios.length > 1 &&
                    torneios.map(([tId, t]) => (
                      <Link
                        key={tId}
                        href={`${base}?torneio=${tId}`}
                        className={torneioEscolhido === tId ? "text-xs font-semibold underline" : "text-xs underline"}
                      >
                        {t.nome}
                      </Link>
                    ))}
                </li>
              );
            })}
          </ul>
        </nav>
      )}

      <div className="max-w-5xl space-y-8">
        {visiveis.map((m) => (
          <section key={m.id} className="space-y-4">
            <h2 className="border-b text-lg font-semibold">{m.nome}</h2>
            {m.torneios.map(([tId, t]) => {
              const jogos = ordenar(t.jogos);
              return (
                <div key={tId} className="space-y-1">
                  <h3 className="text-sm font-semibold">{t.nome}</h3>
                  <table className="w-full border-collapse text-sm">
                    <tbody>
                      {jogos.map((l) => (
                        <tr key={l.id} className="border-b align-top">
                          <td className="w-28 py-1 pr-3">{l.dataHora ? dia(l.dataHora) : <span className="text-muted-foreground">Sem horário</span>}</td>
                          <td className="w-28 py-1 pr-3">
                            {l.dataHora ? `${hora(l.dataHora)}–${hora(new Date(l.dataHora.getTime() + duracao(l) * 60000))}` : ""}
                          </td>
                          <td className="w-36 py-1 pr-3">{l.local?.nome ?? "—"}</td>
                          <td className="py-1 pr-3">{l.fase}</td>
                          <td className="py-1 pr-3">{confronto(l)}</td>
                          <td className="w-24 py-1 text-xs text-muted-foreground">
                            {l.travada ? "travado " : ""}
                            {l.status !== "AGENDADA" ? l.status.toLowerCase() : ""}
                          </td>
                          <td className="w-32 py-1 text-right text-sm">
                            {l.status === "AGENDADA" && (
                              <Link href={`/coordenador/eventos/${eventoId}/agenda/jogos/${l.id}`} className="underline">
                                {l.dataHora ? "Editar" : "Definir horário"}
                              </Link>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </section>
        ))}
      </div>
    </main>
  );
}
