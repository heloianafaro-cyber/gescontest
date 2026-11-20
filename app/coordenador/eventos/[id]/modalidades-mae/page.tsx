import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { exigirCoordenadorDoEvento } from "@/modules/eventos/acesso";
import { criarMae, editarMae, excluirMae } from "@/modules/eventos/modalidades-mae";
import { FormMae } from "@/components/form-mae";
import { BotaoConfirmar } from "@/components/botao-confirmar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const instant = false;

const estiloSelect =
  "h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:ring-2";

export default async function ModalidadesMae({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const eventoId = Number(id);
  if (!Number.isInteger(eventoId)) notFound();
  await exigirCoordenadorDoEvento(eventoId);

  const evento = await prisma.evento.findUnique({ where: { id: eventoId }, select: { nome: true } });
  if (!evento) notFound();

  const maes = await prisma.modalidadeMae.findMany({
    where: { eventoId },
    orderBy: { nome: "asc" },
    include: { provas: { select: { id: true, nome: true }, orderBy: { nome: "asc" } } },
  });

  const editar = editarMae.bind(null, eventoId);
  const excluir = excluirMae.bind(null, eventoId);

  return (
    <main className="space-y-6 p-8">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Modalidades e suas provas — {evento.nome}</h1>
        <p className="max-w-xl text-sm text-muted-foreground">
          Agrupe aqui as provas de um mesmo esporte (ex.: Natação com 50m, 100m e revezamento). Os limites do evento
          contam uma vez por modalidade. As provas são cadastradas em Modalidades, escolhendo a modalidade a que
          pertencem.
        </p>
        <Link href={`/coordenador/eventos/${eventoId}/modalidades`} className="text-sm underline">
          Ir para Modalidades (provas)
        </Link>
      </div>

      {maes.length === 0 && <p>Nenhuma modalidade com provas cadastrada.</p>}
      <ul className="max-w-xl space-y-3">
        {maes.map((m) => (
          <li key={m.id} className="space-y-2 rounded-lg border p-4">
            <form action={editar} className="flex flex-wrap gap-2">
              <input type="hidden" name="maeId" value={m.id} />
              <Input name="nome" defaultValue={m.nome} required className="w-48" />
              <select name="tipo" defaultValue={m.tipo} className={estiloSelect}>
                <option value="INDIVIDUAL">Individual</option>
                <option value="COLETIVA">Coletiva</option>
              </select>
              <Button type="submit" variant="outline">Salvar</Button>
            </form>
            <p className="text-sm text-muted-foreground">
              {m.provas.length === 0
                ? "Sem provas ainda."
                : `Provas: ${m.provas.map((p) => p.nome).join(", ")}`}
            </p>
            {m.provas.length === 0 ? (
              <form action={excluir}>
                <input type="hidden" name="maeId" value={m.id} />
                <BotaoConfirmar mensagem={`Excluir a modalidade "${m.nome}"?`}>Excluir</BotaoConfirmar>
              </form>
            ) : (
              <p className="text-xs text-muted-foreground">
                Com provas: para excluir, mova ou exclua antes as provas.
              </p>
            )}
          </li>
        ))}
      </ul>

      <div className="space-y-3">
        <h2 className="font-medium">Nova modalidade</h2>
        <FormMae acao={criarMae.bind(null, eventoId)} />
      </div>
    </main>
  );
}