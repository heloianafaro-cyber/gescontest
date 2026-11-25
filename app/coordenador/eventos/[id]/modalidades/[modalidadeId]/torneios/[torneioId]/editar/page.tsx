import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { exigirCoordenadorDoEvento } from "@/modules/eventos/acesso";
import { editarTorneio } from "@/modules/eventos/torneios";
import { FormTorneio } from "@/components/form-torneio";

export const instant = false;

const texto = (v: { toString(): string } | null | undefined) => (v == null ? "" : v.toString());

export default async function EditarTorneio({
  params,
}: {
  params: Promise<{ id: string; modalidadeId: string; torneioId: string }>;
}) {
  const { id, modalidadeId, torneioId } = await params;
  const eventoId = Number(id);
  const idModalidade = Number(modalidadeId);
  const idTorneio = Number(torneioId);
  if (![eventoId, idModalidade, idTorneio].every(Number.isInteger)) notFound();

  await exigirCoordenadorDoEvento(eventoId);
  const modalidade = await prisma.modalidade.findFirst({ where: { id: idModalidade, eventoId } });
  if (!modalidade) notFound();
  const t = await prisma.torneio.findFirst({ where: { id: idTorneio, modalidadeId: idModalidade } });
  if (!t) notFound();

  // O formulário recebe tudo como texto simples.
  const valores = {
    nome: t.nome,
    sistemaDisputa: t.sistemaDisputa,
    absoluto: t.absoluto ? "on" : "",
    turnos: texto(t.turnos),
    variante: texto(t.variante),
    terceiroLugar: texto(t.terceiroLugar),
    jogosPorSerie: texto(t.jogosPorSerie),
    jogosPorSerieFinal: texto(t.jogosPorSerieFinal),
    numTempos: texto(t.numTempos),
    duracaoTempoMin: texto(t.duracaoTempoMin),
    intervaloTemposMin: texto(t.intervaloTemposMin),
    duracaoJogoMin: texto(t.duracaoJogoMin),
    intervaloJogosMin: texto(t.intervaloJogosMin),
    chaves: texto(t.chaves),
    classificadosPorGrupo: texto(t.classificadosPorGrupo),
    melhoresPosicao: texto(t.melhoresPosicao),
    melhoresVagas: texto(t.melhoresVagas),
    pontosVit: texto(t.pontosVit),
    pontosEmp: texto(t.pontosEmp),
    pontosDer: texto(t.pontosDer),
    setsParaVencer: texto(t.setsParaVencer),
    pontosPorSet: texto(t.pontosPorSet),
    pontosSetDecisivo: texto(t.pontosSetDecisivo),
    diferencaMinima: texto(t.diferencaMinima),
    woPlacarVencedor: texto(t.woPlacarVencedor),
    woPlacarPerdedor: texto(t.woPlacarPerdedor),
    woPontosSetVencedor: texto(t.woPontosSetVencedor),
    pesoMin: texto(t.pesoMin),
    pesoMax: texto(t.pesoMax),
    naipe: texto(t.naipe),
    idadeMin: texto(t.idadeMin),
    idadeMax: texto(t.idadeMax),
    faixas: t.faixas.join(","),
  };

  return (
    <main className="space-y-4 p-8">
      <h1 className="text-xl font-semibold">Editar torneio</h1>
      <Link
        href={`/coordenador/eventos/${eventoId}/modalidades/${idModalidade}/torneios`}
        className="text-sm underline"
      >
        Voltar aos torneios
      </Link>
      <FormTorneio
        acao={editarTorneio.bind(null, eventoId, idModalidade, idTorneio)}
        rotuloBotao="Salvar alterações"
        formato={modalidade.formatoPlacar}
        config={{
          catPeso: modalidade.catPeso,
          catIdade: modalidade.catIdade,
          catFaixa: modalidade.catFaixa,
          faixas: modalidade.faixas,
        }}
        torneio={valores}
      />
    </main>
  );
}
