   "use server";

   import { revalidatePath } from "next/cache";
   import { redirect } from "next/navigation";
   import { prisma } from "@/lib/prisma";
   import { exigirCoordenadorDoEvento } from "./acesso";

   function atualizarTelas(eventoId: number) {
     revalidatePath(`/coordenador/eventos/${eventoId}/editar`);
     revalidatePath("/coordenador/eventos");
   }

   // Registra a aprovação de quem pediu. Quando todos os coordenadores aprovam, o evento é excluído.
   export async function aprovarExclusao(eventoId: number) {
     const { sessao, evento } = await exigirCoordenadorDoEvento(eventoId);
     const meuId = Number(sessao.user.id);

     const coordenadores = await prisma.eventoCoordenador.findMany({
       where: { eventoId },
       select: { usuarioId: true },
     });
     if (coordenadores.length < 2) return; // com um só coordenador, a exclusão é direta

     const haviaPedido = (await prisma.eventoExclusaoAprovacao.count({ where: { eventoId } })) > 0;

     await prisma.eventoExclusaoAprovacao.upsert({
       where: { eventoId_usuarioId: { eventoId, usuarioId: meuId } },
       update: {},
       create: { eventoId, usuarioId: meuId },
     });

     const aprovacoes = await prisma.eventoExclusaoAprovacao.findMany({
       where: { eventoId },
       select: { usuarioId: true },
     });
     const aprovaram = new Set(aprovacoes.map((a) => a.usuarioId));
     const todosAprovaram = coordenadores.every((c) => aprovaram.has(c.usuarioId));

     if (todosAprovaram) {
       await prisma.$transaction([
         prisma.notificacao.createMany({
           data: coordenadores.map((c) => ({
             usuarioId: c.usuarioId,
             mensagem: `O evento "${evento.nome}" foi excluído com a aprovação de todos os coordenadores.`,
           })),
         }),
         prisma.evento.delete({ where: { id: eventoId } }),
       ]);
       revalidatePath("/coordenador/eventos");
       redirect("/coordenador/eventos");
     }

     // Primeiro pedido: avisa os outros coordenadores.
     if (!haviaPedido) {
       await prisma.notificacao.createMany({
         data: coordenadores
           .filter((c) => c.usuarioId !== meuId)
           .map((c) => ({
             usuarioId: c.usuarioId,
             mensagem: `${sessao.user.name} pediu a exclusão do evento "${evento.nome}". Abra o evento para aprovar.`,
           })),
       });
     }
     atualizarTelas(eventoId);
   }

   export async function retirarAprovacaoExclusao(eventoId: number) {
     const { sessao } = await exigirCoordenadorDoEvento(eventoId);
     await prisma.eventoExclusaoAprovacao.deleteMany({
       where: { eventoId, usuarioId: Number(sessao.user.id) },
     });
     atualizarTelas(eventoId);
   }