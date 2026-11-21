import { notFound } from "next/navigation";
import { exigirPerfil } from "@/modules/usuarios/sessao";
import { carregarLista } from "@/modules/eventos/listas";
import { ListaTorneioView } from "@/components/lista-torneio";

export const instant = false;

export default async function ListaDoTorneioStaff({
  params,
}: {
  params: Promise<{ eventoId: string; torneioId: string }>;
}) {
  await exigirPerfil("STAFF");
  const p = await params;
  const eventoId = Number(p.eventoId);
  const torneioId = Number(p.torneioId);
  if (!Number.isInteger(eventoId) || !Number.isInteger(torneioId)) notFound();

  const lista = await carregarLista(eventoId, torneioId);
  if (!lista) notFound();

  const base = `/staff/listas/${eventoId}`;
  return <ListaTorneioView lista={lista} voltarHref={base} csvHref={`${base}/${torneioId}/csv`} />;
}
