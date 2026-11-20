import { termos } from "@/modules/torneios/exibicao";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { exigirCoordenadorDoEvento } from "@/modules/eventos/acesso";
import { criarTorneio, excluirTorneio } from "@/modules/eventos/torneios";
import { sistemasDoFormato, TERCEIRO_LUGAR } from "@/modules/eventos/schemas-estrutura";
import { FormTorneio } from "@/components/form-torneio";
import { BotaoConfirmar } from "@/components/botao-confirmar";

export const instant = false;

export default async function Torneios({
  params,
}: {
  params: Promise<{ id: string; modalidadeId: string }>;
}) {
  const { id, modalidadeId } = await params;
  const eventoId = Number(id);
  const idModalidade = Number(modalidadeId);
  if (!Number.isInteger(eventoId) || !Number.isInteger(idModalidade)) notFound();

  await exigirCoordenadorDoEvento(eventoId);
  const modalidade = await prisma.modalidade.findFirst({ where: { id: idModalidade, eventoId } });
  if (!modalidade) notFound();

  const torneios = await prisma.torneio.findMany({
    where: { modalidadeId: idModalidade },
    orderBy: { nome: "asc" },
    include: { _count: { select: { participantes: true } } },
  });

  const tm = termos(modalidade.formatoPlacar);
  const rotuloSistema = Object.fromEntries(
    sistemasDoFormato(modalidade.formatoPlacar).map((s) => [s.valor, s.rotulo])
  );
  const rotuloTerceiro = Object.fromEntries(TERCEIRO_LUGAR.map((t) => [t.valor, t.rotulo]));

  return (
    <main className="space-y-6 p-8">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Torneios: {modalidade.nome}</h1>
        <Link href={`/coordenador/eventos/${eventoId}/modalidades`} className="text-sm underline">
          Voltar às modalidades
        </Link>
      </div>

      {torneios.length === 0 && <p>Nenhum torneio cadastrado.</p>}

      <ul className="max-w-xl space-y-3">
        {torneios.map((t) => (
          <li key={t.id} className="space-y-2 rounded-lg border p-4">
            <p className="font-medium">
              {t.nome}
              {t.absoluto && " (absoluto)"}
            </p>
            <p className="text-sm">{rotuloSistema[t.sistemaDisputa] ?? t.sistemaDisputa}</p>
            <p className="text-xs text-muted-foreground">
              {t.sistemaDisputa === "RODIZIO" && (t.turnos === 2 ? "Turno e returno" : "Turno simples")}
              {t.sistemaDisputa === "MISTO" && `${t.chaves} grupos, ${t.classificadosPorGrupo} classificados por grupo`}
              {t.variante === "REPESCAGEM" && "Com repescagem"}
              {t.terceiroLugar && `${t.sistemaDisputa === "MISTO" ? " · " : ""}${rotuloTerceiro[t.terceiroLugar] ?? ""}`}
              {t.jogosPorSerie ? ` · série de ${t.jogosPorSerie} ${tm.jogos}` : ""}
                            {t.naipe && ` · ${t.naipe === "MASCULINO" ? "Masculino" : t.naipe === "FEMININO" ? "Feminino" : "Misto"}`}
              {modalidade.formatoPlacar === "LUTA" && !t.absoluto && modalidade.catPeso &&
                ` · ${t.pesoMin?.toString() ?? "sem mínimo"} a ${t.pesoMax?.toString() ?? "sem máximo"} kg`}
              {modalidade.formatoPlacar === "LUTA" && !t.absoluto && modalidade.catIdade &&
                ` · ${t.idadeMin ?? "sem mínimo"} a ${t.idadeMax ?? "sem máximo"} anos`}
              {modalidade.formatoPlacar === "LUTA" && !t.absoluto && modalidade.catFaixa &&
                ` · faixas: ${t.faixas.length > 0 ? t.faixas.join(", ") : "todas"}`}
            </p>
            <div className="flex items-center gap-4">
              <Link
                href={`/coordenador/eventos/${eventoId}/modalidades/${idModalidade}/torneios/${t.id}/participantes`}
                className="text-sm underline"
              >
                Participantes ({t._count.participantes})
              </Link>
              <Link
                href={`/coordenador/eventos/${eventoId}/modalidades/${idModalidade}/torneios/${t.id}/sorteio`}
                className="text-sm underline"
              >
                Sorteio{t.sorteioEm ? " ✓" : ""}
              </Link>
              <Link
                href={`/coordenador/eventos/${eventoId}/modalidades/${idModalidade}/torneios/${t.id}/jogos`}
                className="text-sm underline"
              >
                {tm.Jogos}
              </Link>
              <Link
                href={`/coordenador/eventos/${eventoId}/modalidades/${idModalidade}/torneios/${t.id}/editar`}
                className="text-sm underline"
              >
                Editar
              </Link>
              <form action={excluirTorneio.bind(null, eventoId, idModalidade)}>
                <input type="hidden" name="torneioId" value={t.id} />
                <BotaoConfirmar
                  mensagem={`Excluir o torneio "${t.nome}"? Os ${tm.jogos} dele também serão apagados. Não dá para desfazer.`}
                >
                  Excluir
                </BotaoConfirmar>
              </form>
            </div>
          </li>
        ))}
      </ul>

      <div className="space-y-3">
        <h2 className="font-medium">Novo torneio</h2>
        <FormTorneio
          acao={criarTorneio.bind(null, eventoId, idModalidade)}
          rotuloBotao="Adicionar torneio"
          formato={modalidade.formatoPlacar}
          config={{
            catPeso: modalidade.catPeso,
            catIdade: modalidade.catIdade,
            catFaixa: modalidade.catFaixa,
            faixas: modalidade.faixas,
          }}
        />
      </div>
    </main>
  );
}
