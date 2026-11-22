import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { exigirCoordenadorDoEvento } from "@/modules/eventos/acesso";
import { jogosDoEvento } from "@/modules/publico/consultas";
import { chaveDia, rotuloDia } from "@/modules/publico/formato";
import { diaCurto, diasRecomendados, situacaoDoDia } from "@/modules/boletins/conteudo";
import { excluirBoletim, gerarBoletim, publicarBoletim, despublicarBoletim } from "@/modules/boletins/acoes";
import { Button } from "@/components/ui/button";

export const instant = false;

export default async function Boletins({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; erro?: string }>;
}) {
  const eventoId = Number((await params).id);
  if (!Number.isInteger(eventoId)) notFound();
  const aviso = await searchParams;
  const { evento } = await exigirCoordenadorDoEvento(eventoId);

  const [jogos, boletins] = await Promise.all([
    jogosDoEvento(eventoId),
    prisma.boletim.findMany({
      where: { eventoId },
      orderBy: { id: "desc" },
      select: { id: true, nome: true, dia: true, tipo: true, status: true, dataPublicacao: true },
    }),
  ]);

  const porDia = new Map<string, { status: string }[]>();
  for (const j of jogos) {
    if (!j.dataHora || j.resultado.status === "CANCELADA") continue;
    const k = chaveDia(j.dataHora);
    porDia.set(k, [...(porDia.get(k) ?? []), { status: j.resultado.status }]);
  }
  const dias = [...porDia.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([dia, js]) => {
      const s = situacaoDoDia(js);
      const b = boletins.find((x) => x.tipo === "PARCIAL" && x.dia === dia) ?? null;
      return { dia, ...s, boletim: b };
    });
  const recomendados = diasRecomendados(
    dias.map((d) => ({ dia: d.dia, completo: d.completo, boletim: d.boletim ? (d.boletim.status === "PUBLICADO" ? "PUBLICADO" : "RASCUNHO") : "NENHUM" })),
    chaveDia(new Date())
  );

  const geral = situacaoDoDia(jogos);
  const final = boletins.find((b) => b.tipo === "FINAL") ?? null;
  const base = `/coordenador/eventos/${eventoId}/boletins`;

  function Acoes({ b }: { b: NonNullable<typeof final> }) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Link href={`${base}/${b.id}`} className="text-sm underline">Ver</Link>
        {b.status === "RASCUNHO" ? (
          <>
            <form action={publicarBoletim.bind(null, eventoId, b.id)}><Button size="sm" type="submit">Publicar</Button></form>
            <form action={excluirBoletim.bind(null, eventoId, b.id)}><Button size="sm" variant="outline" type="submit">Excluir rascunho</Button></form>
          </>
        ) : (
          <form action={despublicarBoletim.bind(null, eventoId, b.id)}><Button size="sm" variant="outline" type="submit">Despublicar</Button></form>
        )}
      </div>
    );
  }

  return (
    <main className="max-w-4xl space-y-6 p-8">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Boletins — {evento.nome}</h1>
        <div className="flex gap-4 text-sm">
          <Link href={`/coordenador/eventos/${eventoId}/editar`} className="underline">Voltar</Link>
          <Link href={`/boletins/${eventoId}`} className="underline">Ver página pública</Link>
        </div>
      </div>

      {aviso.ok && <p className="text-sm text-green-700">{aviso.ok}</p>}
      {aviso.erro && <p className="text-sm text-red-600">{aviso.erro}</p>}

      {recomendados.length > 0 && (
        <div className="rounded-lg border border-amber-300 p-3 text-sm">
          <p className="font-medium">Recomendado: divulgar o boletim</p>
          <p>
            Todos os jogos terminaram em {recomendados.map(diaCurto).join(", ")}. Gere o boletim do dia, revise e publique.
          </p>
        </div>
      )}

      <section className="space-y-2">
        <h2 className="font-medium">Boletins diários</h2>
        {dias.length === 0 && <p className="text-sm">Ainda não há jogos com horário neste evento.</p>}
        <ul className="space-y-2">
          {dias.map((d) => (
            <li key={d.dia} className="space-y-1 rounded-lg border p-3 text-sm">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-medium capitalize">{rotuloDia(d.dia)}</span>
                <span className={d.completo ? "text-green-700" : "text-muted-foreground"}>
                  {d.terminados} de {d.total} jogo(s) com resultado{d.completo ? " · dia completo" : ""}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {(!d.boletim || d.boletim.status === "RASCUNHO") && d.terminados > 0 && (
                  <form action={gerarBoletim.bind(null, eventoId, d.dia)}>
                    <Button size="sm" variant={d.completo && !d.boletim ? "default" : "outline"} type="submit">
                      {d.boletim ? "Atualizar rascunho" : "Gerar boletim do dia"}
                    </Button>
                  </form>
                )}
                {d.boletim && (
                  <>
                    <span className="text-muted-foreground">{d.boletim.status === "PUBLICADO" ? "Publicado" : "Rascunho"}</span>
                    <Acoes b={d.boletim} />
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="font-medium">Boletim final</h2>
        <p className="text-sm text-muted-foreground">
          Resultados, classificações e pódios de todo o evento. {geral.terminados} de {geral.total} jogo(s) com resultado.
        </p>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          {(!final || final.status === "RASCUNHO") && geral.terminados > 0 && (
            <form action={gerarBoletim.bind(null, eventoId, "final")}>
              <Button size="sm" variant={geral.completo && !final ? "default" : "outline"} type="submit">
                {final ? "Atualizar rascunho" : "Gerar boletim final"}
              </Button>
            </form>
          )}
          {final && (
            <>
              <span className="text-muted-foreground">{final.status === "PUBLICADO" ? "Publicado" : "Rascunho"}</span>
              <Acoes b={final} />
            </>
          )}
        </div>
      </section>
    </main>
  );
}
