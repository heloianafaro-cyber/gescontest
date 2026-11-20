import { termos } from "@/modules/torneios/exibicao";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { exigirCoordenadorDoEvento } from "@/modules/eventos/acesso";
import { situacaoInscricao } from "@/modules/eventos/inscricoes";
import { bloqueioDoSorteio } from "@/modules/eventos/conferencia-sorteio";
import { confirmarSorteio } from "@/modules/torneios/acoes-sorteio";
import { sortear, estruturar, type Sorteado } from "@/modules/torneios/sorteio";
import { Button } from "@/components/ui/button";

export const instant = false;

const SISTEMAS_COM_SORTEIO = ["RODIZIO", "ELIMINATORIO", "MISTO"];

type Nomes = Map<number, { nome: string; delegacao: string; cabeca: boolean }>;

function Resultado({ sistema, itens, nomes }: { sistema: string; itens: Sorteado[]; nomes: Nomes }) {
  const rotulo = (id: number | null) => {
    if (id === null) return <span className="italic text-muted-foreground">isento (passa direto)</span>;
    const n = nomes.get(id);
    return (
      <span>
        {n?.cabeca && "★ "}
        {n?.nome ?? `#${id}`} <span className="text-muted-foreground">({n?.delegacao})</span>
      </span>
    );
  };
  const e = estruturar(sistema, itens);

  if (e.tipo === "GRUPOS") {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        {e.grupos.map((g) => (
          <div key={g.numero} className="rounded-lg border p-3">
            <p className="mb-1 text-sm font-medium">Grupo {g.numero}</p>
            <ol className="list-decimal space-y-1 pl-5 text-sm">
              {g.equipes.map((id) => <li key={id}>{rotulo(id)}</li>)}
            </ol>
          </div>
        ))}
      </div>
    );
  }
  if (e.tipo === "CHAVE") {
    return (
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">
          Chave de {e.tamanho} posições, primeira rodada. Quem está com &quot;isento&quot; passa direto à rodada seguinte.
        </p>
        <ol className="space-y-2">
          {e.confrontos.map((c, i) => (
            <li key={i} className="rounded-lg border p-3 text-sm">
              <p className="text-xs text-muted-foreground">Confronto {i + 1}</p>
              <p>{rotulo(c.a)}</p>
              <p className="text-muted-foreground">contra</p>
              <p>{rotulo(c.b)}</p>
            </li>
          ))}
        </ol>
      </div>
    );
  }
  return (
    <ol className="list-decimal space-y-1 pl-5 text-sm">
      {e.ordem.map((id) => <li key={id}>{rotulo(id)}</li>)}
    </ol>
  );
}

