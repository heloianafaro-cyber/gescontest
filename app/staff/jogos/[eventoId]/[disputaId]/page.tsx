import { exigirPerfil } from "@/modules/usuarios/sessao";
import { registrarComoStaff } from "@/modules/torneios/acoes-resultados";
import { PaginaResultado } from "@/components/pagina-resultado";

export const instant = false;

export default async function ResultadoStaff({
  params,
}: {
  params: Promise<{ eventoId: string; disputaId: string }>;
}) {
  await exigirPerfil("STAFF");
  const { eventoId, disputaId } = await params;

  return (
    <PaginaResultado
      disputaId={Number(disputaId)}
      eventoId={Number(eventoId)}
      papel="STAFF"
      voltar={`/staff/jogos/${eventoId}`}
      acao={registrarComoStaff.bind(null, Number(eventoId), Number(disputaId))}
    />
  );
}
