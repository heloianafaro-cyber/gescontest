import Link from "next/link";
import { BotaoImprimir } from "@/components/botao-imprimir";
import type { ListaTorneio } from "@/modules/eventos/listas-csv";

// Lista pronta para imprimir (os botões e links somem na impressão).
export function ListaTorneioView({
  lista,
  voltarHref,
  csvHref,
}: {
  lista: ListaTorneio;
  voltarHref: string;
  csvHref: string;
}) {
  const emitida = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Bahia",
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date());

  return (
    <main className="space-y-6 p-8 print:p-0">
      <div className="flex flex-wrap items-center gap-3 print:hidden">
        <Link href={voltarHref} className="text-sm underline">Voltar</Link>
        <a href={csvHref} className="text-sm underline">Baixar CSV (Excel)</a>
        <BotaoImprimir />
      </div>

      <header className="space-y-1">
        <h1 className="text-xl font-semibold">{lista.evento}</h1>
        <p className="text-sm">
          {lista.modalidade} — {lista.torneio}
        </p>
        <p className="text-xs text-muted-foreground">Emitida em {emitida}</p>
      </header>

      {lista.equipes.length === 0 && <p>Este torneio ainda não tem equipes.</p>}

      <div className="space-y-5">
        {lista.equipes.map((e) => (
          <section key={e.id} className="break-inside-avoid space-y-1">
            <h2 className="text-sm font-medium">
              {e.cabeca && "★ "}
              {e.nome} <span className="font-normal text-muted-foreground">({e.delegacao})</span>
              {e.grupo !== null && <span className="font-normal text-muted-foreground"> · Grupo {e.grupo}</span>}
            </h2>
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
          </section>
        ))}
      </div>
    </main>
  );
}
