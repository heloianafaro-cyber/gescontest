   import Link from "next/link";
   import { notFound } from "next/navigation";
   import { prisma } from "@/lib/prisma";
   import { exigirCoordenadorDoEvento } from "@/modules/eventos/acesso";
   import { editarEvento, excluirEvento } from "@/modules/eventos/acoes";
   import { FormEvento } from "@/components/form-evento";
   import { ExcluirEvento } from "@/components/excluir-evento";
   import { PainelExclusao } from "@/components/painel-exclusao";

   export const instant = false;

   export default async function EditarEvento({ params }: { params: Promise<{ id: string }> }) {
     const { id } = await params;
     const eventoId = Number(id);
     if (!Number.isInteger(eventoId)) notFound();

     const { sessao, evento } = await exigirCoordenadorDoEvento(eventoId);

     const [coordenadores, aprovacoes] = await Promise.all([
       prisma.eventoCoordenador.findMany({
         where: { eventoId },
         include: { usuario: { select: { id: true, nome: true } } },
         orderBy: { usuario: { nome: "asc" } },
       }),
       prisma.eventoExclusaoAprovacao.findMany({ where: { eventoId }, select: { usuarioId: true } }),
     ]);

     return (
       <main className="space-y-8 p-8">
         <div className="space-y-4">
           <h1 className="text-xl font-semibold">Editar evento</h1>
           <Link href={`/coordenador/eventos/${evento.id}/coordenadores`} className="text-sm underline">
             Gerenciar coordenadores
           </Link>
           <FormEvento
             acao={editarEvento.bind(null, evento.id)}
             rotuloBotao="Salvar alterações"
             evento={evento}
           />
         </div>

         {coordenadores.length > 1 ? (
           <PainelExclusao
             eventoId={evento.id}
             meuId={Number(sessao.user.id)}
             coordenadores={coordenadores.map((c) => c.usuario)}
             aprovaramIds={aprovacoes.map((a) => a.usuarioId)}
           />
         ) : (
           <ExcluirEvento acao={excluirEvento.bind(null, evento.id)} nomeEvento={evento.nome} />
         )}
       </main>
     );
   }