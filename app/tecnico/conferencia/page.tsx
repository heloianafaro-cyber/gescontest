import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { exigirPerfil } from "@/modules/usuarios/sessao";
import { faseDaConferencia, ROTULO_FASE } from "@/modules/eventos/conferencia";
import { listarInscritos } from "@/modules/eventos/conferencia-db";
import { ListaConferencia } from "@/components/lista-conferencia";
import { AcoesChefe } from "@/components/acoes-conferencia";

export const instant = false;

const formatar = (d: Date) => d.toLocaleDateString("pt-BR", { timeZone: "UTC" });

export default async function ConferenciaDoChefe({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; erro?: string }>;
}) {
  const aviso = await searchParams;
  const sessao = await exigirPerfil("TECNICO");

  const chefe = await prisma.usuario.findUnique({
    where: { id: Number(sessao.user.id) },
    select: { delegacaoId: true, delegacao: { select: { nome: true } } },
  });

  if (!chefe?.delegacaoId) {
    return (
      <main className="space-y-4 p-8">
        <h1 className="text-xl font-semibold">Conferência das inscrições</h1>
        <p>Sua conta ainda não está ligada a uma delegação.</p>
      </main>
    );
  }
  const delegacaoId = chefe.delegacaoId;

  // Só eventos que têm conferência configurada (RN191).
  const eventos = await prisma.evento.findMany({
    where: { conferenciaInicio: { not: null } },
    orderBy: { dataInicio: "desc" },
  });

  const blocos = await Promise.all(
    eventos.map(async (ev) => ({
      ev,
      fase: faseDaConferencia(ev),
      inscritos: await listarInscritos(ev, { delegacaoId }),
    }))
  );

  return (
    <main className="space-y-8 p-8">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Conferência das inscrições</h1>
        <p className="text-sm text-muted-foreground">Delegação: {chefe.delegacao?.nome}</p>
        <Link href="/tecnico/atletas" className="text-sm underline">
          Ir para os atletas
        </Link>
      </div>

      {aviso.ok && <p className="text-sm text-green-700">{aviso.ok}</p>}
      {aviso.erro && <p className="text-sm text-red-600">{aviso.erro}</p>}

      {blocos.length === 0 && <p>Nenhum evento com conferência configurada.</p>}

      {blocos.map(({ ev, fase, inscritos }) => (
        <section key={ev.id} className="space-y-3">
          <div>
            <h2 className="font-medium">{ev.nome}</h2>
            <p className="text-sm text-muted-foreground">
              {ROTULO_FASE[fase]}
              {ev.conferenciaInicio && ev.conferenciaFim &&
                ` · de ${formatar(ev.conferenciaInicio)} a ${formatar(ev.conferenciaFim)}`}
              {ev.recursoFim && ` · recurso até ${formatar(ev.recursoFim)}`}
            </p>
            <p className="text-xs text-muted-foreground">
              Até o fim da conferência, regularize os avisos abaixo. Atleta que continuar com pendência pode ser impugnado pelo coordenador.
            </p>
          </div>
          <ListaConferencia
            inscritos={inscritos}
            mostrarDelegacao={false}
            acoes={(i) => <AcoesChefe eventoId={ev.id} i={i} fase={fase} />}
          />
        </section>
      ))}
    </main>
  );
}
