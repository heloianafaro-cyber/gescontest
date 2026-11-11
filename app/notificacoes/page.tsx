   import { prisma } from "@/lib/prisma";
   import { exigirPerfil } from "@/modules/usuarios/sessao";
   import { marcarTodasComoLidas } from "@/modules/notificacoes/acoes";
   import { Button } from "@/components/ui/button";

   export const instant = false;

   export default async function Notificacoes() {
     const sessao = await exigirPerfil();
     const lista = await prisma.notificacao.findMany({
       where: { usuarioId: Number(sessao.user.id) },
       orderBy: { dataHora: "desc" },
       take: 50,
     });
     const naoLidas = lista.filter((n) => !n.statusLida).length;

     return (
       <main className="space-y-4 p-8">
         <div className="flex items-center justify-between">
           <h1 className="text-xl font-semibold">Notificações</h1>
           {naoLidas > 0 && (
             <form action={marcarTodasComoLidas}>
               <Button type="submit" variant="outline">Marcar todas como lidas</Button>
             </form>
           )}
         </div>

         {lista.length === 0 && <p>Você não tem notificações.</p>}

         <ul className="max-w-xl space-y-2">
           {lista.map((n) => (
             <li key={n.id} className="rounded-lg border p-3">
               <p className={n.statusLida ? "" : "font-semibold"}>{n.mensagem}</p>
               <p className="text-xs text-muted-foreground">
                 {n.dataHora.toLocaleString("pt-BR", { timeZone: "America/Bahia" })}
               </p>
             </li>
           ))}
         </ul>
       </main>
     );
   }