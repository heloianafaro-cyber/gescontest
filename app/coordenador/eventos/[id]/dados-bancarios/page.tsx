import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirCoordenadorDoEvento } from "@/modules/eventos/acesso";
import { atletasPorEvento } from "@/modules/dados-bancarios/consultas-db";
import { ListaDadosBancarios } from "@/components/lista-dados-bancarios";

export const instant = false;

export default async function DadosBancariosDoEvento({ params }: { params: Promise<{ id: string }> }) {
  const eventoId = Number((await params).id);
  if (!Number.isInteger(eventoId)) notFound();
  const { evento } = await exigirCoordenadorDoEvento(eventoId);

  return (
    <main className="space-y-6 p-8">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Dados bancários · {evento.nome}</h1>
        <p className="text-sm text-muted-foreground">
          A lista mostra apenas se já foi preenchido; ver os dados completos fica registrado com o seu nome. Os dados são
          apagados 30 dias após o fim do evento.
        </p>
        <Link href={`/coordenador/eventos/${evento.id}/editar`} className="text-sm underline">Voltar ao evento</Link>
      </div>
      {evento.pedeDadosBancarios ? (
        <ListaDadosBancarios
          eventos={await atletasPorEvento({ eventoId: evento.id })}
          hrefAtleta={(ev, atletaId) => `/coordenador/eventos/${ev}/dados-bancarios/${atletaId}`}
          mostrarDelegacao
        />
      ) : (
        <p className="text-sm">Este evento não pede dados bancários. Para pedir, marque a opção na edição do evento.</p>
      )}
    </main>
  );
}
