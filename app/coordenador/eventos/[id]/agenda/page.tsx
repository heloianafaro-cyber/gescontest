import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { exigirCoordenadorDoEvento } from "@/modules/eventos/acesso";
import { salvarConfigAgenda } from "@/modules/agenda/acoes-config";
import { Button } from "@/components/ui/button";

export const instant = false;

export default async function AgendaDoEvento({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; erro?: string }>;
}) {
  const eventoId = Number((await params).id);
  if (!Number.isInteger(eventoId)) notFound();
  const aviso = await searchParams;
  const { evento } = await exigirCoordenadorDoEvento(eventoId);

  const [modalidades, locais] = await Promise.all([
    prisma.modalidade.findMany({
      where: { eventoId },
      select: {
        id: true,
        nome: true,
        descansoEquipeMin: true,
        mae: { select: { nome: true } },
        locais: { select: { localId: true } },
      },
    }),
    prisma.local.findMany({ where: { eventoId }, orderBy: { nome: "asc" }, select: { id: true, nome: true } }),
  ]);

  const rotulo = (m: (typeof modalidades)[number]) => (m.mae ? `${m.mae.nome} — ${m.nome}` : m.nome);
  const ordenadas = [...modalidades].sort((a, b) => rotulo(a).localeCompare(rotulo(b), "pt-BR"));

  return (
    <main className="space-y-6 p-8">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Agenda — {evento.nome}</h1>
        <Link href={`/coordenador/eventos/${eventoId}/editar`} className="text-sm underline">Voltar</Link>
      </div>

      {aviso.ok && <p className="text-sm text-green-700">{aviso.ok}</p>}
      {aviso.erro && <p className="text-sm text-red-600">{aviso.erro}</p>}

      {modalidades.length === 0 ? (
        <p className="text-sm">Este evento ainda não tem modalidades.</p>
      ) : (
        <form action={salvarConfigAgenda.bind(null, eventoId)} className="space-y-4">
          <p className="max-w-3xl text-xs text-muted-foreground">
            <strong>Descanso:</strong> tempo mínimo, em minutos, entre o fim de um jogo e o início do próximo da mesma
            equipe. Use 0 nas modalidades que não precisam (como natação e xadrez).{" "}
            <strong>Locais:</strong> marque onde cada modalidade pode ser disputada; sem nenhuma marca, vale qualquer
            local do evento.
          </p>

          {locais.length === 0 && (
            <p className="text-sm">
              Este evento ainda não tem locais.{" "}
              <Link href={`/coordenador/eventos/${eventoId}/locais`} className="underline">Cadastrar locais</Link>
            </p>
          )}

          <div className="overflow-x-auto">
            <table className="border-collapse text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-1 pr-4">Modalidade</th>
                  <th className="px-3 py-1">Descanso (min)</th>
                  {locais.map((l) => (
                    <th key={l.id} className="px-3 py-1 text-center font-medium">{l.nome}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ordenadas.map((m) => {
                  const marcados = new Set(m.locais.map((x) => x.localId));
                  return (
                    <tr key={m.id} className="border-b">
                      <td className="py-1 pr-4">{rotulo(m)}</td>
                      <td className="px-3 py-1">
                        <input
                          type="number"
                          name={`descanso:${m.id}`}
                          min={0}
                          max={480}
                          step={1}
                          defaultValue={m.descansoEquipeMin}
                          aria-label={`Descanso de ${rotulo(m)}, em minutos`}
                          className="w-20 rounded-md border bg-background px-2 py-1"
                        />
                      </td>
                      {locais.map((l) => (
                        <td key={l.id} className="px-3 py-1 text-center">
                          <input
                            type="checkbox"
                            name="ml"
                            value={`${m.id}:${l.id}`}
                            defaultChecked={marcados.has(l.id)}
                            aria-label={`${rotulo(m)} em ${l.nome}`}
                          />
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <Button type="submit">Salvar</Button>
        </form>
      )}

      <p className="max-w-3xl text-xs text-muted-foreground">
        A distribuição automática dos jogos nos dias e horários chega na próxima parte.
      </p>
    </main>
  );
}
