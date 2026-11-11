   "use server";

   import { z } from "zod";
   import { revalidatePath } from "next/cache";
   import { FichaStatus } from "@prisma/client";
   import { prisma } from "@/lib/prisma";
   import { exigirPerfil } from "@/modules/usuarios/sessao";

   const idSchema = z.coerce.number().int().positive();
   const motivoSchema = z.string().trim().min(5, "Explique o motivo").max(300);

   function atualizarTelas() {
     revalidatePath("/coordenador/fichas");
     revalidatePath("/staff/fichas");
   }

   export async function aprovarFicha(formData: FormData) {
     await exigirPerfil("PROF", "STAFF");
     const atletaId = idSchema.parse(formData.get("atletaId"));

     const { count } = await prisma.usuario.updateMany({
       where: { id: atletaId, tipo: "ATLETA", fichaStatus: FichaStatus.PENDENTE },
       data: { fichaStatus: FichaStatus.APROVADA, fichaMotivoRecusa: null },
     });
     if (count > 0) {
       await prisma.notificacao.create({
         data: { usuarioId: atletaId, mensagem: "Sua ficha de autorização foi aprovada." },
       });
     }
     atualizarTelas();
   }

   export async function recusarFicha(formData: FormData) {
     await exigirPerfil("PROF", "STAFF");
     const atletaId = idSchema.parse(formData.get("atletaId"));
     const motivo = motivoSchema.parse(formData.get("motivo"));

     const { count } = await prisma.usuario.updateMany({
       where: { id: atletaId, tipo: "ATLETA", fichaStatus: FichaStatus.PENDENTE },
       data: { fichaStatus: FichaStatus.RECUSADA, fichaMotivoRecusa: motivo },
     });
     if (count > 0) {
       await prisma.notificacao.create({
         data: { usuarioId: atletaId, mensagem: `Sua ficha foi recusada. Motivo: ${motivo}` },
       });
     }
     atualizarTelas();
   }