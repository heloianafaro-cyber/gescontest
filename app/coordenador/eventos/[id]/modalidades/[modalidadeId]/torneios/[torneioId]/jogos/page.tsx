import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { exigirCoordenadorDoEvento } from "@/modules/eventos/acesso";
import { gerarJogos } from "@/modules/torneios/acoes-jogos";
import { gerarRepescagem } from "@/modules/torneios/acoes-repescagem";
import { ehJogoDeRepescagem } from "@/modules/torneios/repescagem";
import { resumoResultado, termos } from "@/modules/torneios/exibicao";
import { BotaoConfirmar } from "@/components/botao-confirmar";

export const instant = false;

const rotuloStatus: Record<string, string> = {
  EM_ANDAMENTO: "Em andamento",
  ENCERRADA: "Encerrada",
  WO: "W.O.",
  CANCELADA: "Cancelada",
  ANULADA: "Anulada",
};

export default async function Jogos({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; modalidadeId: string; torneioId: string }>;
  searchParams: Promise<{ erro?: string; ok?: string; aviso?: string }>;
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
    include: { modalidade: true },
  });
  if (!torneio) notFound();
  const tm = termos(torneio.modalidade.formatoPlacar);

  const disputas = await prisma.disputa.findMany({
    where: { torneioId },
    orderBy: [{ rodada: "asc" }, { numero: "asc" }, { id: "asc" }],
    include: {
      partida: {
        include: { equipeA: { select: { nome: true } }, equipeB: { select: { nome: true } } },
      },
    },
  });

  // Vaga ainda vazia: mostra "Vencedor do jogo N" (ou "Perdedor", na disputa de 3º lugar).
  const numeroDoJogo = new Map(disputas.map((d) => [d.id, d.numero]));
  const serieDoJogo = new Map(disputas.map((d) => [d.id, d.serie]));
  const vaga = (
    equipe: { nome: string } | null | undefined,
    origemId: number | null | undefined,
    perdedor: boolean | undefined,
    grupo?: number | null,
    pos?: number | null,
    melhor?: number | null
  ) => {
    if (equipe) return equipe.nome;
    if (melhor) {
      return (
        <span className="italic text-muted-foreground">
          {melhor}º melhor {torneio.melhoresPosicao ?? ""}º colocado
        </span>
      );
    }
    if (grupo && pos) {
      return (
        <span className="italic text-muted-foreground">
          {pos}º do Grupo {String.fromCharCode(64 + grupo)}
        </span>
      );
    }
    const serie = origemId ? serieDoJogo.get(origemId) : null;
    const n = origemId ? numeroDoJogo.get(origemId) : null;
    return (
      <span className="italic text-muted-foreground">
        {perdedor ? "Perdedor" : "Vencedor"} {serie ? `do confronto ${serie}` : `do ${tm.jogo} ${n ?? "?"}`}
      </span>
    );
  };

  const voltar = `/coordenador/eventos/${eventoId}/modalidades/${modalidadeId}/torneios`;
  const base = `${voltar}/${torneioId}`;
  // Repescagem: os jogos dela e do bronze têm fase própria; só a chave principal trava a geração da chave.
  const iniciados = disputas.some((d) => d.status !== "AGENDADA" && d.status !== "CANCELADA");
  const comRepescagem = torneio.sistemaDisputa === "ELIMINATORIO" && torneio.variante === "REPESCAGEM";
  const semifinais = disputas.filter((d) => d.fase === "Semifinal");
  const semisEncerradas = semifinais.length === 2 && semifinais.every((d) => d.status === "ENCERRADA" || d.status === "WO");
  const jaTemRepescagem = disputas.some((d) => ehJogoDeRepescagem(d.fase));
  const repescagemIniciada = disputas.some(
    (d) => ehJogoDeRepescagem(d.fase) && d.status !== "AGENDADA" && d.status !== "CANCELADA"
  );

  // Agrupa por fase, na ordem dos jogos: a disputa de 3º lugar fica separada da final.
  const fases = new Map<string, typeof disputas>();
  for (const d of disputas) {
    const chave = d.fase ?? `Rodada ${d.rodada ?? 0}`;
    fases.set(chave, [...(fases.get(chave) ?? []), d]);
  }

  return (
    <main className="space-y-6 p-8">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">{tm.Jogos}: {torneio.nome}</h1>
        <p className="text-sm text-muted-foreground">
          {disputas.length} {tm.jogo}(s) · sem horário até a agenda ser montada
        </p>
        <div className="flex gap-4 text-sm">
          <Link href={`${base}/sorteio`} className="underline">Sorteio</Link>
          {(torneio.sistemaDisputa === "RODIZIO" || torneio.sistemaDisputa === "MISTO") && (
            <Link href={`${base}/classificacao`} className="underline">Classificação</Link>
          )}
          <Link href={voltar} className="underline">Voltar aos torneios</Link>
        </div>
      </div>

      {q.erro && <p className="max-w-xl rounded-md border border-red-400 bg-red-50 p-3 text-sm text-red-700">{q.erro}</p>}
      {q.ok && <p className="max-w-xl rounded-md border border-green-500 bg-green-50 p-3 text-sm text-green-800">{q.ok} {tm.jogo}(s) gerado(s).</p>}

      {q.aviso && <p className="max-w-xl rounded-md border border-amber-400 bg-amber-50 p-3 text-sm">{q.aviso}</p>}

      {!torneio.sorteioEm && (
        <p className="max-w-xl rounded-md border border-amber-400 bg-amber-50 p-3 text-sm">
          O sorteio ainda não foi gravado. Faça e confirme o sorteio antes de gerar os {tm.jogos}.
        </p>
      )}

      {!iniciados && (
        <form action={gerarJogos.bind(null, eventoId, modalidadeId, torneioId)}>
          <BotaoConfirmar
            mensagem={
              disputas.length > 0
                ? `Gerar os ${tm.jogos} de novo? Os ${tm.jogos} atuais deste torneio serão apagados.`
                : `Gerar os ${tm.jogos} deste torneio?`
            }
          >
            {disputas.length > 0 ? `Gerar ${tm.jogos} de novo` : `Gerar ${tm.jogos}`}
          </BotaoConfirmar>
        </form>
      )}
      {iniciados && <p className="text-sm text-muted-foreground">Há {tm.jogos} iniciados ou encerrados: a geração está travada.</p>}

      {comRepescagem && disputas.length > 0 && (
        <div className="max-w-xl space-y-2 rounded-lg border p-3">
          <p className="text-sm font-medium">Repescagem e lutas de bronze</p>
          {!semisEncerradas && (
            <p className="text-sm text-muted-foreground">
              Disponível depois que as duas semifinais terminarem (é quando se conhecem os finalistas).
            </p>
          )}
          {semisEncerradas && !repescagemIniciada && (
            <form action={gerarRepescagem.bind(null, eventoId, modalidadeId, torneioId)}>
              <BotaoConfirmar
                mensagem={
                  jaTemRepescagem
                    ? "Gerar a repescagem de novo? As lutas de repescagem e bronze atuais serão apagadas."
                    : "Gerar a repescagem e as lutas de bronze?"
                }
              >
                {jaTemRepescagem ? "Gerar repescagem de novo" : "Gerar repescagem"}
              </BotaoConfirmar>
            </form>
          )}
          {semisEncerradas && repescagemIniciada && (
            <p className="text-sm text-muted-foreground">Há lutas da repescagem iniciadas: a geração está travada.</p>
          )}
        </div>
      )}

      {disputas.length === 0 && <p>Nenhum {tm.jogo} gerado.</p>}

      <div className="max-w-xl space-y-4">
        {[...fases.entries()].map(([fase, lista]) => (
          <section key={fase} className="space-y-1">
            <h2 className="text-sm font-medium">{fase}</h2>
            <ul className="space-y-1">
              {lista.map((d) => (
                <li key={d.id} className="rounded-lg border p-2 text-sm">
                  {d.numero ? <span className="mr-2 text-xs text-muted-foreground">{tm.Jogo} {d.numero}</span> : null}
                  {d.serie ? (
                    <span className="mr-2 text-xs text-muted-foreground">
                      Confronto {d.serie} · {tm.jogo} {d.jogoNaSerie}
                    </span>
                  ) : null}
                  {vaga(d.partida?.equipeA, d.partida?.origemAId, d.partida?.origemPerdedor, d.partida?.origemGrupoA, d.partida?.origemPosA, d.partida?.origemMelhorA)}{" "}
                  <span className="text-muted-foreground">x</span>{" "}
                  {vaga(d.partida?.equipeB, d.partida?.origemBId, d.partida?.origemPerdedor, d.partida?.origemGrupoB, d.partida?.origemPosB, d.partida?.origemMelhorB)}
                  {resumoResultado(torneio.modalidade.formatoPlacar, d.status, d.partida, d.partida?.equipeA?.nome, d.partida?.equipeB?.nome) && (
                    <span className="ml-2 font-medium">
                      {resumoResultado(torneio.modalidade.formatoPlacar, d.status, d.partida, d.partida?.equipeA?.nome, d.partida?.equipeB?.nome)}
                    </span>
                  )}
                  {d.status !== "AGENDADA" && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      {rotuloStatus[d.status] ?? d.status}
                    </span>
                  )}
                  {d.partida?.equipeAId && d.partida?.equipeBId && d.status !== "CANCELADA" && (
                    <Link href={`${base}/jogos/${d.id}`} className="ml-3 text-xs underline">
                      {d.status === "ENCERRADA" || d.status === "WO" ? "Corrigir" : "Resultado"}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}
