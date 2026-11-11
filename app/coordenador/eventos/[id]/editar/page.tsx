   import Link from "next/link";
   import { notFound } from "next/navigation";
   import { exigirCoordenadorDoEvento } from "@/modules/eventos/acesso";
   import { editarEvento, excluirEvento } from "@/modules/eventos/acoes";
   import { FormEvento } from "@/components/form-evento";
   import { ExcluirEvento } from "@/components/excluir-evento";

   export const instant = false;

   export default async function EditarEvento({ params }: { params: Promise<{ id: string }> }) {
     const { id } = await params;
     const eventoId = Number(id);
     if (!Number.isInteger(eventoId)) notFound();

     const { evento } = await exigirCoordenadorDoEvento(eventoId);

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
         <ExcluirEvento acao={excluirEvento.bind(null, evento.id)} nomeEvento={evento.nome} />
       </main>
     );
   }