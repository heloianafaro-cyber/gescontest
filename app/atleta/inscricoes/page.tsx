import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { exigirPerfil } from "@/modules/usuarios/sessao";
import { situacaoInscricao } from "@/modules/eventos/inscricoes";
import { inscreverMe, cancelarMinhaInscricao } from "@/modules/equipes/acoes-inscricao-atleta";
import { FormInscrever } from "@/components/form-inscrever";
import { BotaoConfirmar } from "@/components/botao-confirmar";

export const instant = false;

export default async function MinhasInscricoes() {
  const sessao = await exigirPerfil("ATLETA");
  const atletaId = Number(sessao.user.id);

  const atleta = await prisma.usuario.findUnique({
    where: { id: atletaId },
    select: { delegacaoId: true, fichaStatus: true },
  });

  if (!atleta?.delegacaoId) {
    return (
      <main className="space-y-3 p-8">
        <h1 className="text-xl font-semibold">Minhas inscrições</h1>
        <p>Antes de se inscrever, escolha a sua delegação.</p>
        <Link href="/atleta/delegacao" className="text-sm underline">Escolher delegação</Link>
        <div><Link href="/atleta" className="text-sm underline">Voltar</Link></div>
      </main>
    );
  }

  const [eventos, vinculos] = await Promise.all([
    prisma.evento.findMany({
      orderBy: { dataInicio: "desc" },
      include: {
        modalidades: {
          orderBy: { nome: "asc" },
          include: {
            equipes: {
              where: { delegacaoId: atleta.delegacaoId },
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
        <h1 className="text-xl font-semibold">Minhas inscrições</h1>
        {atleta.fichaStatus === "RECUSADA" && (
          <p className="text-sm text-red-600">
            Sua ficha de autorização foi recusada: envie uma nova no painel para poder se inscrever.
          </p>
        )}
        <Link href="/atleta" className="text-sm underline">Voltar</Link>
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
          ev.idadeLimite != null ? `idade até ${ev.idadeLimite} anos` : null,
        ].filter(Boolean);

        return (
          <section key={ev.id} className="max-w-xl space-y-3">
            <div>
              <h2 className="font-medium">{ev.nome}</h2>
              <p className="text-sm text-muted-foreground">
                {situacao.aberta ? "Inscrições abertas" : situacao.motivo}
                {limites.length > 0 && ` · Limites: ${limites.join(", ")}`}
              </p>
            </div>

            {doEvento.length === 0 && <p className="text-sm">Você não está inscrito em nada neste evento.</p>}
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
                    <form action={cancelarMinhaInscricao}>
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
                  Nada disponível para você agora. Em modalidade coletiva, o chefe da sua delegação precisa criar a
                  equipe primeiro.
                </p>
              ) : (
                <FormInscrever acao={inscreverMe} opcoes={opcoes} />
              )
            )}
          </section>
        );
      })}
    </main>
  );
}%
