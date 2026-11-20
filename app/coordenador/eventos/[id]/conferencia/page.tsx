import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { exigirCoordenadorDoEvento } from "@/modules/eventos/acesso";
import { faseDaConferencia, ROTULO_FASE } from "@/modules/eventos/conferencia";
import { listarInscritos } from "@/modules/eventos/conferencia-db";
import { ListaConferencia } from "@/components/lista-conferencia";
import { AcoesCoordenador } from "@/components/acoes-conferencia";
import { estaPendente } from "@/modules/eventos/impugnacao";
import { Button } from "@/components/ui/button";

export const instant = false;

const formatar = (d: Date) => d.toLocaleDateString("pt-BR", { timeZone: "UTC" });
const classeSelect =
  "h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:ring-2";

export default async function Conferencia({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ modalidade?: string; delegacao?: string; ok?: string; erro?: string }>;
}) {
  const { id } = await params;
  const eventoId = Number(id);
  if (!Number.isInteger(eventoId)) notFound();

  const { evento } = await exigirCoordenadorDoEvento(eventoId);
  const filtro = await searchParams;
  const modalidadeId = Number(filtro.modalidade) || undefined;
  const delegacaoId = Number(filtro.delegacao) || undefined;

  const [modalidades, delegacoes, inscritos] = await Promise.all([
    prisma.modalidade.findMany({ where: { eventoId }, orderBy: { nome: "asc" }, select: { id: true, nome: true } }),
    prisma.delegacao.findMany({ orderBy: { nome: "asc" }, select: { id: true, nome: true } }),
    listarInscritos(evento, { modalidadeId, delegacaoId }),
  ]);

  const fase = faseDaConferencia(evento);
  const comAviso = inscritos.filter((i) => i.avisos.length > 0).length;
  const pendentes = inscritos.filter((i) => i.impugnacao && estaPendente(i.impugnacao.status)).length;

  return (
    <main className="space-y-6 p-8">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Conferência — {evento.nome}</h1>
        <p className="text-sm text-muted-foreground">
          {ROTULO_FASE[fase]}
          {evento.conferenciaInicio && evento.conferenciaFim &&
            ` · de ${formatar(evento.conferenciaInicio)} a ${formatar(evento.conferenciaFim)}`}
          {evento.recursoFim && ` · recurso até ${formatar(evento.recursoFim)}`}
        </p>
        {fase === "NAO_CONFIGURADA" && (
          <p className="text-sm">
            Este evento não tem conferência. Para usar, informe as datas em{" "}
            <Link href={`/coordenador/eventos/${eventoId}/editar`} className="underline">Editar evento</Link>.
          </p>
        )}
        <Link href="/coordenador/eventos" className="text-sm underline">Voltar aos eventos</Link>
      </div>

      {filtro.ok && <p className="text-sm text-green-700">{filtro.ok}</p>}
      {filtro.erro && <p className="text-sm text-red-600">{filtro.erro}</p>}

      <form method="get" className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <label htmlFor="modalidade" className="text-sm">Modalidade</label>
          <select id="modalidade" name="modalidade" defaultValue={modalidadeId ?? ""} className={classeSelect}>
            <option value="">Todas</option>
            {modalidades.map((m) => (
              <option key={m.id} value={m.id}>{m.nome}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label htmlFor="delegacao" className="text-sm">Delegação</label>
          <select id="delegacao" name="delegacao" defaultValue={delegacaoId ?? ""} className={classeSelect}>
            <option value="">Todas</option>
            {delegacoes.map((d) => (
              <option key={d.id} value={d.id}>{d.nome}</option>
            ))}
          </select>
        </div>
        <Button type="submit" size="sm">Filtrar</Button>
        <Link href={`/coordenador/eventos/${eventoId}/conferencia`} className="text-sm underline">Limpar</Link>
      </form>

      <p className="text-sm">
        {inscritos.length} atleta(s) · {comAviso} com aviso · {pendentes} impugnação(ões) aguardando decisão. Os avisos são só informativos: a impugnação é uma decisão do coordenador.
      </p>

      <ListaConferencia
        inscritos={inscritos}
        mostrarDelegacao
        acoes={(i) => <AcoesCoordenador eventoId={eventoId} i={i} fase={fase} />}
      />
    </main>
  );
}
