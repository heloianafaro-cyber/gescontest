import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { JogoLinha } from "@/components/jogo-publico";
import { jogosDoEvento } from "@/modules/publico/consultas";
import { chaveDia, rotuloDia } from "@/modules/publico/formato";

export const instant = false;

// RN215-RN217: jogos e resultados do evento, por dia, com filtro de modalidade e torneio.
export default async function JogosPublicos({
  params,
  searchParams,
}: {
  params: Promise<{ eventoId: string }>;
  searchParams: Promise<{ dia?: string; modalidade?: string; torneio?: string }>;
}) {
  const eventoId = Number((await params).eventoId);
  if (!Number.isInteger(eventoId)) notFound();
  const filtro = await searchParams;
  const evento = await prisma.evento.findUnique({ where: { id: eventoId }, select: { nome: true } });
  if (!evento) notFound();

  const todos = (await jogosDoEvento(eventoId)).filter((j) => j.resultado.status !== "CANCELADA");
  const modalidadeEscolhida = Number(filtro.modalidade) || null;
  const torneioEscolhido = Number(filtro.torneio) || null;
  const diaEscolhido = /^\d{4}-\d{2}-\d{2}$/.test(filtro.dia ?? "") ? (filtro.dia as string) : null;

  const modalidades = new Map<number, { nome: string; torneios: Map<number, string> }>();
  for (const j of todos) {
    const m = modalidades.get(j.modalidadeId) ?? { nome: j.modalidade, torneios: new Map() };
    m.torneios.set(j.torneioId, j.torneio);
    modalidades.set(j.modalidadeId, m);
  }
  const listaModalidades = [...modalidades.entries()].sort((a, b) => a[1].nome.localeCompare(b[1].nome, "pt-BR"));

  const dias = [...new Set(todos.filter((j) => j.dataHora).map((j) => chaveDia(j.dataHora as Date)))].sort();

  const jogos = todos
    .filter((j) => (modalidadeEscolhida ? j.modalidadeId === modalidadeEscolhida : true))
    .filter((j) => (torneioEscolhido ? j.torneioId === torneioEscolhido : true))
    .filter((j) => (diaEscolhido ? j.dataHora && chaveDia(j.dataHora) === diaEscolhido : true));

  const porDia = new Map<string, typeof jogos>();
  for (const j of jogos) {
    const k = j.dataHora ? chaveDia(j.dataHora) : "sem";
    porDia.set(k, [...(porDia.get(k) ?? []), j]);
  }
  const chaves = [...porDia.keys()].sort((a, b) => (a === "sem" ? 1 : b === "sem" ? -1 : a.localeCompare(b)));

  const base = `/jogos/${eventoId}`;
  const link = (p: { dia?: string | null; modalidade?: number | null; torneio?: number | null }) => {
    const q = new URLSearchParams();
    if (p.dia) q.set("dia", p.dia);
    if (p.modalidade) q.set("modalidade", String(p.modalidade));
    if (p.torneio) q.set("torneio", String(p.torneio));
    const s = q.toString();
    return s ? `${base}?${s}` : base;
  };

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6 sm:p-8">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold">Jogos e resultados — {evento.nome}</h1>
        <div className="flex gap-4 text-sm">
          <Link href="/" className="underline">Início</Link>
          <Link href={`/classificacao/${eventoId}`} className="underline">Classificação e chaves</Link>
          <Link href={`/agenda/${eventoId}`} className="underline">Levar para minha agenda</Link>
        </div>
      </header>

      {todos.length === 0 && <p className="text-sm">Os jogos deste evento ainda não foram divulgados.</p>}

      {todos.length > 0 && (
        <nav className="space-y-2 rounded-lg border p-3 text-sm" aria-label="Filtros">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-medium">Dia:</span>
            <Link href={link({ modalidade: modalidadeEscolhida, torneio: torneioEscolhido })} className={!diaEscolhido ? "font-semibold underline" : "underline"}>
              Todos
            </Link>
            {dias.map((d) => (
              <Link
                key={d}
                href={link({ dia: d, modalidade: modalidadeEscolhida, torneio: torneioEscolhido })}
                className={diaEscolhido === d ? "font-semibold underline" : "underline"}
              >
                {rotuloDia(d)}
              </Link>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-medium">Modalidade:</span>
            <Link href={link({ dia: diaEscolhido })} className={!modalidadeEscolhida && !torneioEscolhido ? "font-semibold underline" : "underline"}>
              Todas
            </Link>
            {listaModalidades.map(([id, m]) => (
              <Link
                key={id}
                href={link({ dia: diaEscolhido, modalidade: id })}
                className={modalidadeEscolhida === id && !torneioEscolhido ? "font-semibold underline" : "underline"}
              >
                {m.nome}
              </Link>
            ))}
          </div>
          {modalidadeEscolhida && (modalidades.get(modalidadeEscolhida)?.torneios.size ?? 0) > 1 && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="font-medium">Torneio:</span>
              {[...(modalidades.get(modalidadeEscolhida)?.torneios.entries() ?? [])].map(([id, nome]) => (
                <Link key={id} href={link({ dia: diaEscolhido, modalidade: modalidadeEscolhida, torneio: id })} className={torneioEscolhido === id ? "font-semibold underline" : "underline"}>
                  {nome}
                </Link>
              ))}
            </div>
          )}
        </nav>
      )}

      {todos.length > 0 && jogos.length === 0 && <p className="text-sm">Nenhum jogo com esses filtros.</p>}

      {chaves.map((k) => (
        <section key={k} className="space-y-1">
          <h2 className="border-b text-base font-semibold capitalize">{k === "sem" ? "Horário a definir" : rotuloDia(k)}</h2>
          <ul>
            {(porDia.get(k) ?? []).map((j) => (
              <JogoLinha key={j.id} jogo={j} />
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
