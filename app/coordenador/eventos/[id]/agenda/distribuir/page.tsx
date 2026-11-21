import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirCoordenadorDoEvento } from "@/modules/eventos/acesso";
import { calcularDistribuicao, lerModo } from "@/modules/agenda/distribuir-db";
import { confirmarDistribuicao } from "@/modules/agenda/acoes-distribuir";
import { Button } from "@/components/ui/button";

export const instant = false;

const hora = (d: Date) =>
  new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Bahia", hour: "2-digit", minute: "2-digit" }).format(d);
const dia = (d: Date) =>
  new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Bahia", weekday: "short", day: "2-digit", month: "2-digit" }).format(d);

export default async function DistribuirJogos({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ modo?: string }>;
}) {
  const eventoId = Number((await params).id);
  if (!Number.isInteger(eventoId)) notFound();
  const modo = lerModo((await searchParams).modo);
  const { evento } = await exigirCoordenadorDoEvento(eventoId);

  const r = await calcularDistribuicao(eventoId, modo);
  if (!r) notFound();

  const base = `/coordenador/eventos/${eventoId}/agenda`;

  // Agrupa a prévia por dia.
  const porDia = new Map<string, typeof r.alocadas>();
  for (const l of r.alocadas) {
    const k = dia(l.inicio!);
    porDia.set(k, [...(porDia.get(k) ?? []), l]);
  }

  return (
    <main className="space-y-6 p-8">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Distribuir jogos — {evento.nome}</h1>
        <Link href={base} className="text-sm underline">Voltar para a agenda</Link>
      </div>

      <section className="max-w-3xl space-y-2 text-sm">
        <p>
          Jogos sem horário: <strong>{r.semHorario}</strong> · Já com horário: <strong>{r.jaAgendados}</strong> ·
          Travados: <strong>{r.travados}</strong>
        </p>
        <div className="flex flex-wrap gap-4">
          <Link
            href={`${base}/distribuir?modo=pendentes`}
            className={modo === "pendentes" ? "font-semibold underline" : "underline"}
          >
            Só os jogos sem horário
          </Link>
          <Link
            href={`${base}/distribuir?modo=tudo`}
            className={modo === "tudo" ? "font-semibold underline" : "underline"}
          >
            Recalcular tudo que não começou e não está travado
          </Link>
        </div>
        {modo === "tudo" && (
          <p className="text-xs text-amber-700">
            Este modo refaz os horários de todos os jogos que ainda não começaram e não estão travados. Jogos
            iniciados, encerrados e travados não mudam.
          </p>
        )}
      </section>

      {r.totalAgendar === 0 ? (
        <p className="text-sm">Não há jogos para distribuir neste modo.</p>
      ) : (
        <>
          <p className="text-sm font-medium">
            Prévia: {r.alocadas.length} jogo(s) agendado(s)
            {r.pendentes.length > 0 && `, ${r.pendentes.length} que não coube(ram)`}. Nada foi gravado ainda.
          </p>

          {r.pendentes.length > 0 && (
            <section className="max-w-3xl space-y-2 rounded-lg border border-amber-500 p-4">
              <h2 className="text-sm font-medium text-amber-700">Jogos que não couberam</h2>
              <ul className="list-disc space-y-1 pl-5 text-sm">
                {r.pendentes.map((p) => (
                  <li key={p.jogoId}>
                    {p.modalidade} — {p.torneio} · {p.fase} · {p.confronto}: {p.motivo}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground">
                Para resolver: cadastre mais locais, períodos ou dias, reduza descansos ou a duração dos jogos, e gere a
                prévia de novo.
              </p>
            </section>
          )}

          <div className="max-w-4xl space-y-4">
            {[...porDia.entries()].map(([d, linhas]) => (
              <section key={d} className="space-y-1">
                <h2 className="text-sm font-semibold capitalize">{d}</h2>
                <table className="w-full border-collapse text-sm">
                  <tbody>
                    {linhas.map((l) => (
                      <tr key={l.jogoId} className="border-b">
                        <td className="w-28 py-1 pr-3">{hora(l.inicio!)}–{hora(l.fim!)}</td>
                        <td className="w-40 py-1 pr-3">{l.local}</td>
                        <td className="py-1 pr-3">
                          {l.modalidade} — {l.torneio} · {l.fase}
                        </td>
                        <td className="py-1">{l.confronto}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            ))}
          </div>

          {r.alocadas.length > 0 && (
            <form action={confirmarDistribuicao.bind(null, eventoId)} className="space-y-2">
              <input type="hidden" name="modo" value={modo} />
              <Button type="submit">Confirmar e gravar na agenda</Button>
            </form>
          )}
        </>
      )}
    </main>
  );
}
