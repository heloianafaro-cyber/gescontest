import { rodarRotinaDiaria } from "@/modules/eventos/rotina-diaria";

// Chamada todos os dias pelo Vercel Cron (ver vercel.json). Só roda com o segredo certo.
// Só no computador de desenvolvimento: ?hoje=2027-03-01&simular=1 testa outra data sem apagar nada.
export async function GET(req: Request) {
  const segredo = process.env.CRON_SECRET;
  if (!segredo) return new Response("CRON_SECRET não configurado.", { status: 500 });
  if (req.headers.get("authorization") !== `Bearer ${segredo}`) {
    return new Response("Não autorizado.", { status: 401 });
  }
  const opcoes: { hoje?: string; simular?: boolean } = {};
  if (process.env.NODE_ENV !== "production") {
    const q = new URL(req.url).searchParams;
    const hoje = q.get("hoje");
    if (hoje && /^\d{4}-\d{2}-\d{2}$/.test(hoje)) opcoes.hoje = hoje;
    if (q.get("simular") === "1") opcoes.simular = true;
  }
  return Response.json(await rodarRotinaDiaria(opcoes));
}
