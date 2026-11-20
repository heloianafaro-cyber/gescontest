import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { exigirPerfil } from "@/modules/usuarios/sessao";
import { situacaoInscricao } from "@/modules/eventos/inscricoes";
import { criarEquipe, excluirEquipe, definirResponsaveis } from "@/modules/equipes/acoes";
import { FormEquipe } from "@/components/form-equipe";
import { BotaoConfirmar } from "@/components/botao-confirmar";
import { Button } from "@/components/ui/button";

export const instant = false;

const rotuloNaipe = { MASCULINO: "Masculino", FEMININO: "Feminino", MISTO: "Misto" } as const;

export default async function EquipesDoEvento({ params }: { params: Promise<{ eventoId: string }> }) {
  const sessao = await exigirPerfil("TECNICO");
  const { eventoId: texto } = await params;
  const eventoId = Number(texto);
  if (!Number.isInteger(eventoId)) notFound();

  const chefe = await prisma.usuario.findUnique({
    where: { id: Number(sessao.user.id) },
    select: { delegacaoId: true, delegacao: true },
  });
  if (!chefe?.delegacaoId) {
    return (
      <main className="space-y-3 p-8">
        <h1 className="text-xl font-semibold">Equipes</h1>
        <p>Sua conta ainda não está ligada a uma delegação. Fale com o coordenador.</p>
        <Link href="/tecnico" className="text-sm underline">Voltar</Link>
      </main>
    );
  }

  const evento = await prisma.evento.findUnique({
    where: { id: eventoId },
    include: {
      modalidades: {
        orderBy: { nome: "asc" },
        include: {
          equipes: {
            where: { delegacaoId: chefe.delegacaoId },
            orderBy: { nome: "asc" },
            include: { auxiliares: { select: { auxiliarId: true } }, _count: { select: { atletas: true } } },
          },
        },
      },
    },
  });
  if (!evento) notFound();

  const auxiliares = await prisma.auxiliar.findMany({
    where: { delegacaoId: chefe.delegacaoId },
    orderBy: { nome: "asc" },
  });
  const situacao = situacaoInscricao(evento);

  const coletivas = evento.modalidades.filter((m) => m.tipo === "COLETIVA");
  const individuais = evento.modalidades.filter((m) => m.tipo === "INDIVIDUAL");

  return (
    <main className="space-y-8 p-8">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">
          {evento.nome} — equipes de {chefe.delegacao?.nome}
        </h1>
        <p className="text-sm text-muted-foreground">
          {situacao.aberta ? "Inscrições abertas." : situacao.motivo}
        </p>
        <Link href="/tecnico/equipes" className="text-sm underline">Voltar</Link>
      </div>

      {coletivas.length === 0 && <p>Este evento não tem modalidades coletivas.</p>}

      {coletivas.map((m) => (
        <section key={m.id} className="space-y-3">
          <h2 className="font-medium">
            {m.nome}{" "}
            <span className="text-sm font-normal text-muted-foreground">
              ({m.minAtletas === m.maxAtletas ? m.maxAtletas : `${m.minAtletas} a ${m.maxAtletas}`} atletas por equipe)
            </span>
          </h2>

          {m.equipes.length === 0 && <p className="text-sm">Sua delegação ainda não tem equipes nesta modalidade.</p>}
          <ul className="max-w-xl space-y-3">
            {m.equipes.map((eq) => {
              const marcados = new Set(eq.auxiliares.map((a) => a.auxiliarId));
              return (
                <li key={eq.id} className="space-y-3 rounded-lg border p-4">
                  <div>
                    <p className="font-medium">{eq.nome}</p>
                    <p className="text-sm text-muted-foreground">
                      {rotuloNaipe[eq.naipe]} · {eq._count.atletas} atletas
                    </p>
                  </div>

                  <form action={definirResponsaveis} className="space-y-2">
                    <input type="hidden" name="equipeId" value={eq.id} />
                    <p className="text-sm font-medium">Técnicos/assistentes responsáveis</p>
                    {auxiliares.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        Cadastre antes em{" "}
                        <Link href="/tecnico/auxiliares" className="underline">Técnicos e assistentes</Link>.
                      </p>
                    ) : (
                      <div className="space-y-1">
                        {auxiliares.map((a) => (
                          <label key={a.id} className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              name="auxiliarIds"
                              value={a.id}
                              defaultChecked={marcados.has(a.id)}
                            />
                            {a.nome}
                          </label>
                        ))}
                        <Button type="submit" variant="outline">Salvar responsáveis</Button>
                      </div>
                    )}
                  </form>

                  {situacao.aberta && (
                    <form action={excluirEquipe}>
                      <input type="hidden" name="equipeId" value={eq.id} />
                      <BotaoConfirmar mensagem={`Excluir a equipe "${eq.nome}"? Os atletas saem dela.`}>
                        Excluir equipe
                      </BotaoConfirmar>
                    </form>
                  )}
                </li>
              );
            })}
          </ul>

          {situacao.aberta && (
            <div className="max-w-md space-y-2">
              <h3 className="text-sm font-medium">Nova equipe em {m.nome}</h3>
              <FormEquipe acao={criarEquipe.bind(null, m.id)} />
            </div>
          )}
        </section>
      ))}

      {individuais.length > 0 && (
        <section className="space-y-1">
          <h2 className="font-medium">Modalidades individuais</h2>
          <p className="max-w-xl text-sm text-muted-foreground">
            Nestas modalidades não se cria equipe: a equipe de 1 atleta nasce sozinha quando o atleta é inscrito
            (próxima parte). Modalidades: {individuais.map((m) => m.nome).join(", ")}.
          </p>
        </section>
      )}
    </main>
  );
}