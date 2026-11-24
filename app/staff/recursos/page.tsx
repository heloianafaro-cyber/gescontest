import Link from "next/link";
import { exigirPerfil } from "@/modules/usuarios/sessao";
import { listarRecursos } from "@/modules/recursos/lista-db";
import { RecursoDetalhe } from "@/components/recurso-detalhe";

export const instant = false;

// RN235, RN236: o Staff vê os recursos, mas só o coordenador decide.
export default async function RecursosParaStaff() {
  await exigirPerfil("STAFF");
  const recursos = await listarRecursos({});

  return (
    <main className="space-y-6 p-8">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Recursos de jogos</h1>
        <p className="text-sm text-muted-foreground">Somente leitura. A decisão é do coordenador do evento.</p>
        <Link href="/staff" className="text-sm underline">Voltar</Link>
      </div>
      {recursos.length === 0 ? (
        <p className="text-sm">Nenhum recurso aberto até agora.</p>
      ) : (
        <ul className="max-w-xl space-y-4">
          {recursos.map((r) => (
            <li key={r.id} className="rounded-md border p-4">
              <RecursoDetalhe r={r} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
