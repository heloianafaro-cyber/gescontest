import { carregarCalendario } from "@/modules/agenda/calendario-db";
import { gerarIcs, lerEscopo, lerIdDoArquivo } from "@/modules/agenda/ics";

// Endereço público do calendário, ex.: /calendario/evento/12.ics. As agendas (Google, Outlook, Apple)
// leem este endereço sozinhas e se atualizam quando os horários mudam. Só traz jogos e nomes de equipes.
export async function GET(req: Request, { params }: { params: Promise<{ escopo: string; arquivo: string }> }) {
  const p = await params;
  const escopo = lerEscopo(p.escopo);
  const id = lerIdDoArquivo(p.arquivo);
  if (!escopo || id === null) return new Response("Não encontrado.", { status: 404 });

  const cal = await carregarCalendario(escopo, id);
  if (!cal) return new Response("Não encontrado.", { status: 404 });

  const baixar = new URL(req.url).searchParams.get("baixar") === "1";
  const nomeArquivo = `gescontest-${escopo}-${id}.ics`;
  return new Response(gerarIcs({ nome: cal.nome, jogos: cal.jogos, agora: new Date() }), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `${baixar ? "attachment" : "inline"}; filename="${nomeArquivo}"`,
      "Cache-Control": "public, max-age=300",
    },
  });
}
