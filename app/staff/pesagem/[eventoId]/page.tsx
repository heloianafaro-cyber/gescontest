import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { exigirPerfil } from "@/modules/usuarios/sessao";
import { registrarPesagem } from "@/modules/pesagem/acoes";
import { elegivelAbsoluto, idadeNoEvento } from "@/modules/pesagem/regras";
import { FormPesagem } from "@/components/form-pesagem";

export const instant = false;

export default async function PesagemDoEvento({ params }: { params: Promise<{ eventoId: string }> }) {
  await exigirPerfil("STAFF");
  const { eventoId: texto } = await params;
  const eventoId = Number(texto);
  if (!Number.isInteger(eventoId)) notFound();

  const evento = await prisma.evento.findUnique({
    where: { id: eventoId },
    include: {
      modalidades: {
        where: { formatoPlacar: "LUTA", tipo: "INDIVIDUAL" },
        orderBy: { nome: "asc" },
        include: {
          torneios: { where: { absoluto: true }, orderBy: { nome: "asc" } },
          equipes: {
            orderBy: { nome: "asc" },
            include: {
              delegacao: { select: { nome: true } },
              atletas: { include: { atleta: { select: { nome: true, dataNascimento: true } } } },
              torneios: { include: { torneio: { select: { id: true, nome: true, absoluto: true } } } },
            },
          },
        },
      },
    },
  });
  if (!evento) notFound();

  return (
    <main className="space-y-8 p-8">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Pesagem — {evento.nome}</h1>
        <p className="text-sm text-muted-foreground">
          Peso acima do máximo da categoria:{" "}
          {evento.pesoExcedente === "ELIMINAR"
            ? "o atleta é eliminado."
            : "o atleta sobe para a categoria que comporta o peso (ou é eliminado, se não houver)."}
        </p>
        <Link href="/staff/pesagem" className="text-sm underline">Voltar</Link>
      </div>

      {evento.modalidades.length === 0 && <p>Este evento não tem lutas individuais.</p>}

      {evento.modalidades.map((m) => (
        <section key={m.id} className="max-w-2xl space-y-3">
          <h2 className="font-medium">{m.nome}</h2>
          {m.equipes.length === 0 && <p className="text-sm">Ninguém inscrito.</p>}

          <ul className="space-y-3">
            {m.equipes.map((eq) => {
              const v = eq.atletas[0];
              if (!v) return null;
              const idade = idadeNoEvento(evento.dataInicio, v.atleta.dataNascimento);
              const categoria = eq.torneios.filter((t) => !t.torneio.absoluto).map((t) => t.torneio.nome);
              const nosAbsolutos = new Set(eq.torneios.filter((t) => t.torneio.absoluto).map((t) => t.torneio.id));
              const elegiveis = m.torneios
                .filter((t) =>
                  elegivelAbsoluto(
                    t,
                    { naipe: eq.naipe, idade, faixa: v.faixa },
                    { catIdade: m.catIdade, catFaixa: m.catFaixa }
                  )
                )
                .map((t) => ({ id: t.id, nome: t.nome, marcado: nosAbsolutos.has(t.id) }));

              return (
                <li key={eq.id} className="space-y-3 rounded-lg border p-4">
                  <div className="text-sm">
                    <p className="font-medium">
                      {v.atleta.nome}
                      {v.pesoConfirmado && <span className="ml-2 text-green-700">pesagem confirmada</span>}
                    </p>
                    <p className="text-muted-foreground">
                      {eq.delegacao.nome} · {eq.naipe === "FEMININO" ? "Feminino" : "Masculino"}
                      {idade != null ? ` · ${idade} anos` : ""}
                      {v.pesoKg ? ` · informado: ${v.pesoKg.toString()} kg` : ""}
                      {v.faixa ? ` · faixa ${v.faixa}` : ""}
                    </p>
                    <p className="text-muted-foreground">
                      Categoria: {categoria.length > 0 ? categoria.join(", ") : "sem categoria"}
                    </p>
                  </div>
                  <FormPesagem
                    acao={registrarPesagem.bind(null, eq.id)}
                    pedePeso={m.catPeso}
                    peso={v.pesoKg ? v.pesoKg.toString() : ""}
                    faixas={m.catFaixa ? m.faixas : []}
                    faixa={v.faixa ?? ""}
                    absolutos={elegiveis}
                    confirmado={v.pesoConfirmado}
                  />
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </main>
  );
}
