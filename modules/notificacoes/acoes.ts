   "use server";

   import { revalidatePath } from "next/cache";
   import { prisma } from "@/lib/prisma";
   import { exigirPerfil } from "@/modules/usuarios/sessao";

   export async function marcarTodasComoLidas() {
     const sessao = await exigirPerfil();
     await prisma.notificacao.updateMany({
       where: { usuarioId: Number(sessao.user.id), statusLida: false },
       data: { statusLida: true },
     });
     revalidatePath("/notificacoes");
   }