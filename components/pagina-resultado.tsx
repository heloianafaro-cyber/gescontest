import Link from "next/link";
import { notFound } from "next/navigation";
import type { EstadoForm } from "@/modules/eventos/acoes";
import { carregarJogo, FORMAS_LUTA } from "@/modules/torneios/avanco";
import { FormResultado } from "@/components/form-resultado";
import { termos } from "@/modules/torneios/exibicao";

type Props = {
  disputaId: number;
  eventoId: number;
  papel: "COORDENADOR" | "STAFF";
  voltar: string;
  acao: (estado: EstadoForm, formData: FormData) => Promise<EstadoForm>;
};

const rotuloStatus: Record<string, string> = {
  AGENDADA: "Agendada",
  EM_ANDAMENTO: "Em andamento",
  ENCERRADA: "Encerrada",
  WO: "W.O.",
  CANCELADA: "Cancelada (série decidida)",
  ANULADA: "Anulada",
};

// Tela de registro do resultado de um jogo, usada pelo coordenador e pelo Staff.
export async function PaginaResultado({ disputaId, eventoId, papel, voltar, acao }: Props) {
  const d = await carregarJogo(disputaId);
  if (!d || !d.partida) notFound();
  const modalidade = d.torneio.modalidade;
  if (modalidade.eventoId !== eventoId) notFound();
  const p = d.partida;
  const t = d.torneio;

  const mataMata =
    t.sistemaDisputa === "ELIMINATORIO" || (t.sistemaDisputa === "MISTO" && !(d.fase ?? "").startsWith("Grupo"));

  // Valores já gravados, para corrigir.
  const inicial: Record<string, string> = {};
  if (p.placarA !== null) inicial.placarA = String(p.placarA);
  if (p.placarB !== null) inicial.placarB = String(p.placarB);
  if (p.penaltisA !== null) inicial.penaltisA = String(p.penaltisA);
  if (p.penaltisB !== null) inicial.penaltisB = String(p.penaltisB);
  if (p.decididoPor === "PRORROGACAO") inicial.prorrogacao = "on";
  if (modalidade.formatoPlacar === "LUTA") {
    if (p.vencedorId) inicial.vencedorLuta = p.vencedorId === p.equipeAId ? "A" : "B";
    if (p.formaVitoria && p.formaVitoria !== "WO") inicial.forma = p.formaVitoria;
  }
  if (p.decididoPor === "PENALTIS" || p.decididoPor === "MANUAL") {
    if (p.vencedorId) inicial.vencedorDesempate = p.vencedorId === p.equipeAId ? "A" : "B";
  }
  p.sets.forEach((s) => {
    inicial[`set${s.numero}A`] = String(s.pontosA);
    inicial[`set${s.numero}B`] = String(s.pontosB);
  });
  if (d.motivoAnulacao) inicial.motivo = d.motivoAnulacao;

  const equipesDefinidas = p.equipeA && p.equipeB;
  const tm = termos(modalidade.formatoPlacar);

  return (
    <main className="space-y-4 p-8">
      <Link href={voltar} className="text-sm underline">Voltar aos {tm.jogos}</Link>
      <div>
        <h1 className="text-xl font-semibold">
          {t.nome} · {d.fase ?? tm.Jogo}
          {d.serie ? ` · ${tm.jogo} ${d.jogoNaSerie} da série` : ""}
        </h1>
        <p className="text-sm text-muted-foreground">
          {rotuloStatus[d.status] ?? d.status}
          {d.motivoAnulacao ? ` — motivo: ${d.motivoAnulacao}` : ""}
        </p>
      </div>

      {!equipesDefinidas && (
        <p className="text-sm">As equipes deste {tm.jogo} ainda não estão definidas (dependem de {tm.jogos} anteriores).</p>
      )}

      {equipesDefinidas && d.status === "CANCELADA" && (
        <p className="text-sm">Este {tm.jogo} não será disputado: a série já foi decidida.</p>
      )}

      {equipesDefinidas && d.status !== "CANCELADA" && (
        <FormResultado
          acao={acao}
          equipeA={p.equipeA!.nome}
          equipeB={p.equipeB!.nome}
          formato={modalidade.formatoPlacar}
          mataMata={mataMata}
          setsParaVencer={t.setsParaVencer}
          desempate={modalidade.desempateMataMata}
          prorrogacaoMin={modalidade.prorrogacaoMin}
          formas={FORMAS_LUTA}
          status={d.status}
          podeAnular={papel === "COORDENADOR"}
          inicial={inicial}
          termo={tm.jogo}
        />
      )}

      {papel === "COORDENADOR" && (d.status === "ENCERRADA" || d.status === "WO") && (
        <p className="max-w-lg text-xs text-muted-foreground">
          Ao corrigir, as vagas dos jogos seguintes são atualizadas. Se algum deles já tiver resultado, confira-o depois.
        </p>
      )}
    </main>
  );
}
