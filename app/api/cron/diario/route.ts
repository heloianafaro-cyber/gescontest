import { rodarRotinaDiaria } from "@/modules/eventos/rotina-diaria";

// Chamada todos os dias pelo Vercel Cron (ver vercel.json). Só roda com o segredo certo.
export async function GET(req: Request) {
  const segredo = process.env.CRON_SECRET;
  if (!segredo) return new Response("CRON_SECRET não configurado.", { status: 500 });
  if (req.headers.get("authorization") !== `Bearer ${segredo}`) {
    return new Response("Não autorizado.", { status: 401 });
  }
  const resultado = await rodarRotinaDiaria();
  return Response.json(resultado);
}
