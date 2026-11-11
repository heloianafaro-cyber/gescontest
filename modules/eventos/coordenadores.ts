   "use server";

   import { z } from "zod";
   import { revalidatePath } from "next/cache";
   import { redirect } from "next/navigation";
   import { prisma } from "@/lib/prisma";
   import { exigirCoordenadorDoEvento } from "./acesso";
   import type { EstadoForm } from "./acoes";

   const emailSchema = z.email("Informe um e-mail válido");

   export async function adicionarCoordenador(
     eventoId: number,
     _anterior: EstadoForm,
     formData: FormData
   ): Promise<EstadoForm> {
     await exigirCoordenadorDoEvento(eventoId);

     const email = emailSchema.safeParse(String(formData.get("email") ?? "").trim().toLowerCase());
     if (!email.success) return { erro: email.error.issues[0].message };

     const usuario = await prisma.usuario.findUnique({ where: { email: email.data } });
     if (!usuario || usuario.tipo !== "PROF") {
       return { erro: "Não há coordenador cadastrado com esse e-mail." };
     }

     const jaCoordena = await prisma.eventoCoordenador.findFirst({
       where: { eventoId, usuarioId: usuario.id },
     });
     if (jaCoordena) return { erro: "Essa pessoa já coordena este evento." };

     // Mudou a lista de coordenadores: qualquer pedido de exclusão em andamento é cancelado (RN117).
     await prisma.$transaction([
       prisma.eventoCoordenador.create({ data: { eventoId, usuarioId: usuario.id } }),
       prisma.eventoExclusaoAprovacao.deleteMany({ where: { eventoId } }),
     ]);

     revalidatePath(`/coordenador/eventos/${eventoId}/coordenadores`);
     revalidatePath(`/coordenador/eventos/${eventoId}/editar`);
     return { erro: "" };
   }

   export async function removerCoordenador(eventoId: number, formData: FormData) {
     const { sessao, evento } = await exigirCoordenadorDoEvento(eventoId);
     const meuId = Number(sessao.user.id);
     const usuarioId = z.coerce.number().int().positive().parse(formData.get("usuarioId"));

     // RN114: o último coordenador não pode ser removido.
     const total = await prisma.eventoCoordenador.count({ where: { eventoId } });
     if (total <= 1) return;

     const alvo = await prisma.eventoCoordenador.findFirst({ where: { eventoId, usuarioId } });
     if (!alvo) return;

     await prisma.$transaction(async (tx) => {
       await tx.eventoCoordenador.deleteMany({ where: { eventoId, usuarioId } });
       await tx.eventoExclusaoAprovacao.deleteMany({ where: { eventoId } });
       // RN115: quem é removido por outro coordenador recebe um aviso.
       if (usuarioId !== meuId) {
         await tx.notificacao.create({
           data: {
             usuarioId,
             mensagem: `Você foi removido da coordenação do evento "${evento.nome}" por ${sessao.user.name}.`,
           },
         });
       }
     });

     // Quem removeu a si mesmo perde o acesso ao evento.
     if (usuarioId === meuId) redirect("/coordenador/eventos");
     revalidatePath(`/coordenador/eventos/${eventoId}/coordenadores`);
     revalidatePath(`/coordenador/eventos/${eventoId}/editar`);
   }