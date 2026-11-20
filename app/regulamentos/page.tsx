import { prisma } from "@/lib/prisma";

export const instant = false;

// Página pública (sem login): regulamentos de todos os eventos.
export default async function RegulamentosPublicos() {
  const eventos = await prisma.evento.findMany({
    where: { regulamentos: { some: {} } },
    orderBy: { dataInicio: "desc" },
    select: {
      id: true,
      nome: true,
      regulamentos: {
        select: {
          id: true,
          maeId: true,
          modalidadeId: true,
          mae: { select: { nome: true } },
          modalidade: { select: { nome: true } },
        },
      },
    },
  });

  return (
    <main className="space-y-6 p-8">
      <h1 className="text-xl font-semibold">Regulamentos</h1>
      {eventos.length === 0 && <p>Nenhum regulamento publicado ainda.</p>}

      {eventos.map((e) => {
        const geral = e.regulamentos.find((r) => r.maeId === null && r.modalidadeId === null);
        const outros = e.regulamentos
          .filter((r) => r !== geral)
          .map((r) => ({ id: r.id, nome: r.mae?.nome ?? r.modalidade?.nome ?? "Modalidade" }))
          .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
        return (
          <section key={e.id} className="max-w-xl space-y-2 rounded-lg border p-4">
            <h2 className="font-medium">{e.nome}</h2>
            <ul className="space-y-1 text-sm">
              {geral && (
                <li>
                  <a href={`/regulamentos/arquivo/${geral.id}`} target="_blank" rel="noreferrer" className="underline">
                    Regulamento geral
                  </a>
                </li>
              )}
              {outros.map((r) => (
                <li key={r.id}>
                  <a href={`/regulamentos/arquivo/${r.id}`} target="_blank" rel="noreferrer" className="underline">
                    {r.nome}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </main>
  );
}
