   import { aprovarExclusao, retirarAprovacaoExclusao } from "@/modules/eventos/exclusao";
   import { Button } from "@/components/ui/button";

   type Props = {
     eventoId: number;
     meuId: number;
     coordenadores: { id: number; nome: string }[];
     aprovaramIds: number[];
   };

   export function PainelExclusao({ eventoId, meuId, coordenadores, aprovaramIds }: Props) {
     const euAprovei = aprovaramIds.includes(meuId);

     return (
       <section className="max-w-md space-y-3 rounded-lg border border-red-300 p-4">
         <p className="font-medium text-red-700">Excluir evento</p>
         <p className="text-sm">
           Este evento tem {coordenadores.length} coordenadores. Ele só é excluído quando todos aprovarem.
           Isso apaga também as modalidades, torneios, jogos, equipes e resultados. As contas dos atletas
           não são apagadas. Se a lista de coordenadores mudar, o pedido é cancelado.
         </p>
         <ul className="text-sm">
           {coordenadores.map((c) => (
             <li key={c.id}>
               {aprovaramIds.includes(c.id) ? "✔ Aprovou" : "… Aguardando"}: {c.nome}
             </li>
           ))}
         </ul>
         {euAprovei ? (
           <form action={retirarAprovacaoExclusao.bind(null, eventoId)}>
             <Button type="submit" variant="outline">Retirar minha aprovação</Button>
           </form>
         ) : (
           <form action={aprovarExclusao.bind(null, eventoId)}>
             <Button type="submit" variant="destructive">
               {aprovaramIds.length === 0 ? "Pedir exclusão do evento" : "Aprovar exclusão"}
             </Button>
           </form>
         )}
       </section>
     );
   }