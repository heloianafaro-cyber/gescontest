import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { exigirPerfil } from "@/modules/usuarios/sessao";
import { situacaoInscricao } from "@/modules/eventos/inscricoes";
import { inscreverNaModalidade, cancelarInscricao } from "@/modules/equipes/acoes-atletas";
import { FormInscrever } from "@/components/form-inscrever";
import { BotaoConfirmar } from "@/components/botao-confirmar";

export const instant = false;

export default async function InscricoesDoAtleta({
  params,
  searchParams,
}: {
  params: Promise<{ atletaId: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  const sessao = await exigirPerfil("TECNICO");
  const { atletaId: texto } = await params;
  const { erro } = await searchParams;
  const atletaId = Number(texto);
  if (!Number.isInteger(atletaId)) notFound();

  const chefe = await prisma.usuario.findUnique({
    where: { id: Number(sessao.user.id) },
    select: { delegacaoId: true },
  });
  if (!chefe?.delegacaoId) notFound();

  // Só atletas da própria delegação (RN107).
  const atleta = await prisma.usuario.findFirst({
    where: { id: atletaId, tipo: "ATLETA", delegacaoId: chefe.delegacaoId },
    select: { id: true, nome: true, fichaStatus: true },
  });
  if (!atleta) notFound();

  const [eventos, vinculos] = await Promise.all([
    prisma.evento.findMany({
      orderBy: { dataInicio: "desc" },
      include: {
        modalidades: {
          orderBy: { nome: "asc" },
          include: {
            equipes: {
              where: { delegacaoId: chefe.delegacaoId },
              orderBy: { nome: "asc" },
              include: { _count: { select: { atletas: true } } },
            },
          },
        },
      },
    }),
    prisma.equipeAtleta.findMany({
      where: { atletaId },
      include: {
        equipe: {
          include: {
            modalidade: true,
            torneios: { include: { torneio: { select: { nome: true, absoluto: true } } } },
          },
        },
      },
    }),
  ]);

  return (
    <main className="space-y-8 p-8">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">{atleta.nome}</h1>
        {atleta.fichaStatus === "RECUSADA" && (
          <p className="text-sm text-red-600">
            Ficha de autorização recusada: o atleta não pode ser inscrito até enviar outra.
          </p>
        )}
        {erro && <p className="text-sm text-red-600">{erro}</p>}
        <Link href="/tecnico/atletas" className="text-sm underline">Voltar</Link>
      </div>

      {eventos.length === 0 && <p>Nenhum evento cadastrado.</p>}

      {eventos.map((ev) => {
        const situacao = situacaoInscricao(ev);
        const doEvento = vinculos.filter((v) => v.equipe.modalidade.eventoId === ev.id);
        const naModalidade = new Set(doEvento.map((v) => v.modalidadeId));

        const opcoes: { valor: string; rotulo: string; pedePeso: boolean; pedeNaipe: boolean; faixas: string[] }[] = [];
        for (const m of ev.modalidades) {
          if (naModalidade.has(m.id)) continue;
          const luta = m.formatoPlacar === "LUTA";
          const pedePeso = luta && m.catPeso;
          const faixas = luta && m.catFaixa ? m.faixas : [];
          if (m.tipo === "INDIVIDUAL") {
            opcoes.push({ valor: `M:${m.id}`, rotulo: `${m.nome} (individual)`, pedePeso, pedeNaipe: true, faixas });
          } else {
            for (const eq of m.equipes) {
              opcoes.push({
                valor: `E:${eq.id}`,
                rotulo: `${m.nome} — ${eq.nome} (${eq._count.atletas}/${m.maxAtletas})`,
                pedePeso,
                pedeNaipe: false,
                faixas,
              });
            }
          }
        }

        const limites = [
          ev.maxModTotal != null ? `total ${ev.maxModTotal}` : null,
          ev.maxModInd != null ? `individuais ${ev.maxModInd}` : null,
          ev.maxModCol != null ? `coletivas ${ev.maxModCol}` : null,
        ].filter(Boolean);

        return (
          <section key={ev.id} className="max-w-xl space-y-3">
            <div>
              <h2 className="font-medium">{ev.nome}</h2>
              <p className="text-sm text-muted-foreground">
                {situacao.aberta ? "Inscrições abertas" : situacao.motivo}
                {limites.length > 0 && ` · Limites por atleta: ${limites.join(", ")}`}
              </p>
            </div>

            {doEvento.length === 0 && <p className="text-sm">Sem inscrições neste evento.</p>}
            <ul className="space-y-2">
              {doEvento.map((v) => (
                <li key={v.equipeId} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                  <div className="text-sm">
                    <p className="font-medium">{v.equipe.modalidade.nome}</p>
                    <p className="text-muted-foreground">
                      {v.equipe.modalidade.tipo === "COLETIVA" ? `Equipe ${v.equipe.nome}` : "Individual"}
                      {v.equipe.modalidade.tipo === "INDIVIDUAL" ? ` · ${v.equipe.naipe === "FEMININO" ? "Feminino" : "Masculino"}` : ""}
                      {v.pesoKg ? ` · ${v.pesoKg.toString()} kg${v.pesoConfirmado ? " (confirmado)" : ""}` : ""}
                      {v.faixa ? ` · faixa ${v.faixa}` : ""}
                    </p>
                    {v.equipe.modalidade.tipo === "INDIVIDUAL" && v.equipe.modalidade.formatoPlacar === "LUTA" && (
                      <p className="text-muted-foreground">
                        Categoria:{" "}
                        {v.equipe.torneios.filter((x) => !x.torneio.absoluto).map((x) => x.torneio.nome).join(", ") ||
                          "a definir na pesagem"}
                      </p>
                    )}
                  </div>
                  {situacao.aberta && (
                    <form action={cancelarInscricao}>
                      <input type="hidden" name="atletaId" value={atleta.id} />
                      <input type="hidden" name="equipeId" value={v.equipeId} />
                      <BotaoConfirmar mensagem="Cancelar esta inscrição?">Cancelar</BotaoConfirmar>
                    </form>
                  )}
                </li>
              ))}
            </ul>

            {situacao.aberta && atleta.fichaStatus !== "RECUSADA" && (
              opcoes.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Nada disponível para inscrever. Em modalidade coletiva, crie antes a equipe em{" "}
                  <Link href={`/tecnico/equipes/${ev.id}`} className="underline">Equipes</Link>.
                </p>
              ) : (
                <FormInscrever acao={inscreverNaModalidade.bind(null, atleta.id)} opcoes={opcoes} />
              )
            )}
          </section>
        );
      })}
    </main>
  );
}