export default async function Sorteio({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; modalidadeId: string; torneioId: string }>;
  searchParams: Promise<{ semente?: string; erro?: string; ok?: string }>;
}) {
  const p = await params;
  const q = await searchParams;
  const eventoId = Number(p.id);
  const modalidadeId = Number(p.modalidadeId);
  const torneioId = Number(p.torneioId);
  if (![eventoId, modalidadeId, torneioId].every(Number.isInteger)) notFound();

  await exigirCoordenadorDoEvento(eventoId);

  const torneio = await prisma.torneio.findFirst({
    where: { id: torneioId, modalidadeId, modalidade: { eventoId } },
    include: {
      modalidade: { include: { evento: true } },
      participantes: { include: { equipe: { include: { delegacao: { select: { nome: true } } } } } },
    },
  });
  if (!torneio) notFound();

  const voltar = `/coordenador/eventos/${eventoId}/modalidades/${modalidadeId}/torneios`;
  const base = `${voltar}/${torneioId}`;

  if (!SISTEMAS_COM_SORTEIO.includes(torneio.sistemaDisputa)) {
    return (
      <main className="space-y-3 p-8">
        <h1 className="text-xl font-semibold">Sorteio: {torneio.nome}</h1>
        <p>Este torneio não usa sorteio.</p>
        <Link href={voltar} className="text-sm underline">Voltar aos torneios</Link>
      </main>
    );
  }

  const nomes: Nomes = new Map(
    torneio.participantes.map((x) => [
      x.equipeId,
      { nome: x.equipe.nome, delegacao: x.equipe.delegacao.nome, cabeca: x.cabecaDeChave },
    ])
  );

  const tm = termos(torneio.modalidade.formatoPlacar);
  const prazo = situacaoInscricao(torneio.modalidade.evento);
  const bloqueioConferencia = await bloqueioDoSorteio(torneio.modalidade.evento);
  const comResultado = await prisma.disputa.count({ where: { torneioId, NOT: { status: "AGENDADA" } } });
  const travado = comResultado > 0;

  // Sorteio já gravado.
  const gravado: Sorteado[] = torneio.participantes
    .filter((x) => x.posicao !== null)
    .map((x) => ({ equipeId: x.equipeId, grupo: x.grupo, posicao: x.posicao! }));

  // Prévia: a semente vem da URL; sem ela, sorteia uma nova.
  const semente = Number.isInteger(Number(q.semente)) && q.semente ? Number(q.semente) : Math.floor(Math.random() * 2_000_000_000);
  const proximaSemente = Math.floor(Math.random() * 2_000_000_000);
  const previa = sortear(
    torneio.sistemaDisputa,
    torneio.chaves,
    torneio.participantes.map((x) => ({ equipeId: x.equipeId, cabeca: x.cabecaDeChave })),
    semente
  );

  const cabecas = torneio.participantes.filter((x) => x.cabecaDeChave).length;

  return (
    <main className="space-y-6 p-8">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Sorteio: {torneio.nome}</h1>
        <p className="text-sm text-muted-foreground">
          {torneio.participantes.length} participante(s) · {cabecas} cabeça(s) de chave
        </p>
        <div className="flex gap-4 text-sm">
          <Link href={`${base}/participantes`} className="underline">Participantes e cabeças de chave</Link>
          <Link href={`${base}/jogos`} className="underline">{tm.Jogos}</Link>
          <Link href={voltar} className="underline">Voltar aos torneios</Link>
        </div>
      </div>

      {q.erro && <p className="max-w-xl rounded-md border border-red-400 bg-red-50 p-3 text-sm text-red-700">{q.erro}</p>}
      {q.ok && <p className="max-w-xl rounded-md border border-green-500 bg-green-50 p-3 text-sm text-green-800">Sorteio gravado.</p>}

      {gravado.length > 0 && (
        <section className="max-w-2xl space-y-2">
          <h2 className="font-medium">
            Sorteio gravado{torneio.sorteioEm ? ` em ${torneio.sorteioEm.toLocaleString("pt-BR")}` : ""}
          </h2>
          <Resultado sistema={torneio.sistemaDisputa} itens={gravado} nomes={nomes} />
        </section>
      )}

      <section className="max-w-2xl space-y-3">
        <h2 className="font-medium">{gravado.length > 0 ? "Refazer o sorteio (prévia)" : "Prévia do sorteio"}</h2>

        {prazo.aberta && (
          <p className="rounded-md border border-amber-400 bg-amber-50 p-3 text-sm">
            O sorteio só é gravado depois do fim do prazo de inscrição do evento. Você pode ver prévias enquanto isso.
          </p>
        )}
        {bloqueioConferencia && (
          <p className="rounded-md border border-amber-400 bg-amber-50 p-3 text-sm">
            {bloqueioConferencia}{" "}
            <Link href={`/coordenador/eventos/${eventoId}/conferencia`} className="underline">Abrir a conferência</Link>
          </p>
        )}
        {travado && (
          <p className="rounded-md border border-red-400 bg-red-50 p-3 text-sm text-red-700">
            Sorteio travado: já há {tm.jogos} iniciados ou com resultado neste torneio.
          </p>
        )}
        {gravado.length > 0 && !travado && (
          <p className="text-xs text-muted-foreground">
            Refazer o sorteio apaga os {tm.jogos} que já tinham sido gerados para este torneio.
          </p>
        )}

        {"erro" in previa ? (
          <p className="text-sm text-red-600">{previa.erro}</p>
        ) : (
          <>
            <Resultado sistema={torneio.sistemaDisputa} itens={previa.itens} nomes={nomes} />
            <div className="flex flex-wrap items-center gap-3">
              <Link href={`${base}/sorteio?semente=${proximaSemente}`} className="text-sm underline">
                Sortear de novo
              </Link>
              {!travado && (
                <form action={confirmarSorteio.bind(null, eventoId, modalidadeId, torneioId)}>
                  <input type="hidden" name="semente" value={semente} />
                  <Button type="submit" disabled={prazo.aberta || Boolean(bloqueioConferencia)}>Confirmar este sorteio</Button>
                </form>
              )}
            </div>
          </>
        )}
      </section>
    </main>
  );
}
