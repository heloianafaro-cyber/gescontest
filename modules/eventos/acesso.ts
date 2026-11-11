   import { notFound } from "next/navigation";
   import { prisma } from "@/lib/prisma";
   import { exigirPerfil } from "@/modules/usuarios/sessao";

   // Exige um Prof que coordene este evento; devolve a sessão e o evento.
   export async function exigirCoordenadorDoEvento(eventoId: number) {
     const sessao = await exigirPerfil("PROF");
     const evento = await prisma.evento.findFirst({
       where: { id: eventoId, coordenadores: { some: { usuarioId: Number(sessao.user.id) } } },
     });
     if (!evento) notFound();
     return { sessao, evento };
   }