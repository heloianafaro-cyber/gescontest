import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirCoordenadorDoEvento } from "@/modules/eventos/acesso";
import { listarTorneiosDoEvento } from "@/modules/eventos/listas";
import { IndiceListas } from "@/components/indice-listas";

export const instant = false;

export default async function ListasDoEvento({ params }: { params: Promise<{ id: string }> }) {
  const eventoId = Number((await params).id);
  if (!Number.isInteger(eventoId)) notFound();
  const { evento } = await exigirCoordenadorDoEvento(eventoId);
  const torneios = await listarTorneiosDoEvento(eventoId);

  return (
    <main className="space-y-4 p-8">
      <h1 className="text-xl font-semibold">Listas de atletas — {evento.nome}</h1>
      <p className="max-w-2xl text-sm text-muted-foreground">
        Listas por torneio para a arbitragem. Não trazem CPF, matrícula nem ficha de autorização.
      </p>
      <Link href={`/coordenador/eventos/${eventoId}/editar`} className="text-sm underline">Voltar</Link>
      <IndiceListas torneios={torneios} base={`/coordenador/eventos/${eventoId}/listas`} />
    </main>
  );
}
