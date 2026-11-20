import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { exigirCoordenadorDoEvento } from "@/modules/eventos/acesso";
import { criarModalidade, excluirModalidade } from "@/modules/eventos/modalidades";
import { FormModalidade } from "@/components/form-modalidade";
import { BotaoConfirmar } from "@/components/botao-confirmar";

export const instant = false;

const rotuloTipo: Record<string, string> = { INDIVIDUAL: "Individual", COLETIVA: "Em equipe" };
const rotuloPlacar: Record<string, string> = {
  CORRIDO: "Placar corrido",
  SETS: "Por sets",
  MARCA: "Por marca",
  LUTA: "Luta",
};

type Item = {
  id: number;
  nome: string;
  tipo: string;
  minAtletas: number;
  maxAtletas: number;
  formatoPlacar: string | null;
  marcaMenorMelhor: boolean | null;
  _count: { equipes: number; torneios: number };
};

function Cartao({ eventoId, m }: { eventoId: number; m: Item }) {
  return (
    <li className="space-y-2 rounded-lg border p-4">
      <p className="font-medium">{m.nome}</p>
      <p className="text-sm">
        {rotuloTipo[m.tipo]} · {m.minAtletas} a {m.maxAtletas} atletas ·{" "}
        {m.formatoPlacar ? rotuloPlacar[m.formatoPlacar] : "Sem placar"}
        {m.formatoPlacar === "MARCA" && (m.marcaMenorMelhor ? " (menor é melhor)" : " (maior é melhor)")}
      </p>
      <div className="flex flex-wrap items-center gap-4">
        <Link href={`/coordenador/eventos/${eventoId}/modalidades/${m.id}/torneios`} className="text-sm underline">
          Torneios ({m._count.torneios})
        </Link>
        <Link href={`/coordenador/eventos/${eventoId}/modalidades/${m.id}/editar`} className="text-sm underline">
          Editar
        </Link>
        <form action={excluirModalidade.bind(null, eventoId)}>
          <input type="hidden" name="modalidadeId" value={m.id} />
          <BotaoConfirmar
            mensagem={`Excluir "${m.nome}"? Isso apaga também ${m._count.torneios} torneio(s) e ${m._count.equipes} equipe(s) dela. Não dá para desfazer.`}
          >
            Excluir
          </BotaoConfirmar>
        </form>
      </div>
    </li>
  );
}

export default async function Modalidades({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const eventoId = Number(id);
  if (!Number.isInteger(eventoId)) notFound();

  const { evento } = await exigirCoordenadorDoEvento(eventoId);

  const [modalidades, maes] = await Promise.all([
    prisma.modalidade.findMany({
      where: { eventoId },
      orderBy: { nome: "asc" },
      include: { _count: { select: { equipes: true, torneios: true } } },
    }),
    prisma.modalidadeMae.findMany({ where: { eventoId }, orderBy: { nome: "asc" } }),
  ]);

  const avulsas = modalidades.filter((m) => !m.maeId);

  return (
    <main className="space-y-6 p-8">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Modalidades e provas: {evento.nome}</h1>
        <div className="flex flex-wrap gap-4">
          <Link href={`/coordenador/eventos/${eventoId}/editar`} className="text-sm underline">
            Voltar ao evento
          </Link>
          <Link href={`/coordenador/eventos/${eventoId}/modalidades-mae`} className="text-sm underline">
            Gerenciar modalidades (agrupar provas)
          </Link>
        </div>
      </div>

      {modalidades.length === 0 && <p>Nenhuma modalidade ou prova cadastrada.</p>}

      {maes.map((mae) => {
        const provas = modalidades.filter((m) => m.maeId === mae.id);
        return (
          <section key={mae.id} className="max-w-xl space-y-2">
            <h2 className="font-medium">
              {mae.nome}{" "}
              <span className="text-sm font-normal text-muted-foreground">({rotuloTipo[mae.tipo]}, nos limites)</span>
            </h2>
            {provas.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma prova ainda. Cadastre abaixo e escolha esta modalidade.</p>
            ) : (
              <ul className="space-y-3">
                {provas.map((m) => (
                  <Cartao key={m.id} eventoId={eventoId} m={m} />
                ))}
              </ul>
            )}
          </section>
        );
      })}

      {avulsas.length > 0 && (
        <section className="max-w-xl space-y-2">
          {maes.length > 0 && <h2 className="font-medium">Modalidades avulsas</h2>}
          <ul className="space-y-3">
            {avulsas.map((m) => (
              <Cartao key={m.id} eventoId={eventoId} m={m} />
            ))}
          </ul>
        </section>
      )}

      <div className="space-y-3">
        <h2 className="font-medium">Nova modalidade ou prova</h2>
        <FormModalidade
          acao={criarModalidade.bind(null, eventoId)}
          rotuloBotao="Adicionar"
          maes={maes.map((m) => ({ id: m.id, nome: m.nome }))}
        />
      </div>
    </main>
  );
}