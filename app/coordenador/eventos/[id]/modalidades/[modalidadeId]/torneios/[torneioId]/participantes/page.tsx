import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { exigirCoordenadorDoEvento } from "@/modules/eventos/acesso";
import {
  incluirCompativeis,
  incluirParticipante,
  retirarParticipante,
} from "@/modules/torneios/acoes-participantes";
import { marcarCabeca } from "@/modules/torneios/acoes-sorteio";
import { Button } from "@/components/ui/button";

export const instant = false;

export default async function Participantes({
  params,
}: {
  params: Promise<{ id: string; modalidadeId: string; torneioId: string }>;
}) {
  const p = await params;
  const eventoId = Number(p.id);
  const modalidadeId = Number(p.modalidadeId);
  const torneioId = Number(p.torneioId);
  if (![eventoId, modalidadeId, torneioId].every(Number.isInteger)) notFound();

  await exigirCoordenadorDoEvento(eventoId);

  const torneio = await prisma.torneio.findFirst({
    where: { id: torneioId, modalidadeId, modalidade: { eventoId } },
    include: {
      modalidade: true,
      participantes: {
        orderBy: { equipe: { nome: "asc" } },
        include: { equipe: { include: { delegacao: { select: { nome: true } }, _count: { select: { atletas: true } } } } },
      },
    },
  });
  if (!torneio) notFound();

  // Equipes da modalidade que ainda não estão neste torneio.
  const disponiveis = await prisma.equipe.findMany({
    where: { modalidadeId, torneios: { none: { torneioId } } },
    orderBy: { nome: "asc" },
    include: { delegacao: { select: { nome: true } } },
  });

  const coletiva = torneio.modalidade.tipo === "COLETIVA";
  const rotuloNaipe = (n: string) => (n === "MASCULINO" ? "Masculino" : n === "FEMININO" ? "Feminino" : "Misto");
  const total = torneio.participantes.length;
  const minimo = Math.max(2, torneio.modalidade.minEquipes); // RN168: configurável por modalidade (nunca menos que 2)
  const voltar = `/coordenador/eventos/${eventoId}/modalidades/${modalidadeId}/torneios`;

  return (
    <main className="space-y-6 p-8">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">
          Participantes: {torneio.nome}
          {torneio.absoluto && " (absoluto)"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {torneio.modalidade.nome} · {total} {coletiva ? "equipe(s)" : "atleta(s)"}
        </p>
        <div className="flex gap-4 text-sm">
          <Link href={`${voltar}/${torneioId}/sorteio`} className="underline">Sorteio</Link>
          <Link href={voltar} className="underline">Voltar aos torneios</Link>
        </div>
        {torneio.sorteioEm && (
          <p className="text-xs text-muted-foreground">
            Sorteio feito em {torneio.sorteioEm.toLocaleString("pt-BR")}. Se você mudar os participantes, ele perde a
            validade e precisa ser refeito.
          </p>
        )}
      </div>

      {total < minimo && (
        <p className="max-w-xl rounded-md border border-amber-400 bg-amber-50 p-3 text-sm">
          Atenção: este torneio tem {total} participante(s) e o mínimo definido para a modalidade é {minimo}. Você
          ainda pode fazer o sorteio, mas considere juntar categorias ou excluir o torneio depois das inscrições.
        </p>
      )}

      {torneio.absoluto && (
        <p className="max-w-xl text-xs text-muted-foreground">
          No absoluto, os atletas são marcados na pesagem pelo Staff. Aqui você pode ajustar à mão, se precisar.
        </p>
      )}

      <form action={incluirCompativeis.bind(null, eventoId, modalidadeId, torneioId)}>
        <Button type="submit" variant="outline">Incluir equipes compatíveis</Button>
        <p className="mt-1 text-xs text-muted-foreground">
          {coletiva
            ? "Inclui neste torneio as equipes do mesmo naipe que ainda não estão nele (equipes que você retirou voltam)."
            : "Encaixa na categoria certa os atletas que ainda estão sem categoria."}
        </p>
      </form>

      {total === 0 && <p>Nenhum participante neste torneio.</p>}
      <ul className="max-w-xl space-y-2">
        {torneio.participantes.map(({ equipe, cabecaDeChave }) => (
          <li key={equipe.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
            <div className="text-sm">
              <p className="font-medium">
                {cabecaDeChave && "★ "}
                {equipe.nome}
              </p>
              <p className="text-muted-foreground">
                {equipe.delegacao.nome} · {rotuloNaipe(equipe.naipe)}
                {coletiva ? ` · ${equipe._count.atletas} atleta(s)` : ""}
              </p>
            </div>
            <div className="flex gap-2">
              <form action={marcarCabeca.bind(null, eventoId, modalidadeId, torneioId)}>
                <input type="hidden" name="equipeId" value={equipe.id} />
                <input type="hidden" name="marcar" value={cabecaDeChave ? "0" : "1"} />
                <Button type="submit" variant="outline" size="sm">
                  {cabecaDeChave ? "Tirar cabeça de chave" : "Cabeça de chave"}
                </Button>
              </form>
              <form action={retirarParticipante.bind(null, eventoId, modalidadeId, torneioId)}>
                <input type="hidden" name="equipeId" value={equipe.id} />
                <Button type="submit" variant="outline" size="sm">Retirar</Button>
              </form>
            </div>
          </li>
        ))}
      </ul>

      {disponiveis.length > 0 && (
        <form
          action={incluirParticipante.bind(null, eventoId, modalidadeId, torneioId)}
          className="flex max-w-xl items-end gap-3"
        >
          <div className="flex-1 space-y-1">
            <label htmlFor="equipeId" className="text-sm font-medium">Incluir à mão</label>
            <select
              id="equipeId"
              name="equipeId"
              required
              defaultValue=""
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:ring-2"
            >
              <option value="" disabled>Escolha...</option>
              {disponiveis.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nome} — {e.delegacao.nome} ({rotuloNaipe(e.naipe)})
                </option>
              ))}
            </select>
          </div>
          <Button type="submit">Incluir</Button>
        </form>
      )}
    </main>
  );
}
