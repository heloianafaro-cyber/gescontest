   import { notFound } from "next/navigation";
   import { prisma } from "@/lib/prisma";
   import { exigirCoordenadorDoEvento } from "@/modules/eventos/acesso";
   import { adicionarCoordenador, removerCoordenador } from "@/modules/eventos/coordenadores";
   import { FormCoordenador } from "@/components/form-coordenador";
   import { Button } from "@/components/ui/button";

   export const instant = false;

   export default async function Coordenadores({ params }: { params: Promise<{ id: string }> }) {
     const { id } = await params;
     const eventoId = Number(id);
     if (!Number.isInteger(eventoId)) notFound();

     const { evento } = await exigirCoordenadorDoEvento(eventoId);

     const coordenadores = await prisma.eventoCoordenador.findMany({
       where: { eventoId },
       include: { usuario: { select: { id: true, nome: true, email: true } } },
       orderBy: { usuario: { nome: "asc" } },
     });

     const unico = coordenadores.length <= 1;

     return (
       <main className="space-y-6 p-8">
         <h1 className="text-xl font-semibold">Coordenadores: {evento.nome}</h1>

         <ul className="max-w-md space-y-2">
           {coordenadores.map(({ usuario }) => (
             <li key={usuario.id} className="flex items-center justify-between rounded-lg border p-3">
               <div>
                 <p className="font-medium">{usuario.nome}</p>
                 <p className="text-sm">{usuario.email}</p>
               </div>
               <form action={removerCoordenador.bind(null, eventoId)}>
                 <input type="hidden" name="usuarioId" value={usuario.id} />
                 <Button type="submit" variant="outline" disabled={unico}>
                   Remover
                 </Button>
               </form>
             </li>
           ))}
         </ul>
         {unico && <p className="text-sm">O evento precisa ter pelo menos um coordenador.</p>}

         <FormCoordenador acao={adicionarCoordenador.bind(null, eventoId)} />
       </main>
     );
   }