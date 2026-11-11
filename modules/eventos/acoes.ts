   "use server";

   import { revalidatePath } from "next/cache";
   import { redirect } from "next/navigation";
   import { prisma } from "@/lib/prisma";
   import { exigirPerfil } from "@/modules/usuarios/sessao";
   import { eventoSchema } from "./schemas";

   export type EstadoForm = { erro: string };

   export async function criarEvento(_anterior: EstadoForm, formData: FormData): Promise<EstadoForm> {
     await exigirPerfil("PROF");

     const resultado = eventoSchema.safeParse(Object.fromEntries(formData));
     if (!resultado.success) return { erro: resultado.error.issues[0].message };
     const d = resultado.data;

     await prisma.evento.create({
       data: {
         nome: d.nome,
         dataInicio: new Date(d.dataInicio),
         dataFim: new Date(d.dataFim),
         idadeLimite: d.idadeLimite ?? null,
         maxModTotal: d.maxModTotal ?? null,
         maxModInd: d.maxModInd ?? null,
         maxModCol: d.maxModCol ?? null,
       },
     });

     revalidatePath("/coordenador/eventos");
     redirect("/coordenador/eventos");
   }