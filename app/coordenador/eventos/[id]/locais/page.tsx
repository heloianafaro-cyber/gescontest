   import Link from "next/link";
   import { notFound } from "next/navigation";
   import { prisma } from "@/lib/prisma";
   import { exigirCoordenadorDoEvento } from "@/modules/eventos/acesso";
   import { adicionarLocal, removerLocal } from "@/modules/eventos/locais";
   import { FormLocal } from "@/components/form-local";
   import { Button } from "@/components/ui/button";

   export const instant = false;

   export default async function Locais({ params }: { params: Promise<{ id: string }> }) {
     const { id } = await params;
     const eventoId = Number(id);
     if (!Number.isInteger(eventoId)) notFound();

     const { evento } = await exigirCoordenadorDoEvento(eventoId);
     const locais = await prisma.local.findMany({ where: { eventoId }, orderBy: { nome: "asc" } });

     return (
       <main className="space-y-6 p-8">
         <div className="space-y-1">
           <h1 className="text-xl font-semibold">Locais: {evento.nome}</h1>
           <Link href={`/coordenador/eventos/${eventoId}/editar`} className="text-sm underline">
             Voltar ao evento
           </Link>
         </div>

         {locais.length === 0 && <p>Nenhum local cadastrado.</p>}

         <ul className="max-w-md space-y-2">
           {locais.map((l) => (
             <li key={l.id} className="flex items-center justify-between rounded-lg border p-3">
               <span>{l.nome}</span>
               <form action={removerLocal.bind(null, eventoId)}>
                 <input type="hidden" name="localId" value={l.id} />
                 <Button type="submit" variant="outline">Remover</Button>
               </form>
             </li>
           ))}
         </ul>

         <FormLocal acao={adicionarLocal.bind(null, eventoId)} />
       </main>
     );
   }