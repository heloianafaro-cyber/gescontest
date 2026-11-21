import { notFound } from "next/navigation";
import { exigirCoordenadorDoEvento } from "@/modules/eventos/acesso";
import { carregarLista } from "@/modules/eventos/listas";
import { ListaTorneioView } from "@/components/lista-torneio";

export const instant = false;

export default async function ListaDoTorneio({ params }: { params: Promise<{ id: string; torneioId: string }> }) {
  const p = await params;
  const eventoId = Number(p.id);
  const torneioId = Number(p.torneioId);
  if (!Number.isInteger(eventoId) || !Number.isInteger(torneioId)) notFound();
  await exigirCoordenadorDoEvento(eventoId);

  const lista = await carregarLista(eventoId, torneioId);
  if (!lista) notFound();

  const base = `/coordenador/eventos/${eventoId}/listas`;
  return <ListaTorneioView lista={lista} voltarHref={base} csvHref={`${base}/${torneioId}/csv`} />;
}
