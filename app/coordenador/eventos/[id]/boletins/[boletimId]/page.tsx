import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { exigirCoordenadorDoEvento } from "@/modules/eventos/acesso";
import { lerConteudo, resumoDeJogos } from "@/modules/boletins/conteudo";
import { publicarBoletim, despublicarBoletim, gerarBoletim } from "@/modules/boletins/acoes";
import { jogosDoEvento } from "@/modules/publico/consultas";
import { chaveDia } from "@/modules/publico/formato";
import { BoletimConteudo } from "@/components/boletim-conteudo";
import { Button } from "@/components/ui/button";

export const instant = false;

// Prévia do boletim para o coordenador revisar antes de publicar (RN219).
export default async function PreviaBoletim({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; boletimId: string }>;
  searchParams: Promise<{ ok?: string }>;
}) {
  const p = await params;
  const eventoId = Number(p.id);
  const boletimId = Number(p.boletimId);
  if (!Number.isInteger(eventoId) || !Number.isInteger(boletimId)) notFound();
  const { ok } = await searchParams;
  await exigirCoordenadorDoEvento(eventoId);

  const b = await prisma.boletim.findFirst({ where: { id: boletimId, eventoId }, select: { status: true, conteudo: true, dia: true } });
  if (!b) notFound();
  const c = lerConteudo(b.conteudo);

  // O boletim é uma foto do momento em que foi gerado (RN219): compara com os resultados de agora.
  const jogos = (await jogosDoEvento(eventoId)).filter((j) => (b.dia ? j.dataHora && chaveDia(j.dataHora) === b.dia : true));
  const agora = resumoDeJogos(jogos.map((j) => ({ status: j.resultado.status })));
  const antigo = c?.resumo;
  const desatualizado =
    !!antigo &&
    (agora.realizados !== antigo.realizados || agora.wo !== antigo.wo || agora.semResultado !== antigo.semResultado || agora.anulados !== antigo.anulados);
  const atualizar = gerarBoletim.bind(null, eventoId, b.dia ?? "final");

  return (
    <main className="max-w-4xl space-y-6 p-8">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <Link href={`/coordenador/eventos/${eventoId}/boletins`} className="underline">Voltar aos boletins</Link>
        <span className="rounded border px-2 py-0.5">{b.status === "PUBLICADO" ? "Publicado" : "Rascunho (só você vê)"}</span>
        {b.status === "RASCUNHO" ? (
          <form action={publicarBoletim.bind(null, eventoId, boletimId)}><Button type="submit">Publicar</Button></form>
        ) : (
          <form action={despublicarBoletim.bind(null, eventoId, boletimId)}><Button variant="outline" type="submit">Despublicar</Button></form>
        )}
      </div>
      {ok && <p className="text-sm text-green-700">{ok}</p>}
      {desatualizado && (
        <div className="space-y-2 rounded-lg border border-amber-300 p-3 text-sm">
          <p className="font-medium">Há resultados novos desde que este boletim foi gerado.</p>
          <p>
            O boletim é uma foto do momento em que foi gerado e não muda sozinho.
            {b.status === "RASCUNHO" ? " Atualize o rascunho para incluir os resultados de agora." : " Despublique para poder atualizar."}
          </p>
          {b.status === "RASCUNHO" && (
            <form action={atualizar}><Button type="submit">Atualizar rascunho</Button></form>
          )}
        </div>
      )}
      {c ? <BoletimConteudo c={c} /> : <p className="text-sm">Conteúdo do boletim indisponível. Gere de novo.</p>}
    </main>
  );
}
