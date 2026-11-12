   import Link from "next/link";
   import { notFound } from "next/navigation";
   import { prisma } from "@/lib/prisma";
   import { exigirCoordenadorDoEvento } from "@/modules/eventos/acesso";
   import { criarModalidade, excluirModalidade } from "@/modules/eventos/modalidades";
   import { FormModalidade } from "@/components/form-modalidade";
   import { Button } from "@/components/ui/button";

   export const instant = false;

   const rotuloTipo: Record<string, string> = { INDIVIDUAL: "Individual", COLETIVA: "Coletiva" };
   const rotuloPlacar: Record<string, string> = { CORRIDO: "Placar corrido", SETS: "Por sets" };

   export default async function Modalidades({ params }: { params: Promise<{ id: string }> }) {
     const { id } = await params;
     const eventoId = Number(id);
     if (!Number.isInteger(eventoId)) notFound();

     const { evento } = await exigirCoordenadorDoEvento(eventoId);
     const modalidades = await prisma.modalidade.findMany({
       where: { eventoId },
       orderBy: { nome: "asc" },
       include: { _count: { select: { equipes: true, torneios: true } } },
     });

     return (
       <main className="space-y-6 p-8">
         <div className="space-y-1">
           <h1 className="text-xl font-semibold">Modalidades: {evento.nome}</h1>
           <Link href={`/coordenador/eventos/${eventoId}/editar`} className="text-sm underline">
             Voltar ao evento
           </Link>
         </div>

         {modalidades.length === 0 && <p>Nenhuma modalidade cadastrada.</p>}

         <ul className="max-w-xl space-y-3">
           {modalidades.map((m) => {
             const emUso = m._count.equipes + m._count.torneios > 0;
             return (
               <li key={m.id} className="space-y-2 rounded-lg border p-4">
                 <p className="font-medium">{m.nome}</p>
                 <p className="text-sm">
                   {rotuloTipo[m.tipo]} · {m.minAtletas} a {m.maxAtletas} atletas ·{" "}
                   {m.formatoPlacar ? rotuloPlacar[m.formatoPlacar] : "Sem placar"}
                 </p>
                 <div className="flex items-center gap-4">
                   <Link
                     href={`/coordenador/eventos/${eventoId}/modalidades/${m.id}/editar`}
                     className="text-sm underline"
                   >
                     Editar
                   </Link>
                   {emUso ? (
                     <span className="text-xs text-muted-foreground">
                       Em uso (tem torneios ou equipes): não pode ser excluída
                     </span>
                   ) : (
                     <form action={excluirModalidade.bind(null, eventoId)}>
                       <input type="hidden" name="modalidadeId" value={m.id} />
                       <Button type="submit" variant="outline">Excluir</Button>
                     </form>
                   )}
                 </div>
               </li>
             );
           })}
         </ul>

         <div className="space-y-3">
           <h2 className="font-medium">Nova modalidade</h2>
           <FormModalidade acao={criarModalidade.bind(null, eventoId)} rotuloBotao="Adicionar modalidade" />
         </div>
       </main>
     );
   }