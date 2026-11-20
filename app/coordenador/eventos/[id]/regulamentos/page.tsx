import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { exigirCoordenadorDoEvento } from "@/modules/eventos/acesso";
import { enviarRegulamento, removerRegulamento, type EscopoRegulamento } from "@/modules/regulamentos/acoes";
import { BotaoConfirmar } from "@/components/botao-confirmar";
import { FormRegulamento } from "@/components/form-regulamento";

export const instant = false;

type Reg = { id: number; nomeArquivo: string; tamanho: number; enviadoEm: Date } | undefined;

export default async function Regulamentos({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string; ok?: string }>;
}) {
  const { id } = await params;
  const q = await searchParams;
  const eventoId = Number(id);
  if (!Number.isInteger(eventoId)) notFound();

  await exigirCoordenadorDoEvento(eventoId);

  const evento = await prisma.evento.findUnique({
    where: { id: eventoId },
    select: {
      nome: true,
      regulamentos: true,
      modalidadesMae: { orderBy: { nome: "asc" }, select: { id: true, nome: true } },
      modalidades: { where: { maeId: null }, orderBy: { nome: "asc" }, select: { id: true, nome: true } },
    },
  });
  if (!evento) notFound();

  const geral = evento.regulamentos.find((r) => r.maeId === null && r.modalidadeId === null);
  const daMae = new Map(evento.regulamentos.filter((r) => r.maeId !== null).map((r) => [r.maeId!, r]));
  const daModalidade = new Map(evento.regulamentos.filter((r) => r.modalidadeId !== null).map((r) => [r.modalidadeId!, r]));

  const Bloco = ({ titulo, reg, escopo, alvoId }: { titulo: string; reg: Reg; escopo: EscopoRegulamento; alvoId: number }) => (
    <li className="space-y-2 rounded-lg border p-4">
      <p className="font-medium">{titulo}</p>
      {reg ? (
        <p className="text-sm">
          <a href={`/regulamentos/arquivo/${reg.id}`} target="_blank" rel="noreferrer" className="underline">
            {reg.nomeArquivo}
          </a>{" "}
          <span className="text-muted-foreground">
            · {(reg.tamanho / 1024 / 1024).toFixed(1)} MB · enviado em {reg.enviadoEm.toLocaleDateString("pt-BR")}
          </span>
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">Nenhum regulamento enviado.</p>
      )}
      <FormRegulamento
        acao={enviarRegulamento.bind(null, eventoId, escopo, alvoId)}
        rotuloBotao={reg ? "Substituir PDF" : "Enviar PDF"}
      />
      {reg && (
        <form action={removerRegulamento.bind(null, eventoId, reg.id)}>
          <BotaoConfirmar mensagem={`Remover o regulamento "${titulo}"?`}>Remover</BotaoConfirmar>
        </form>
      )}
    </li>
  );

  return (
    <main className="space-y-6 p-8">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Regulamentos · {evento.nome}</h1>
        <p className="text-sm text-muted-foreground">
          PDF de até 10 MB. Qualquer pessoa, inclusive o público, consulta em /regulamentos.
        </p>
        <Link href={`/coordenador/eventos/${eventoId}/modalidades`} className="text-sm underline">Voltar às modalidades</Link>
      </div>

      {q.erro && <p className="max-w-xl rounded-md border border-red-400 bg-red-50 p-3 text-sm text-red-700">{q.erro}</p>}
      {q.ok === "1" && <p className="max-w-xl rounded-md border border-green-500 bg-green-50 p-3 text-sm text-green-800">Regulamento salvo.</p>}
      {q.ok === "removido" && <p className="max-w-xl rounded-md border border-green-500 bg-green-50 p-3 text-sm text-green-800">Regulamento removido.</p>}

      <ul className="max-w-xl space-y-3">
        <Bloco titulo="Regulamento geral do evento" reg={geral} escopo="GERAL" alvoId={0} />
        {evento.modalidadesMae.map((m) => (
          <Bloco key={`mae-${m.id}`} titulo={m.nome} reg={daMae.get(m.id)} escopo="MAE" alvoId={m.id} />
        ))}
        {evento.modalidades.map((m) => (
          <Bloco key={`mod-${m.id}`} titulo={m.nome} reg={daModalidade.get(m.id)} escopo="MODALIDADE" alvoId={m.id} />
        ))}
      </ul>
    </main>
  );
}
