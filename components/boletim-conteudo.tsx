import { diaCurto, type ConteudoBoletim } from "@/modules/boletins/conteudo";

const MEDALHA: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

// Corpo do boletim, igual na prévia do coordenador e na página pública (RN215: só nomes de equipes).
export function BoletimConteudo({ c }: { c: ConteudoBoletim }) {
  const r = c.resumo;
  return (
    <article className="space-y-8">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold">{c.titulo}</h1>
        <p className="text-sm text-muted-foreground">
          {c.dia ? `Resultados de ${diaCurto(c.dia)}` : "Resultados de todo o evento"}
          {c.geradoEm ? ` · gerado em ${new Date(c.geradoEm).toLocaleString("pt-BR", { timeZone: "America/Bahia" })}` : ""}
        </p>
      </header>

      <section className="space-y-1">
        <h2 className="text-lg font-semibold">Resumo</h2>
        <p className="text-sm">
          {r.realizados} jogo(s) realizado(s)
          {r.wo > 0 ? `, ${r.wo} por W.O.` : ""}
          {r.anulados > 0 ? `, ${r.anulados} anulado(s)` : ""}
          {r.semResultado > 0 ? `, ${r.semResultado} ainda sem resultado` : ""}.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Resultados</h2>
        {c.resultados.length === 0 && <p className="text-sm">Nenhum resultado registrado.</p>}
        {c.resultados.map((t) => (
          <div key={`${t.modalidade}-${t.torneio}`} className="space-y-1">
            <h3 className="border-b text-sm font-semibold">{t.modalidade} · {t.torneio}</h3>
            <ul className="text-sm">
              {t.jogos.map((j, i) => (
                <li key={i} className="grid gap-x-3 border-b py-1 sm:grid-cols-[4rem_1fr_auto]">
                  <span className="text-muted-foreground">{j.hora}</span>
                  <span>
                    {j.fase ? <span className="text-muted-foreground">{j.fase} · </span> : null}
                    {j.equipeA} × {j.equipeB}
                  </span>
                  <span className="font-medium">
                    {j.principal}
                    {j.detalhe ? <span className="font-normal text-muted-foreground"> ({j.detalhe})</span> : null}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      {c.tabelas.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Classificação</h2>
          {c.tabelas.map((t, i) => (
            <div key={i} className="space-y-1">
              <h3 className="text-sm font-semibold">
                {t.modalidade} · {t.torneio}
                {t.grupo ? ` · ${t.grupo}` : ""}
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[26rem] text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pr-2">#</th><th className="pr-2">Equipe</th><th className="pr-2">P</th><th className="pr-2">J</th>
                      <th className="pr-2">V</th><th className="pr-2">E</th><th className="pr-2">D</th><th className="pr-2">+</th>
                      <th className="pr-2">-</th><th className="pr-2">Saldo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {t.linhas.map((l) => (
                      <tr key={l.pos + l.equipe} className="border-b">
                        <td className="pr-2">{l.pos}º</td><td className="pr-2">{l.equipe}</td><td className="pr-2">{l.p}</td>
                        <td className="pr-2">{l.j}</td><td className="pr-2">{l.v}</td><td className="pr-2">{l.e}</td>
                        <td className="pr-2">{l.d}</td><td className="pr-2">{l.pro}</td><td className="pr-2">{l.contra}</td>
                        <td className="pr-2">{l.saldo}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </section>
      )}

      {c.podios.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Pódio</h2>
          {c.podios.map((p, i) => (
            <div key={i} className="space-y-1">
              <h3 className="text-sm font-semibold">{p.modalidade} · {p.torneio}</h3>
              <ol className="space-y-0.5 text-sm">
                {p.colocacoes.map((x, k) => (
                  <li key={k}>
                    <span aria-hidden>{MEDALHA[x.posicao]} </span>
                    <span className="text-muted-foreground">{x.posicao}º </span>
                    <span className="font-medium">{x.equipe}</span>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </section>
      )}
    </article>
  );
}
