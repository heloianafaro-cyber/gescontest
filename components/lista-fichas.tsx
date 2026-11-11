import { prisma } from "@/lib/prisma";
import { linkTemporario } from "@/lib/storage";
import { aprovarFicha, recusarFicha } from "@/modules/usuarios/acoes-ficha";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export async function ListaFichas() {
  const pendentes = await prisma.usuario.findMany({
    where: { tipo: "ATLETA", fichaStatus: "PENDENTE" },
    orderBy: { atualizadoEm: "asc" },
    select: { id: true, nome: true, matricula: true, fichaArquivo: true },
  });

  if (pendentes.length === 0) return <p>Nenhuma ficha pendente.</p>;

  const itens = await Promise.all(
    pendentes.map(async (a) => ({
      ...a,
      link: a.fichaArquivo ? await linkTemporario(a.fichaArquivo) : null,
    }))
  );

  return (
    <ul className="space-y-4">
      {itens.map((a) => (
        <li key={a.id} className="space-y-3 rounded-lg border p-4">
          <p className="font-medium">
            {a.nome} <span className="text-sm font-normal">(matrícula {a.matricula ?? "—"})</span>
          </p>
          {a.link && (
            <a href={a.link} target="_blank" rel="noreferrer" className="text-sm underline">
              Ver ficha
            </a>
          )}
          <div className="flex flex-wrap items-start gap-3">
            <form action={aprovarFicha}>
              <input type="hidden" name="atletaId" value={a.id} />
              <Button type="submit">Aprovar</Button>
            </form>
            <form action={recusarFicha} className="flex gap-2">
              <input type="hidden" name="atletaId" value={a.id} />
              <Input name="motivo" placeholder="Motivo da recusa" required minLength={5} />
              <Button type="submit" variant="outline">Recusar</Button>
            </form>
          </div>
        </li>
      ))}
    </ul>
  );
}