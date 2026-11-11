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

     await prisma.eventoCoordenador.upsert({
       where: { eventoId_usuarioId: { eventoId, usuarioId: usuario.id } },
       update: {},
       create: { eventoId, usuarioId: usuario.id },
     });

     revalidatePath(`/coordenador/eventos/${eventoId}/coordenadores`);
     return { erro: "" };
   }

   export async function removerCoordenador(eventoId: number, formData: FormData) {
     const { sessao } = await exigirCoordenadorDoEvento(eventoId);
     const usuarioId = z.coerce.number().int().positive().parse(formData.get("usuarioId"));

     // RN114: o evento nunca fica sem coordenador.
     const total = await prisma.eventoCoordenador.count({ where: { eventoId } });
     if (total <= 1) return;

     await prisma.eventoCoordenador.deleteMany({ where: { eventoId, usuarioId } });

     // Quem removeu a si mesmo perde o acesso ao evento.
     if (usuarioId === Number(sessao.user.id)) redirect("/coordenador/eventos");
     revalidatePath(`/coordenador/eventos/${eventoId}/coordenadores`);
   }