import Link from "next/link";
import type { DadosAbertos } from "@/modules/dados-bancarios/consultas-db";

const dataHora = (d: Date) => d.toLocaleString("pt-BR", { timeZone: "America/Bahia", dateStyle: "short", timeStyle: "short" });

// Tela de um atleta, usada pelo chefe e pelo coordenador. Primeiro mostra mascarado; os dados completos
// só aparecem depois do clique em "Mostrar" (que abre ?ver=1) e esse acesso fica registrado (RN229, RN231).
export function DadosBancariosAtleta({
  dados,
  hrefMostrar,
  hrefVoltar,
}: {
  dados: DadosAbertos;
  hrefMostrar: string;
  hrefVoltar: string;
}) {
  return (
    <main className="max-w-xl space-y-6 p-8">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Dados bancários</h1>
        <p className="text-sm">
          {dados.atleta.nome}
          {dados.atleta.matricula ? ` · matrícula ${dados.atleta.matricula}` : ""}
        </p>
        <Link href={hrefVoltar} className="text-sm underline">Voltar</Link>
      </div>

      {!dados.preenchido ? (
        <p className="text-sm text-amber-700">O atleta ainda não informou os dados bancários.</p>
      ) : (
        <section className="space-y-2 rounded-md border p-4 text-sm">
          <p>
            <strong>Banco:</strong> {dados.banco} · {dados.tipoConta === "CORRENTE" ? "Conta corrente" : "Poupança"}
          </p>
          <p><strong>Agência:</strong> {dados.agencia}</p>
          <p><strong>Conta:</strong> {dados.conta}</p>
          <p><strong>Titular:</strong> {dados.titular}</p>
          {dados.completo ? (
            <p className="text-xs text-muted-foreground">
              Este acesso foi registrado. Não copie nem compartilhe estes dados fora do pagamento previsto no evento.
            </p>
          ) : (
            <div className="space-y-1 pt-2">
              <Link href={hrefMostrar} prefetch={false} className="underline">Mostrar dados completos</Link>
              <p className="text-xs text-muted-foreground">Ao mostrar, o acesso fica registrado com o seu nome e a hora.</p>
            </div>
          )}
        </section>
      )}

      <section className="space-y-1 text-sm">
        <h2 className="font-medium">Últimos acessos aos dados completos</h2>
        {dados.acessos.length === 0 ? (
          <p className="text-muted-foreground">Nenhum acesso registrado.</p>
        ) : (
          <ul className="list-disc pl-5">
            {dados.acessos.map((a, i) => (
              <li key={i}>{a.quem} · {dataHora(a.em)}</li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
