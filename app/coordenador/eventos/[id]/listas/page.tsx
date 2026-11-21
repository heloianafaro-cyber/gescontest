import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirCoordenadorDoEvento } from "@/modules/eventos/acesso";
import { listarTorneiosDoEvento } from "@/modules/eventos/listas";
import { equipesAbaixoDoMinimo } from "@/modules/eventos/minimos";
import { avisarMinimos } from "@/modules/eventos/acoes-minimos";
import { IndiceListas } from "@/components/indice-listas";
import { Button } from "@/components/ui/button";

export const instant = false;

export default async function ListasDoEvento({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string }>;
}) {
  const eventoId = Number((await params).id);
  if (!Number.isInteger(eventoId)) notFound();
  const aviso = await searchParams;
  const { evento } = await exigirCoordenadorDoEvento(eventoId);
  const [torneios, abaixo] = await Promise.all([listarTorneiosDoEvento(eventoId), equipesAbaixoDoMinimo(eventoId)]);

  return (
    <main className="space-y-4 p-8">
      <h1 className="text-xl font-semibold">Listas de atletas — {evento.nome}</h1>
      <p className="max-w-2xl text-sm text-muted-foreground">
        Listas por torneio para a arbitragem. Não trazem CPF, matrícula nem ficha de autorização. Cada chefe de
        delegação tem a lista da própria delegação no menu dele.
      </p>
      <Link href={`/coordenador/eventos/${eventoId}/editar`} className="text-sm underline">Voltar</Link>

      {aviso.ok && <p className="text-sm text-green-700">{aviso.ok}</p>}

      <section className="max-w-2xl space-y-2 rounded-lg border p-4">
        <h2 className="text-sm font-medium">Equipes abaixo do mínimo de inscritos</h2>
        {abaixo.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma equipe abaixo do mínimo.</p>
        ) : (
          <>
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {abaixo.map((a) => (
                <li key={a.equipeId}>
                  {a.equipe} ({a.modalidade}): {a.inscritos} de {a.minimo}
                </li>
              ))}
            </ul>
            <form action={avisarMinimos.bind(null, eventoId)}>
              <Button type="submit" variant="outline">Avisar os chefes de delegação</Button>
            </form>
          </>
        )}
      </section>

      <IndiceListas torneios={torneios} base={`/coordenador/eventos/${eventoId}/listas`} />
    </main>
  );
}
