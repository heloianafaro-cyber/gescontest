import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirCoordenadorDoEvento } from "@/modules/eventos/acesso";
import { carregarJogoParaEdicao } from "@/modules/agenda/mover-db";
import { diasDoEvento, paraCampoBahia } from "@/modules/agenda/conferir";
import { alternarTrava, limparHorario, salvarHorario } from "@/modules/agenda/acoes-mover";
import { Button } from "@/components/ui/button";

export const instant = false;

export default async function EditarHorarioDoJogo({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; disputaId: string }>;
  searchParams: Promise<{ ok?: string; erro?: string }>;
}) {
  const p = await params;
  const eventoId = Number(p.id);
  const disputaId = Number(p.disputaId);
  if (!Number.isInteger(eventoId) || !Number.isInteger(disputaId)) notFound();
  const aviso = await searchParams;
  await exigirCoordenadorDoEvento(eventoId);

  const dados = await carregarJogoParaEdicao(eventoId, disputaId);
  if (!dados) notFound();
  const { disputa, evento, duracaoMin, contexto } = dados;

  const dias = diasDoEvento(evento.dataInicio, evento.dataFim);
  const atual = disputa.dataHora ? paraCampoBahia(Math.floor(disputa.dataHora.getTime() / 60000)) : "";
  const diaAtual = atual ? atual.slice(0, 10) : "";
  const horaAtual = atual ? atual.slice(11, 16) : "";
  const rotuloDia = (d: string) =>
    new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", weekday: "long", day: "2-digit", month: "2-digit" }).format(
      new Date(`${d}T12:00:00Z`)
    );
  const iniciado = disputa.status !== "AGENDADA";
  const marcados = new Set(contexto.locaisMarcados);
  const lista = `/coordenador/eventos/${eventoId}/agenda/jogos?torneio=${disputa.torneioId}`;

  return (
    <main className="max-w-xl space-y-6 p-8">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Horário do jogo</h1>
        <p className="text-sm">
          {disputa.torneio.modalidade.nome} — {disputa.torneio.nome}
          {disputa.fase ? ` · ${disputa.fase}` : ""}
        </p>
        <p className="text-sm text-muted-foreground">
          {disputa.partida?.equipeA?.nome ?? "A definir"} × {disputa.partida?.equipeB?.nome ?? "A definir"} · duração{" "}
          {duracaoMin} min {disputa.travada ? "· travado" : ""}
        </p>
        <Link href={lista} className="text-sm underline">Voltar para a agenda de jogos</Link>
      </div>

      {aviso.ok && <p className="text-sm text-green-700">{aviso.ok}</p>}
      {aviso.erro && <p className="text-sm text-red-600">{aviso.erro}</p>}
      {iniciado && (
        <p className="text-sm text-amber-700">Este jogo já começou ou foi encerrado; não pode mais ser movido.</p>
      )}

      {!iniciado && (
        <form action={salvarHorario.bind(null, eventoId, disputaId)} className="space-y-4">
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Local</span>
            <select
              name="localId"
              defaultValue={disputa.localId ?? ""}
              required
              className="w-full rounded-md border bg-background px-2 py-1"
            >
              <option value="" disabled>Escolha o local</option>
              {evento.locais.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.nome}
                  {marcados.has(l.id) ? "" : " (não marcado para a modalidade)"}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1 text-sm">
            <span className="font-medium">Dia (só os dias do evento)</span>
            <select
              name="dia"
              defaultValue={dias.includes(diaAtual) ? diaAtual : ""}
              required
              className="w-full rounded-md border bg-background px-2 py-1 capitalize"
            >
              <option value="" disabled>Escolha o dia</option>
              {dias.map((d) => (
                <option key={d} value={d}>{rotuloDia(d)}</option>
              ))}
            </select>
          </label>

          <label className="block space-y-1 text-sm">
            <span className="font-medium">Hora de início</span>
            <input
              type="time"
              name="hora"
              defaultValue={horaAtual}
              required
              className="w-full rounded-md border bg-background px-2 py-1"
            />
          </label>

          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" name="forcar" className="mt-1" />
            <span>Gravar mesmo se houver conflito (use só se for de propósito).</span>
          </label>

          <p className="text-xs text-muted-foreground">
            Ao salvar, o jogo fica travado: a distribuição automática não mexe mais nele.
          </p>
          <Button type="submit">Salvar e travar</Button>
        </form>
      )}

      {!iniciado && disputa.dataHora && (
        <div className="flex flex-wrap gap-3 border-t pt-4">
          <form action={alternarTrava.bind(null, eventoId, disputaId)}>
            <Button type="submit" variant="outline">{disputa.travada ? "Destravar" : "Travar"}</Button>
          </form>
          <form action={limparHorario.bind(null, eventoId, disputaId)}>
            <Button type="submit" variant="outline">Remover horário e local</Button>
          </form>
        </div>
      )}
    </main>
  );
}
