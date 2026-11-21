import Link from "next/link";
import { BotaoImprimir } from "@/components/botao-imprimir";
import { avisoMinimo } from "@/modules/eventos/listas-csv";
import type { ListaDelegacao } from "@/modules/eventos/lista-delegacao-csv";

export function ListaDelegacaoView({
  lista,
  voltarHref,
  csvHref,
}: {
  lista: ListaDelegacao;
  voltarHref: string;
  csvHref: string;
}) {
  const emitida = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Bahia",
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date());

  // Agrupa as provas sob a modalidade-mãe, mantendo a ordem.
  const grupos: { titulo: string; itens: ListaDelegacao["modalidades"] }[] = [];
  for (const m of lista.modalidades) {
    const titulo = m.mae ?? m.nome;
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.titulo === titulo) ultimo.itens.push(m);
    else grupos.push({ titulo, itens: [m] });
  }

  return (
    <main className="space-y-6 p-8 print:p-0">
      <div className="flex flex-wrap items-center gap-3 print:hidden">
        <Link href={voltarHref} className="text-sm underline">Voltar</Link>
        <a href={csvHref} className="text-sm underline">Baixar CSV (Excel)</a>
        <BotaoImprimir />
      </div>

      <header className="space-y-1">
        <h1 className="text-xl font-semibold">{lista.evento}</h1>
        <p className="text-sm">Delegação: {lista.delegacao}</p>
        <p className="text-xs text-muted-foreground">Emitida em {emitida}</p>
      </header>

      {grupos.map((g) => (
        <section key={g.titulo} className="space-y-3">
          <h2 className="border-b text-base font-semibold">{g.titulo}</h2>
          {g.itens.map((m) => (
            <div key={m.id} className="break-inside-avoid space-y-2">
              {m.mae && <h3 className="text-sm font-medium">{m.nome}</h3>}
              {m.equipes.length === 0 && <p className="text-sm italic text-muted-foreground">Sem inscritos.</p>}
              {m.equipes.map((e) => {
                const aviso = avisoMinimo(e.atletas.length, e.minimo);
                return (
                  <div key={e.id} className="space-y-1">
                    <p className="text-sm">
                      <span className="font-medium">{e.nome}</span>{" "}
                      <span className="text-muted-foreground">({e.naipe.toLowerCase()})</span>
                    </p>
                    {aviso && <p className="text-sm font-medium text-amber-700">⚠ {aviso}</p>}
                    {e.atletas.length === 0 ? (
                      <p className="text-sm italic text-muted-foreground">Sem atletas inscritos.</p>
                    ) : (
                      <table className="w-full max-w-3xl border-collapse text-sm">
                        <thead>
                          <tr className="border-b text-left">
                            <th className="py-1 pr-3">Atleta</th>
                            <th className="py-1 pr-3">Nascimento</th>
                            {lista.temPeso && <th className="py-1 pr-3">Peso (kg)</th>}
                            {lista.temFaixa && <th className="py-1 pr-3">Faixa</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {e.atletas.map((a, i) => (
                            <tr key={i} className="border-b">
                              <td className="py-1 pr-3">{a.nome}</td>
                              <td className="py-1 pr-3">{a.anoNascimento ?? "—"}</td>
                              {lista.temPeso && (
                                <td className="py-1 pr-3">
                                  {a.pesoKg ?? "—"}
                                  {a.pesoKg && !a.pesoConfirmado && " (não confirmado)"}
                                </td>
                              )}
                              {lista.temFaixa && <td className="py-1 pr-3">{a.faixa ?? "—"}</td>}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </section>
      ))}
      {grupos.length === 0 && <p>Este evento ainda não tem modalidades.</p>}
    </main>
  );
}
