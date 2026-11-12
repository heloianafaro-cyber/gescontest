   "use server";

   import { z } from "zod";
   import { revalidatePath } from "next/cache";
   import { notFound, redirect } from "next/navigation";
   import { prisma } from "@/lib/prisma";
   import { exigirCoordenadorDoEvento } from "./acesso";
   import { modalidadeSchema } from "./schemas-estrutura";
   import type { EstadoForm } from "./acoes";

   type Dados = z.infer<typeof modalidadeSchema>;

   function paraBanco(d: Dados) {
     return {
       nome: d.nome,
       tipo: d.tipo,
       minAtletas: d.minAtletas,
       maxAtletas: d.maxAtletas,
       formatoPlacar: d.formatoPlacar ?? null,
     };
   }

   function textos(formData: FormData) {
     return Object.fromEntries(formData) as Record<string, string>;
   }

   function atualizarTelas(eventoId: number) {
     revalidatePath(`/coordenador/eventos/${eventoId}/modalidades`);
   }

   export async function criarModalidade(
     eventoId: number,
     _anterior: EstadoForm,
     formData: FormData
   ): Promise<EstadoForm> {
     await exigirCoordenadorDoEvento(eventoId);

     const resultado = modalidadeSchema.safeParse(Object.fromEntries(formData));
     if (!resultado.success) {
       return { erro: resultado.error.issues[0].message, valores: textos(formData) };
     }

     const repetida = await prisma.modalidade.findFirst({
       where: { eventoId, nome: { equals: resultado.data.nome, mode: "insensitive" } },
     });
     if (repetida) {
       return { erro: "Já existe uma modalidade com esse nome neste evento.", valores: textos(formData) };
     }

     await prisma.modalidade.create({ data: { eventoId, ...paraBanco(resultado.data) } });
     atualizarTelas(eventoId);
     return { erro: "" };
   }

   export async function editarModalidade(
     eventoId: number,
     modalidadeId: number,
     _anterior: EstadoForm,
     formData: FormData
   ): Promise<EstadoForm> {
     await exigirCoordenadorDoEvento(eventoId);

     const existe = await prisma.modalidade.findFirst({ where: { id: modalidadeId, eventoId } });
     if (!existe) notFound();

     const resultado = modalidadeSchema.safeParse(Object.fromEntries(formData));
     if (!resultado.success) {
       return { erro: resultado.error.issues[0].message, valores: textos(formData) };
     }

     const repetida = await prisma.modalidade.findFirst({
       where: {
         eventoId,
         nome: { equals: resultado.data.nome, mode: "insensitive" },
         NOT: { id: modalidadeId },
       },
     });
     if (repetida) {
       return { erro: "Já existe uma modalidade com esse nome neste evento.", valores: textos(formData) };
     }

     await prisma.modalidade.update({ where: { id: modalidadeId }, data: paraBanco(resultado.data) });
     atualizarTelas(eventoId);
     redirect(`/coordenador/eventos/${eventoId}/modalidades`);
   }

   export async function excluirModalidade(eventoId: number, formData: FormData) {
  await exigirCoordenadorDoEvento(eventoId);
  const modalidadeId = z.coerce.number().int().positive().parse(formData.get("modalidadeId"));

  // RN119: pode excluir mesmo com torneios ou equipes; o banco apaga tudo em cascata.
  await prisma.modalidade.deleteMany({ where: { id: modalidadeId, eventoId } });
  atualizarTelas(eventoId);
}